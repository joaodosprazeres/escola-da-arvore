/**
 * Porta de autenticação — derivada de `specs/001-.../contracts/ports.ts`.
 *
 * Princípio IV: expressa em tipos de domínio; nada aqui conhece Supabase.
 * Erros são união discriminada, nunca `throw` de string: a UI mapeia código → texto de `config.ts`
 * sem inspecionar mensagens.
 */
import type { EstadoDaSessao, Perfil, SituacaoUsuario, UsuarioSessao } from '../../types';

export type Resultado<T, E> =
  { readonly ok: true; readonly valor: T } | { readonly ok: false; readonly erro: E };

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

export type ErroDeVisao = { readonly codigo: 'perfil_nao_atribuido' | 'indisponivel' };

export interface AuthPort {
  /** Estado inicial resolvido a partir da sessão persistida; `carregando` até a primeira resolução. */
  obterEstado(): EstadoDaSessao;

  /** Fonte do `sessionStore` (R-03). Devolve a função de cancelamento. */
  aoMudarSessao(ouvinte: (estado: EstadoDaSessao) => void): () => void;

  entrar(email: string, senha: string): Promise<Resultado<UsuarioSessao, ErroDeEntrada>>;

  sair(): Promise<void>;

  /** Troca obrigatória do primeiro acesso e troca voluntária. Zera `primeiroAcesso` (FR-027). */
  trocarSenha(novaSenha: string): Promise<Resultado<void, ErroDeSenha>>;

  /** Sempre resolve com sucesso, exista o e-mail ou não (FR-030). */
  solicitarRecuperacao(email: string): Promise<void>;

  /** Consome o link de uso único; encerra as demais sessões do usuário (FR-031, FR-032). */
  redefinirSenhaComLink(token: string, novaSenha: string): Promise<Resultado<void, ErroDeSenha>>;

  /** Persiste a visão preferida. Não altera permissões (FR-013). */
  definirVisaoAtiva(visao: Perfil): Promise<Resultado<void, ErroDeVisao>>;
}

/** Handle do store de sessão. Criado por fábrica, nunca singleton de módulo (R-03). */
export interface SessionStore {
  /** Assina mudanças; devolve a função de cancelamento. */
  subscribe(ouvinte: () => void): () => void;
  /** DEVE devolver a mesma referência enquanto nada mudar (senão `useSyncExternalStore` entra em loop). */
  getSnapshot(): EstadoDaSessao;
}
