/**
 * Adaptador real da `AuthPort` (Princípio IV).
 *
 * Traduz o Supabase para os tipos de domínio: fora desta pasta ninguém sabe que existe GoTrue,
 * PostgREST ou Edge Function. Erros viram união discriminada, nunca `throw` de string.
 */
import type { EstadoDaSessao, Perfil, UsuarioSessao } from '../../types';
import { ajustarVisaoAtiva } from '../../lib/permissoes';
import type { AuthPort, ErroDeEntrada, ErroDeSenha, ErroDeVisao, Resultado } from '../auth/types';
import { chaveAnonima, obterCliente, urlDaFuncao } from './cliente';
import type { ClienteSupabase } from './cliente';

interface RespostaDeErro {
  readonly codigo?: string;
  readonly situacao?: 'bloqueado' | 'desativado';
  readonly liberadoEmSegundos?: number;
}

interface RespostaDeEntrada {
  readonly session?: {
    readonly access_token: string;
    readonly refresh_token: string;
  };
}

function erroDeEntradaDaResposta(status: number, corpo: RespostaDeErro): ErroDeEntrada {
  switch (corpo.codigo) {
    case 'credenciais_invalidas':
      return { codigo: 'credenciais_invalidas' };
    case 'conta_indisponivel':
      return { codigo: 'conta_indisponivel', situacao: corpo.situacao ?? 'bloqueado' };
    case 'contido_por_tentativas':
      return {
        codigo: 'contido_por_tentativas',
        liberadoEmSegundos: corpo.liberadoEmSegundos ?? 900,
      };
    default:
      return status === 401 ? { codigo: 'credenciais_invalidas' } : { codigo: 'indisponivel' };
  }
}

