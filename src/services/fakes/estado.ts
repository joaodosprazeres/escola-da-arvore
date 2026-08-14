/**
 * Estado compartilhado pelos três fakes in-memory (Princípio IV).
 *
 * O fake não é stub complacente: se aceitar o que o banco recusa, o teste de integração passa e a
 * produção quebra. As 10 invariantes de `contracts/ports.ts` moram aqui e nos três adaptadores
 * fake que leem este estado.
 */
import type {
  AcaoDeAuditoria,
  EstadoDaSessao,
  Perfil,
  RegistroDeAuditoria,
  SituacaoUsuario,
  Usuario,
  UsuarioSessao,
} from '../../types';
import { visaoPadrao } from '../../lib/permissoes';

export const JANELA_DE_CONTENCAO_EM_MS = 15 * 60 * 1000;
export const LIMITE_DE_TENTATIVAS = 5;

export interface ContaFake {
  id: string;
  nome: string;
  email: string;
  senha: string;
  perfis: Perfil[];
  visaoAtiva: Perfil;
  primeiroAcesso: boolean;
  situacao: SituacaoUsuario;
  professorId: string | null;
  ultimoAcessoEm: string | null;
  criadoEm: string;
}

export interface UsuarioSemente {
  readonly id?: string;
  readonly nome: string;
  readonly email: string;
  readonly senha: string;
  readonly perfis: readonly Perfil[];
  readonly visaoAtiva?: Perfil;
  readonly primeiroAcesso?: boolean;
  readonly situacao?: SituacaoUsuario;
  readonly professorId?: string | null;
}

export interface ProfessorSemente {
  readonly id: string;
  readonly nome: string;
}

export interface SementeDoFake {
  readonly usuarios?: readonly UsuarioSemente[];
  readonly professores?: readonly ProfessorSemente[];
  /** Relógio injetável: os testes de contenção por tentativas precisam avançar o tempo. */
  readonly agora?: () => number;
}

export interface TentativaFake {
  readonly email: string;
  readonly em: number;
}

export interface LinkDeRecuperacaoFake {
  readonly token: string;
  readonly contaId: string;
  readonly expiraEm: number;
  usado: boolean;
  invalidado: boolean;
}

export interface EstadoDoFake {
  contas: ContaFake[];
  professores: ProfessorSemente[];
  tentativas: TentativaFake[];
  auditoria: RegistroDeAuditoria[];
  links: LinkDeRecuperacaoFake[];
  contaDaSessao: string | null;
  instantaneo: EstadoDaSessao;
  ouvintes: Set<(estado: EstadoDaSessao) => void>;
  agora: () => number;
  sequencia: number;
}

export function normalizarEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function proximoId(estado: EstadoDoFake, prefixo: string): string {
  estado.sequencia += 1;
  return `${prefixo}-${estado.sequencia}`;
}

export function contaPorId(estado: EstadoDoFake, id: string): ContaFake | undefined {
  return estado.contas.find((conta) => conta.id === id);
}

export function contaPorEmail(estado: EstadoDoFake, email: string): ContaFake | undefined {
  const alvo = normalizarEmail(email);
  return estado.contas.find((conta) => normalizarEmail(conta.email) === alvo);
}

export function paraUsuarioSessao(conta: ContaFake): UsuarioSessao {
  return {
    id: conta.id,
    nome: conta.nome,
    email: conta.email,
    perfis: [...conta.perfis],
    visaoAtiva: conta.visaoAtiva,
    primeiroAcesso: conta.primeiroAcesso,
    situacao: conta.situacao,
  };
}

export function paraUsuario(conta: ContaFake): Usuario {
  return {
    ...paraUsuarioSessao(conta),
    professorId: conta.professorId,
    ultimoAcessoEm: conta.ultimoAcessoEm,
    criadoEm: conta.criadoEm,
  };
}

export function emitir(estado: EstadoDoFake, novo: EstadoDaSessao): void {
  estado.instantaneo = novo;
  for (const ouvinte of estado.ouvintes) ouvinte(novo);
}

/** Reemite o estado da sessão a partir da conta corrente — usado quando perfis ou situação mudam. */
export function ressincronizarSessao(estado: EstadoDoFake): void {
  if (estado.contaDaSessao === null) return;

  const conta = contaPorId(estado, estado.contaDaSessao);

  if (conta === undefined || conta.situacao !== 'ativo' || conta.perfis.length === 0) {
    estado.contaDaSessao = null;
    emitir(estado, { status: 'anonimo' });
    return;
  }

  emitir(estado, { status: 'autenticado', usuario: paraUsuarioSessao(conta) });
}

export function registrarAuditoria(
  estado: EstadoDoFake,
  registro: {
    readonly autor: ContaFake;
    readonly afetado: ContaFake;
    readonly acao: AcaoDeAuditoria;
    readonly valorAnterior?: string | null;
    readonly valorNovo?: string | null;
  },
): void {
  estado.auditoria.push({
    id: proximoId(estado, 'auditoria'),
    autor: { id: registro.autor.id, nome: registro.autor.nome },
    afetado: { id: registro.afetado.id, nome: registro.afetado.nome },
    acao: registro.acao,
    valorAnterior: registro.valorAnterior ?? null,
    valorNovo: registro.valorNovo ?? null,
    ocorridoEm: new Date(estado.agora()).toISOString(),
  });
}

export function criarEstadoDoFake(semente: SementeDoFake = {}): EstadoDoFake {
  const agora = semente.agora ?? (() => Date.now());
  let contador = 0;

  const contas: ContaFake[] = (semente.usuarios ?? []).map((usuario) => {
    contador += 1;
    const perfis = [...usuario.perfis];
    const visaoInicial = usuario.visaoAtiva ?? visaoPadrao(perfis);

    if (visaoInicial === null) {
      throw new Error(`Semente inválida: ${usuario.email} precisa de ao menos um perfil (INV-1).`);
    }

    if (perfis.includes('professor') && (usuario.professorId ?? null) === null) {
      throw new Error(
        `Semente inválida: ${usuario.email} tem perfil professor sem vínculo (INV-2).`,
      );
    }

    return {
      id: usuario.id ?? `conta-${contador}`,
      nome: usuario.nome,
      email: usuario.email,
      senha: usuario.senha,
      perfis,
      visaoAtiva: visaoInicial,
      primeiroAcesso: usuario.primeiroAcesso ?? false,
      situacao: usuario.situacao ?? 'ativo',
      professorId: usuario.professorId ?? null,
      ultimoAcessoEm: null,
      criadoEm: new Date(agora()).toISOString(),
    };
  });

  return {
    contas,
    professores: [...(semente.professores ?? [])],
    tentativas: [],
    auditoria: [],
    links: [],
    contaDaSessao: null,
    instantaneo: { status: 'anonimo' },
    ouvintes: new Set(),
    agora,
    sequencia: contador,
  };
}
