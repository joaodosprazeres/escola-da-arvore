/**
 * Fake in-memory da `UsuariosPort` (Princípios IV e VIII).
 * Reproduz as invariantes 4, 5, 6, 7 e 9 de `contracts/ports.ts`.
 */
import type { Perfil, Usuario } from '../../types';
import { ajustarVisaoAtiva, visaoPadrao } from '../../lib/permissoes';
import type { Resultado } from '../auth/types';
import type {
  ErroDeGestao,
  FiltroDeUsuarios,
  NovoUsuario,
  ProfessorDisponivel,
  UsuariosPort,
} from '../usuarios/types';
import {
  contaPorEmail,
  contaPorId,
  normalizarEmail,
  paraUsuario,
  proximoId,
  registrarAuditoria,
  ressincronizarSessao,
} from './estado';
import type { ContaFake, EstadoDoFake } from './estado';

type FalhaDeGestao = { readonly ok: false; readonly erro: ErroDeGestao };

export function criarUsuariosFake(estado: EstadoDoFake): UsuariosPort {
  /** Invariante 7: qualquer chamada de não-administrador é recusada. */
  function autor(): ContaFake | FalhaDeGestao {
    const conta =
      estado.contaDaSessao === null ? undefined : contaPorId(estado, estado.contaDaSessao);

    if (
      conta === undefined ||
      conta.situacao !== 'ativo' ||
      !conta.perfis.includes('administrador')
    ) {
      return { ok: false, erro: { codigo: 'nao_autorizado' } };
    }

    return conta;
  }

  function ehFalha(valor: ContaFake | FalhaDeGestao): valor is FalhaDeGestao {
    return 'ok' in valor;
  }

  /** Invariante 6: o último administrador ativo não é bloqueado, desativado nem rebaixado. */
  function restaAdministrador(
    exceto: ContaFake,
    perfisFuturos: readonly Perfil[],
    situacaoFutura: string,
  ): boolean {
    return estado.contas.some((conta) => {
      const perfis = conta.id === exceto.id ? perfisFuturos : conta.perfis;
      const situacao = conta.id === exceto.id ? situacaoFutura : conta.situacao;
      return perfis.includes('administrador') && situacao === 'ativo';
    });
  }

  function mudarSituacao(
    usuarioId: string,
    situacao: 'ativo' | 'bloqueado' | 'desativado',
    acao: 'usuario_bloqueado' | 'usuario_desbloqueado' | 'usuario_desativado',
  ): Resultado<Usuario, ErroDeGestao> {
    const executor = autor();
    if (ehFalha(executor)) return executor;

    const conta = contaPorId(estado, usuarioId);
    if (conta === undefined) return { ok: false, erro: { codigo: 'indisponivel' } };

    if (situacao !== 'ativo' && !restaAdministrador(conta, conta.perfis, situacao)) {
      return { ok: false, erro: { codigo: 'ultimo_administrador' } };
    }

    const anterior = conta.situacao;
    conta.situacao = situacao;

    registrarAuditoria(estado, {
      autor: executor,
      afetado: conta,
      acao,
      valorAnterior: anterior,
      valorNovo: situacao,
    });

    ressincronizarSessao(estado);

    return { ok: true, valor: paraUsuario(conta) };
  }

  return {
    async listar(filtro: FiltroDeUsuarios): Promise<Resultado<readonly Usuario[], ErroDeGestao>> {
      const executor = autor();
      if (ehFalha(executor)) return executor;

      const termo = filtro.termo?.trim().toLowerCase() ?? '';

      const encontrados = estado.contas
        .filter((conta) => {
          const casaTermo =
            termo === '' ||
            conta.nome.toLowerCase().includes(termo) ||
            conta.email.toLowerCase().includes(termo);
          const casaPerfil = filtro.perfil === undefined || conta.perfis.includes(filtro.perfil);
          const casaSituacao = filtro.situacao === undefined || conta.situacao === filtro.situacao;
          return casaTermo && casaPerfil && casaSituacao;
        })
        .map(paraUsuario);

      return { ok: true, valor: encontrados };
    },

    async criar(dados: NovoUsuario): Promise<Resultado<Usuario, ErroDeGestao>> {
      const executor = autor();
      if (ehFalha(executor)) return executor;

      if (dados.perfis.length === 0) {
        return { ok: false, erro: { codigo: 'perfil_obrigatorio' } };
      }

      // Invariante 4: perfil professor sem vínculo é recusado.
      if (dados.perfis.includes('professor') && dados.professorId === null) {
        return { ok: false, erro: { codigo: 'vinculo_professor_obrigatorio' } };
      }

      // Invariante 5: e-mail repetido em qualquer caixa é recusado.
      if (contaPorEmail(estado, dados.email) !== undefined) {
        return { ok: false, erro: { codigo: 'email_em_uso' } };
      }

      const visao = visaoPadrao(dados.perfis);
      if (visao === null) return { ok: false, erro: { codigo: 'perfil_obrigatorio' } };

      const conta: ContaFake = {
        id: proximoId(estado, 'conta'),
        nome: dados.nome,
        email: normalizarEmail(dados.email),
        senha: proximoId(estado, 'senha-temporaria'),
        perfis: [...dados.perfis],
        visaoAtiva: visao,
        primeiroAcesso: true,
        situacao: 'ativo',
        professorId: dados.professorId,
        ultimoAcessoEm: null,
        criadoEm: new Date(estado.agora()).toISOString(),
      };

      estado.contas.push(conta);

      registrarAuditoria(estado, {
        autor: executor,
        afetado: conta,
        acao: 'usuario_criado',
        valorNovo: conta.perfis.join(', '),
      });

      return { ok: true, valor: paraUsuario(conta) };
    },

    async definirPerfis(
      usuarioId: string,
      perfis: readonly Perfil[],
    ): Promise<Resultado<Usuario, ErroDeGestao>> {
      const executor = autor();
      if (ehFalha(executor)) return executor;

      const conta = contaPorId(estado, usuarioId);
      if (conta === undefined) return { ok: false, erro: { codigo: 'indisponivel' } };

      if (perfis.length === 0) return { ok: false, erro: { codigo: 'perfil_obrigatorio' } };

      if (perfis.includes('professor') && conta.professorId === null) {
        return { ok: false, erro: { codigo: 'vinculo_professor_obrigatorio' } };
      }

      if (!restaAdministrador(conta, perfis, conta.situacao)) {
        return { ok: false, erro: { codigo: 'ultimo_administrador' } };
      }

      const anteriores = [...conta.perfis];
      conta.perfis = [...perfis];

      // Invariante 9: removida a visão ativa, ela passa ao perfil de maior alcance restante.
      const visao = ajustarVisaoAtiva(conta.visaoAtiva, conta.perfis);
      if (visao !== null) conta.visaoAtiva = visao;

      for (const atribuido of perfis.filter((perfil) => !anteriores.includes(perfil))) {
        registrarAuditoria(estado, {
          autor: executor,
          afetado: conta,
          acao: 'perfil_atribuido',
          valorNovo: atribuido,
        });
      }

      for (const removido of anteriores.filter((perfil) => !perfis.includes(perfil))) {
        registrarAuditoria(estado, {
          autor: executor,
          afetado: conta,
          acao: 'perfil_removido',
          valorAnterior: removido,
        });
      }

      // FR-016: vale na ação seguinte do usuário afetado, sem nova entrada.
      ressincronizarSessao(estado);

      return { ok: true, valor: paraUsuario(conta) };
    },

    async bloquear(usuarioId: string): Promise<Resultado<Usuario, ErroDeGestao>> {
      return mudarSituacao(usuarioId, 'bloqueado', 'usuario_bloqueado');
    },

    async desbloquear(usuarioId: string): Promise<Resultado<Usuario, ErroDeGestao>> {
      return mudarSituacao(usuarioId, 'ativo', 'usuario_desbloqueado');
    },

    async desativar(usuarioId: string): Promise<Resultado<Usuario, ErroDeGestao>> {
      return mudarSituacao(usuarioId, 'desativado', 'usuario_desativado');
    },

    async reemitirSenhaTemporaria(usuarioId: string): Promise<Resultado<void, ErroDeGestao>> {
      const executor = autor();
      if (ehFalha(executor)) return executor;

      const conta = contaPorId(estado, usuarioId);
      if (conta === undefined) return { ok: false, erro: { codigo: 'indisponivel' } };

      conta.senha = proximoId(estado, 'senha-temporaria');
      conta.primeiroAcesso = true;

      // FR-033: o registro guarda o fato, nunca a senha.
      registrarAuditoria(estado, {
        autor: executor,
        afetado: conta,
        acao: 'senha_redefinida_admin',
      });

      return { ok: true, valor: undefined };
    },

    async listarProfessoresDisponiveis(): Promise<
      Resultado<readonly ProfessorDisponivel[], ErroDeGestao>
    > {
      const executor = autor();
      if (ehFalha(executor)) return executor;

      const vinculados = new Set(
        estado.contas.map((conta) => conta.professorId).filter((id): id is string => id !== null),
      );

      return {
        ok: true,
        valor: estado.professores.filter((professor) => !vinculados.has(professor.id)),
      };
    },
  };
}
