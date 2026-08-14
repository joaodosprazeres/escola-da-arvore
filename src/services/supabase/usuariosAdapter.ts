/**
 * Adaptador real da `UsuariosPort` (Princípio IV).
 *
 * Leitura (`listar`, `listarProfessoresDisponiveis`) vai direto ao PostgREST — RLS já decide o que
 * o chamador enxerga. Toda escrita passa por `admin-users`: a tabela não concede `insert`/`update`/
 * `delete` ao cliente para essas colunas, e a auditoria transacional exige a service role
 * (`contracts/edge-functions.md` §2).
 */
import type { Perfil, Usuario } from '../../types';
import type { Resultado } from '../auth/types';
import type {
  ErroDeGestao,
  FiltroDeUsuarios,
  NovoUsuario,
  ProfessorDisponivel,
  UsuariosPort,
} from '../usuarios/types';
import { chaveAnonima, obterCliente, urlDaFuncao } from './cliente';
import type { ClienteSupabase } from './cliente';

const CODIGOS_DE_GESTAO = new Set<ErroDeGestao['codigo']>([
  'email_em_uso',
  'vinculo_professor_obrigatorio',
  'perfil_obrigatorio',
  'ultimo_administrador',
  'nao_autorizado',
]);

function ehCodigoDeGestao(valor: unknown): valor is ErroDeGestao['codigo'] {
  return typeof valor === 'string' && CODIGOS_DE_GESTAO.has(valor as ErroDeGestao['codigo']);
}

interface LinhaDePerfil {
  readonly id: string;
  readonly full_name: string;
  readonly email: string;
  readonly status: Usuario['situacao'];
  readonly first_access: boolean;
  readonly active_view: Perfil | null;
  readonly teacher_id: string | null;
  readonly last_sign_in_at: string | null;
  readonly created_at: string;
  readonly user_roles: readonly { readonly role: Perfil }[] | null;
}

function paraUsuario(linha: LinhaDePerfil): Usuario {
  const perfis = (linha.user_roles ?? []).map((papel) => papel.role);

  return {
    id: linha.id,
    nome: linha.full_name,
    email: linha.email,
    perfis,
    visaoAtiva: linha.active_view ?? perfis[0] ?? 'professor',
    primeiroAcesso: linha.first_access,
    situacao: linha.status,
    professorId: linha.teacher_id,
    ultimoAcessoEm: linha.last_sign_in_at,
    criadoEm: linha.created_at,
  };
}

async function chamarAdminUsers(
  cliente: ClienteSupabase,
  corpo: Record<string, unknown>,
): Promise<Resultado<Usuario, ErroDeGestao>> {
  const { data: sessao } = await cliente.auth.getSession();
  const token = sessao.session?.access_token;

  if (token === undefined) return { ok: false, erro: { codigo: 'nao_autorizado' } };

  let resposta: Response;

  try {
    resposta = await fetch(urlDaFuncao('admin-users'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: chaveAnonima(),
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(corpo),
    });
  } catch {
    return { ok: false, erro: { codigo: 'indisponivel' } };
  }

  const json = (await resposta.json().catch(() => ({}))) as {
    readonly codigo?: string;
  } & Partial<Usuario>;

  if (!resposta.ok) {
    return {
      ok: false,
      erro: { codigo: ehCodigoDeGestao(json.codigo) ? json.codigo : 'indisponivel' },
    };
  }

  return { ok: true, valor: json as Usuario };
}

export function criarUsuariosAdapter(cliente: ClienteSupabase = obterCliente()): UsuariosPort {
  return {
    async listar(filtro: FiltroDeUsuarios): Promise<Resultado<readonly Usuario[], ErroDeGestao>> {
      let consulta = cliente
        .from('profiles')
        .select(
          'id, full_name, email, status, first_access, active_view, teacher_id, last_sign_in_at, created_at, user_roles!user_roles_user_id_fkey(role)',
        )
        .order('full_name', { ascending: true });

      const termo = filtro.termo?.trim() ?? '';
      if (termo !== '') {
        consulta = consulta.or(`full_name.ilike.%${termo}%,email.ilike.%${termo}%`);
      }
      if (filtro.situacao !== undefined) {
        consulta = consulta.eq('status', filtro.situacao);
      }

      const { data, error } = await consulta.returns<LinhaDePerfil[]>();

      if (error !== null) return { ok: false, erro: { codigo: 'indisponivel' } };

      const encontrados = data
        .map(paraUsuario)
        .filter((usuario) => filtro.perfil === undefined || usuario.perfis.includes(filtro.perfil));

      return { ok: true, valor: encontrados };
    },

    async criar(dados: NovoUsuario): Promise<Resultado<Usuario, ErroDeGestao>> {
      return chamarAdminUsers(cliente, {
        acao: 'criar',
        nome: dados.nome,
        email: dados.email,
        perfis: dados.perfis,
        professorId: dados.professorId,
      });
    },

    async definirPerfis(
      usuarioId: string,
      perfis: readonly Perfil[],
    ): Promise<Resultado<Usuario, ErroDeGestao>> {
      return chamarAdminUsers(cliente, { acao: 'definir_perfis', usuarioId, perfis });
    },

    async bloquear(usuarioId: string): Promise<Resultado<Usuario, ErroDeGestao>> {
      return chamarAdminUsers(cliente, { acao: 'bloquear', usuarioId });
    },

    async desbloquear(usuarioId: string): Promise<Resultado<Usuario, ErroDeGestao>> {
      return chamarAdminUsers(cliente, { acao: 'desbloquear', usuarioId });
    },

    async desativar(usuarioId: string): Promise<Resultado<Usuario, ErroDeGestao>> {
      return chamarAdminUsers(cliente, { acao: 'desativar', usuarioId });
    },

    async reemitirSenhaTemporaria(usuarioId: string): Promise<Resultado<void, ErroDeGestao>> {
      const resultado = await chamarAdminUsers(cliente, { acao: 'reemitir_senha', usuarioId });
      return resultado.ok ? { ok: true, valor: undefined } : resultado;
    },

    async listarProfessoresDisponiveis(): Promise<
      Resultado<readonly ProfessorDisponivel[], ErroDeGestao>
    > {
      const [professores, vinculados] = await Promise.all([
        cliente.from('teachers').select('id, full_name').eq('active', true),
        cliente.from('profiles').select('teacher_id').not('teacher_id', 'is', null),
      ]);

      if (professores.error !== null || vinculados.error !== null) {
        return { ok: false, erro: { codigo: 'indisponivel' } };
      }

      const idsVinculados = new Set(vinculados.data.map((linha) => linha.teacher_id));

      return {
        ok: true,
        valor: professores.data
          .filter((professor) => !idsVinculados.has(professor.id))
          .map((professor) => ({ id: professor.id, nome: professor.full_name })),
      };
    },
  };
}
