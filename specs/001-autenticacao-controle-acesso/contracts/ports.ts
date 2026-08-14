/**
 * Contrato das portas de dados — feature 001-autenticacao-controle-acesso.
 *
 * Princípio IV: este arquivo é expresso em tipos de domínio do projeto e NÃO conhece Supabase.
 * Destino na implementação: `src/services/auth/types.ts` e `src/services/usuarios/types.ts`.
 *
 * Duas implementações obrigatórias por porta:
 *   - `src/services/supabase/…`  adaptador real (única pasta autorizada a importar supabase-js)
 *   - `src/services/fakes/…`     fake in-memory usado por todo teste de integração (Princípio VIII)
 *
 * Erros são união discriminada, nunca `throw` de string: a UI precisa mapear código → texto de
 * `config.ts` sem inspecionar mensagens.
 */

import type {
  Perfil,
  SituacaoUsuario,
  Usuario,
  UsuarioSessao,
  EstadoDaSessao,
  RegistroDeAuditoria,
} from '../../../src/types';

/* ------------------------------------------------------------------ *
 * Resultado genérico
 * ------------------------------------------------------------------ */

export type Resultado<T, E> =
  | { readonly ok: true; readonly valor: T }
  | { readonly ok: false; readonly erro: E };

/* ------------------------------------------------------------------ *
 * AuthPort — entrada, saída, senha, sessão
 * ------------------------------------------------------------------ */

/**
 * `credenciais_invalidas` é deliberadamente único para e-mail inexistente e senha errada (FR-002).
 * Nenhum código adicional pode distinguir os dois casos, nem aqui nem no texto exibido.
 */
export type ErroDeEntrada =
  | { readonly codigo: 'credenciais_invalidas' }
  | { readonly codigo: 'conta_indisponivel'; readonly situacao: Exclude<SituacaoUsuario, 'ativo'> }
  | { readonly codigo: 'contido_por_tentativas'; readonly liberadoEmSegundos: number }
  | { readonly codigo: 'indisponivel' };

export type ErroDeSenha =
  | { readonly codigo: 'senha_fraca'; readonly regrasNaoAtendidas: readonly string[] }
  | { readonly codigo: 'link_invalido' }
  | { readonly codigo: 'sessao_expirada' }
  | { readonly codigo: 'indisponivel' };

export interface AuthPort {
  /** Estado inicial resolvido a partir da sessão persistida; `carregando` até a primeira resolução. */
  obterEstado(): EstadoDaSessao;

  /** Fonte do `sessionStore` (R-03). Devolve a função de cancelamento. */
  aoMudarSessao(ouvinte: (estado: EstadoDaSessao) => void): () => void;

  entrar(
    email: string,
    senha: string,
  ): Promise<Resultado<UsuarioSessao, ErroDeEntrada>>;

  sair(): Promise<void>;

  /** Troca obrigatória do primeiro acesso e troca voluntária. Zera `primeiroAcesso` (FR-027). */
  trocarSenha(novaSenha: string): Promise<Resultado<void, ErroDeSenha>>;

  /** Sempre resolve com sucesso, exista o e-mail ou não (FR-030). */
  solicitarRecuperacao(email: string): Promise<void>;

  /** Consome o link de uso único; encerra as demais sessões do usuário (FR-031, FR-032). */
  redefinirSenhaComLink(
    token: string,
    novaSenha: string,
  ): Promise<Resultado<void, ErroDeSenha>>;

  /** Persiste a visão preferida. Não altera permissões (FR-013). */
  definirVisaoAtiva(visao: Perfil): Promise<Resultado<void, { readonly codigo: 'perfil_nao_atribuido' | 'indisponivel' }>>;
}

/* ------------------------------------------------------------------ *
 * UsuariosPort — gestão administrativa (US2, US5)
 * ------------------------------------------------------------------ */

export interface NovoUsuario {
  readonly nome: string;
  readonly email: string;
  readonly perfis: readonly Perfil[]; // ≥ 1
  readonly professorId: string | null; // obrigatório se perfis inclui 'professor'
}

export interface FiltroDeUsuarios {
  readonly termo?: string; // casa contra nome e e-mail
  readonly perfil?: Perfil;
  readonly situacao?: SituacaoUsuario;
}

export type ErroDeGestao =
  | { readonly codigo: 'email_em_uso' }
  | { readonly codigo: 'vinculo_professor_obrigatorio' }
  | { readonly codigo: 'perfil_obrigatorio' }
  | { readonly codigo: 'ultimo_administrador' }
  | { readonly codigo: 'nao_autorizado' }
  | { readonly codigo: 'indisponivel' };

