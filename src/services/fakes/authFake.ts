/**
 * Fake in-memory da `AuthPort` (Princípios IV e VIII).
 * Reproduz as invariantes 1, 2, 3, 8 e 10 de `contracts/ports.ts`.
 */
import type { Perfil } from '../../types';
import { avaliarSenha } from '../../lib/forcaDeSenha';
import type { AuthPort, ErroDeEntrada, ErroDeSenha, ErroDeVisao, Resultado } from '../auth/types';
import type { EstadoDaSessao, UsuarioSessao } from '../../types';
import {
  JANELA_DE_CONTENCAO_EM_MS,
  LIMITE_DE_TENTATIVAS,
  contaPorEmail,
  contaPorId,
  emitir,
  normalizarEmail,
  paraUsuarioSessao,
  proximoId,
} from './estado';
import type { EstadoDoFake } from './estado';

export function criarAuthFake(estado: EstadoDoFake): AuthPort {
  function falhasRecentes(email: string): readonly number[] {
    const alvo = normalizarEmail(email);
    const limite = estado.agora() - JANELA_DE_CONTENCAO_EM_MS;

    return estado.tentativas
      .filter((tentativa) => tentativa.email === alvo && tentativa.em > limite)
      .map((tentativa) => tentativa.em);
  }

  return {
    obterEstado(): EstadoDaSessao {
      return estado.instantaneo;
    },

    aoMudarSessao(ouvinte: (novo: EstadoDaSessao) => void): () => void {
      estado.ouvintes.add(ouvinte);
      return () => {
        estado.ouvintes.delete(ouvinte);
      };
    },

    async entrar(email: string, senha: string): Promise<Resultado<UsuarioSessao, ErroDeEntrada>> {
      // Invariante 3: a contenção decide ANTES de verificar a senha — a correta também é recusada.
      const falhas = falhasRecentes(email);
      if (falhas.length >= LIMITE_DE_TENTATIVAS) {
        const maisAntiga = Math.min(...falhas);
        const liberadoEm = maisAntiga + JANELA_DE_CONTENCAO_EM_MS;
        return {
          ok: false,
          erro: {
            codigo: 'contido_por_tentativas',
            liberadoEmSegundos: Math.max(1, Math.ceil((liberadoEm - estado.agora()) / 1000)),
          },
        };
      }

      const conta = contaPorEmail(estado, email);

      // Invariante 1: e-mail inexistente e senha errada são indistinguíveis (FR-002).
      if (conta === undefined || conta.senha !== senha) {
        estado.tentativas.push({ email: normalizarEmail(email), em: estado.agora() });
        return { ok: false, erro: { codigo: 'credenciais_invalidas' } };
      }

      // Invariante 2: senha certa em conta indisponível não entra (FR-003).
      if (conta.situacao !== 'ativo') {
        return { ok: false, erro: { codigo: 'conta_indisponivel', situacao: conta.situacao } };
      }

      estado.tentativas = estado.tentativas.filter(
        (tentativa) => tentativa.email !== normalizarEmail(email),
      );
      conta.ultimoAcessoEm = new Date(estado.agora()).toISOString();
      estado.contaDaSessao = conta.id;

      const usuario = paraUsuarioSessao(conta);
      emitir(estado, { status: 'autenticado', usuario });

      return { ok: true, valor: usuario };
    },

    async sair(): Promise<void> {
      estado.contaDaSessao = null;
      emitir(estado, { status: 'anonimo' });
    },

    async trocarSenha(novaSenha: string): Promise<Resultado<void, ErroDeSenha>> {
      const conta =
        estado.contaDaSessao === null ? undefined : contaPorId(estado, estado.contaDaSessao);

      if (conta === undefined) {
        return { ok: false, erro: { codigo: 'sessao_expirada' } };
      }

      const avaliacao = await avaliarSenha(novaSenha, { email: conta.email, nome: conta.nome });
      if (!avaliacao.aceita) {
        return {
          ok: false,
          erro: { codigo: 'senha_fraca', regrasNaoAtendidas: avaliacao.regrasNaoAtendidas },
        };
      }

      conta.senha = novaSenha;
      conta.primeiroAcesso = false;
      emitir(estado, { status: 'autenticado', usuario: paraUsuarioSessao(conta) });

      return { ok: true, valor: undefined };
    },

    async solicitarRecuperacao(email: string): Promise<void> {
      // Sempre resolve com sucesso, exista o e-mail ou não (FR-030). O efeito é silencioso.
      const conta = contaPorEmail(estado, email);
      if (conta === undefined || conta.situacao !== 'ativo') return;

      for (const link of estado.links) {
        if (link.contaId === conta.id && !link.usado) link.invalidado = true;
      }

      estado.links.push({
        token: proximoId(estado, 'link'),
        contaId: conta.id,
        expiraEm: estado.agora() + 60 * 60 * 1000,
        usado: false,
        invalidado: false,
      });
    },

    async redefinirSenhaComLink(
      token: string,
      novaSenha: string,
    ): Promise<Resultado<void, ErroDeSenha>> {
      const link = estado.links.find((candidato) => candidato.token === token);

      if (link === undefined || link.usado || link.invalidado || link.expiraEm <= estado.agora()) {
        return { ok: false, erro: { codigo: 'link_invalido' } };
      }

      const conta = contaPorId(estado, link.contaId);
      if (conta === undefined) return { ok: false, erro: { codigo: 'link_invalido' } };

      const avaliacao = await avaliarSenha(novaSenha, { email: conta.email, nome: conta.nome });
      if (!avaliacao.aceita) {
        return {
          ok: false,
          erro: { codigo: 'senha_fraca', regrasNaoAtendidas: avaliacao.regrasNaoAtendidas },
        };
      }

      link.usado = true;
      conta.senha = novaSenha;
      conta.primeiroAcesso = false;

      // Invariante 10: as demais sessões do usuário caem para `anonimo` (FR-032).
      if (estado.contaDaSessao === conta.id) estado.contaDaSessao = null;
      emitir(estado, { status: 'anonimo' });

      return { ok: true, valor: undefined };
    },

    async definirVisaoAtiva(visao: Perfil): Promise<Resultado<void, ErroDeVisao>> {
      const conta =
        estado.contaDaSessao === null ? undefined : contaPorId(estado, estado.contaDaSessao);

      if (conta === undefined) return { ok: false, erro: { codigo: 'indisponivel' } };

      if (!conta.perfis.includes(visao)) {
        return { ok: false, erro: { codigo: 'perfil_nao_atribuido' } };
      }

      // Invariante 8: muda a visão, nunca os perfis.
      conta.visaoAtiva = visao;
      emitir(estado, { status: 'autenticado', usuario: paraUsuarioSessao(conta) });

      return { ok: true, valor: undefined };
    },
  };
}