export function criarAuthAdapter(cliente: ClienteSupabase = obterCliente()): AuthPort {
  let estado: EstadoDaSessao = { status: 'carregando' };
  const ouvintes = new Set<(novo: EstadoDaSessao) => void>();

  function emitir(novo: EstadoDaSessao): void {
    estado = novo;
    for (const ouvinte of ouvintes) ouvinte(novo);
  }

  async function montarUsuario(usuarioId: string): Promise<UsuarioSessao | null> {
    const [perfil, papeis] = await Promise.all([
      cliente
        .from('profiles')
        .select('id, full_name, email, status, first_access, active_view')
        .eq('id', usuarioId)
        .maybeSingle(),
      cliente.from('user_roles').select('role').eq('user_id', usuarioId),
    ]);

    if (perfil.error !== null || perfil.data === null || papeis.error !== null) return null;

    const perfis = (papeis.data ?? []).map((linha) => linha.role as Perfil);
    const visao = ajustarVisaoAtiva((perfil.data.active_view as Perfil | null) ?? null, perfis);

    if (visao === null) return null;

    return {
      id: perfil.data.id,
      nome: perfil.data.full_name,
      email: perfil.data.email,
      perfis,
      visaoAtiva: visao,
      primeiroAcesso: perfil.data.first_access,
      situacao: perfil.data.status,
    };
  }

  async function ressincronizar(usuarioId: string | null): Promise<void> {
    if (usuarioId === null) {
      emitir({ status: 'anonimo' });
      return;
    }

    const usuario = await montarUsuario(usuarioId);

    // Sem perfil legível a sessão não vale nada: conta bloqueada, desativada ou sem papel algum
    // (FR-016, FR-038).
    if (usuario === null || usuario.situacao !== 'ativo') {
      await cliente.auth.signOut();
      emitir({ status: 'anonimo' });
      return;
    }

    emitir({ status: 'autenticado', usuario });
  }

  // O callback do GoTrue não pode aguardar chamadas ao próprio cliente: o trabalho assíncrono sai
  // para a fila de microtarefas.
  cliente.auth.onAuthStateChange((_evento, sessao) => {
    queueMicrotask(() => {
      void ressincronizar(sessao?.user.id ?? null);
    });
  });

  void cliente.auth.getSession().then(({ data }) => {
    void ressincronizar(data.session?.user.id ?? null);
  });

  return {
    obterEstado(): EstadoDaSessao {
      return estado;
    },

    aoMudarSessao(ouvinte: (novo: EstadoDaSessao) => void): () => void {
      ouvintes.add(ouvinte);
      return () => {
        ouvintes.delete(ouvinte);
      };
    },

    async entrar(email: string, senha: string): Promise<Resultado<UsuarioSessao, ErroDeEntrada>> {
      let resposta: Response;

      try {
        resposta = await fetch(urlDaFuncao('auth-login'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: chaveAnonima(),
          },
          body: JSON.stringify({ email, senha }),
        });
      } catch {
        return { ok: false, erro: { codigo: 'indisponivel' } };
      }

      const corpo = (await resposta.json().catch(() => ({}))) as RespostaDeEntrada & RespostaDeErro;

      if (!resposta.ok || corpo.session === undefined) {
        return { ok: false, erro: erroDeEntradaDaResposta(resposta.status, corpo) };
      }

      const { error } = await cliente.auth.setSession({
        access_token: corpo.session.access_token,
        refresh_token: corpo.session.refresh_token,
      });

      if (error !== null) return { ok: false, erro: { codigo: 'indisponivel' } };

      const { data } = await cliente.auth.getUser();
      const usuario = data.user === null ? null : await montarUsuario(data.user.id);

      if (usuario === null) return { ok: false, erro: { codigo: 'indisponivel' } };

      emitir({ status: 'autenticado', usuario });

      return { ok: true, valor: usuario };
    },

    async sair(): Promise<void> {
      await cliente.auth.signOut();
      emitir({ status: 'anonimo' });
    },

    async trocarSenha(novaSenha: string): Promise<Resultado<void, ErroDeSenha>> {
      const { data } = await cliente.auth.getUser();

      if (data.user === null) return { ok: false, erro: { codigo: 'sessao_expirada' } };

      const { error } = await cliente.auth.updateUser({ password: novaSenha });

      if (error !== null) {
        return { ok: false, erro: { codigo: 'senha_fraca', regrasNaoAtendidas: [] } };
      }

      // FR-027: concluída a troca, o primeiro acesso deixa de existir.
      const { error: erroDoPerfil } = await cliente
        .from('profiles')
        .update({ first_access: false })
        .eq('id', data.user.id);

      if (erroDoPerfil !== null) return { ok: false, erro: { codigo: 'indisponivel' } };

      await ressincronizar(data.user.id);

      return { ok: true, valor: undefined };
    },

    async solicitarRecuperacao(email: string): Promise<void> {
      // Sempre resolve com sucesso: quem decide enviar é a Edge Function, em silêncio (FR-030).
      try {
        await fetch(urlDaFuncao('password-recovery'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', apikey: chaveAnonima() },
          body: JSON.stringify({ email }),
        });
      } catch {
        // Falha de rede também não revela nada ao usuário.
      }
    },

    async redefinirSenhaComLink(
      token: string,
      novaSenha: string,
    ): Promise<Resultado<void, ErroDeSenha>> {
      const { data, error } = await cliente.auth.verifyOtp({ token_hash: token, type: 'recovery' });

      if (error !== null || data.user === null) {
        return { ok: false, erro: { codigo: 'link_invalido' } };
      }

      const { error: erroDaSenha } = await cliente.auth.updateUser({ password: novaSenha });

      if (erroDaSenha !== null) {
        return { ok: false, erro: { codigo: 'senha_fraca', regrasNaoAtendidas: [] } };
      }

      await cliente.from('profiles').update({ first_access: false }).eq('id', data.user.id);

      // FR-032: as demais sessões caem; esta também, para que a entrada seja com a senha nova.
      await cliente.auth.signOut({ scope: 'global' });
      emitir({ status: 'anonimo' });

      return { ok: true, valor: undefined };
    },

    async definirVisaoAtiva(visao: Perfil): Promise<Resultado<void, ErroDeVisao>> {
      const { data } = await cliente.auth.getUser();

      if (data.user === null) return { ok: false, erro: { codigo: 'indisponivel' } };

      // A coluna é a única que o próprio usuário altera; o `with check` da política recusa um
      // perfil que ele não possui (FR-012).
      const { error } = await cliente
        .from('profiles')
        .update({ active_view: visao })
        .eq('id', data.user.id);

      if (error !== null) return { ok: false, erro: { codigo: 'perfil_nao_atribuido' } };

      await ressincronizar(data.user.id);

      return { ok: true, valor: undefined };
    },
  };
}