export interface UsuariosPort {
  listar(filtro: FiltroDeUsuarios): Promise<Resultado<readonly Usuario[], ErroDeGestao>>;
  criar(dados: NovoUsuario): Promise<Resultado<Usuario, ErroDeGestao>>;
  definirPerfis(usuarioId: string, perfis: readonly Perfil[]): Promise<Resultado<Usuario, ErroDeGestao>>;
  bloquear(usuarioId: string): Promise<Resultado<Usuario, ErroDeGestao>>;
  desbloquear(usuarioId: string): Promise<Resultado<Usuario, ErroDeGestao>>;
  desativar(usuarioId: string): Promise<Resultado<Usuario, ErroDeGestao>>;
  reemitirSenhaTemporaria(usuarioId: string): Promise<Resultado<void, ErroDeGestao>>;
  /** Só para o vínculo obrigatório do perfil Professor; cadastro completo é outra feature. */
  listarProfessoresDisponiveis(): Promise<Resultado<readonly { id: string; nome: string }[], ErroDeGestao>>;
}

/* ------------------------------------------------------------------ *
 * AuditoriaPort — US6
 * ------------------------------------------------------------------ */

export interface FiltroDeAuditoria {
  readonly usuarioAfetadoId?: string;
  readonly de?: string; // ISO 8601
  readonly ate?: string; // ISO 8601
  readonly limite?: number; // padrão 50
}

export interface AuditoriaPort {
  /** Somente leitura: não existe método de escrita nem de exclusão, por contrato (FR-041). */
  listar(
    filtro: FiltroDeAuditoria,
  ): Promise<Resultado<readonly RegistroDeAuditoria[], { readonly codigo: 'nao_autorizado' | 'indisponivel' }>>;
}

/* ------------------------------------------------------------------ *
 * Entrega das portas aos componentes (R-03)
 * ------------------------------------------------------------------ */

/** Handle do store de sessão. Criado por fábrica, nunca singleton de módulo. */
export interface SessionStore {
  /** Assina mudanças; devolve a função de cancelamento. */
  subscribe(ouvinte: () => void): () => void;
  /** DEVE devolver a mesma referência enquanto nada mudar (senão `useSyncExternalStore` entra em loop). */
  getSnapshot(): EstadoDaSessao;
}

/**
 * Valor do único Context do projeto (`src/services/PortasProvider.tsx`).
 *
 * Contrato de contenção — o que separa injeção de dependência de "estado global":
 *   - montado UMA vez no bootstrap e passado por prop ao provider; a referência nunca muda,
 *     portanto o Context não propaga re-render;
 *   - o provider NÃO pode conter `useState`, `useReducer` ou valor derivado mutável;
 *   - o Context entrega o *store*, não o *snapshot*: `useSession()` lê por `useSyncExternalStore`,
 *     e quem não assina não re-renderiza;
 *   - `createContext` é permitido apenas em `src/services/` (lint + review).
 *
 * Em produção: adaptadores de `src/services/supabase/`.
 * Em teste:    fakes de `src/services/fakes/`, injetados por render — sem `vi.mock`.
 */
export interface Portas {
  readonly auth: AuthPort;
  readonly usuarios: UsuariosPort;
  readonly auditoria: AuditoriaPort;
  readonly sessao: SessionStore;
}

/* ------------------------------------------------------------------ *
 * Invariantes que todo fake DEVE reproduzir
 * ------------------------------------------------------------------ */

/**
 * O fake não é um stub complacente: se ele aceitar o que o banco recusa, o teste de integração passa
 * e a produção quebra. Reproduzir obrigatoriamente:
 *
 *  1. entrar() com e-mail inexistente e com senha errada devolve exatamente `credenciais_invalidas`.
 *  2. entrar() em conta bloqueada/desativada devolve `conta_indisponivel` mesmo com a senha certa.
 *  3. 5 falhas na mesma conta em 15 min → `contido_por_tentativas`, inclusive com a senha correta.
 *  4. criar() com 'professor' e professorId nulo → `vinculo_professor_obrigatorio`.
 *  5. criar() com e-mail já usado, em qualquer caixa → `email_em_uso`.
 *  6. bloquear/desativar/rebaixar o último administrador ativo → `ultimo_administrador`.
 *  7. chamadas de UsuariosPort por não-administrador → `nao_autorizado`.
 *  8. definirVisaoAtiva() não altera `perfis`; listar()/AuditoriaPort ignoram a visão ativa.
 *  9. remover o perfil que era a visão ativa reajusta `visaoAtiva` para o de maior alcance restante.
 * 10. redefinirSenhaComLink() invalida o link e emite estado `anonimo` para as demais sessões.
 */
export type InvariantesDoFake = never;
