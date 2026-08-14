/**
 * Contratos compartilhados do domínio (Princípio I e III).
 *
 * Tipos de domínio em português; nada aqui conhece Supabase (Princípio IV). Tudo `readonly`
 * porque o snapshot do store de sessão precisa ser imutável para o `useSyncExternalStore` (R-03).
 */

/* ------------------------------------------------------------------ *
 * Domínio de autenticação e perfis (data-model.md §5)
 * ------------------------------------------------------------------ */

export type Perfil = 'administrador' | 'secretaria' | 'coordenacao' | 'professor';

export type SituacaoUsuario = 'ativo' | 'bloqueado' | 'desativado';

export type AcaoDeAuditoria =
  | 'usuario_criado'
  | 'perfil_atribuido'
  | 'perfil_removido'
  | 'usuario_bloqueado'
  | 'usuario_desbloqueado'
  | 'usuario_desativado'
  | 'senha_redefinida_admin'
  | 'visao_ativa_alterada';

export interface UsuarioSessao {
  readonly id: string;
  readonly nome: string;
  readonly email: string;
  /** Permissões efetivas = união das linhas de `user_roles` (FR-009). */
  readonly perfis: readonly Perfil[];
  /** Só painel e menu; nenhuma política RLS a consulta (FR-013). */
  readonly visaoAtiva: Perfil;
  readonly primeiroAcesso: boolean;
  readonly situacao: SituacaoUsuario;
}

export interface Usuario extends UsuarioSessao {
  readonly professorId: string | null;
  /** ISO 8601, hora do servidor. */
  readonly ultimoAcessoEm: string | null;
  readonly criadoEm: string;
}

export interface RegistroDeAuditoria {
  readonly id: string;
  readonly autor: { readonly id: string; readonly nome: string };
  readonly afetado: { readonly id: string; readonly nome: string };
  readonly acao: AcaoDeAuditoria;
  readonly valorAnterior: string | null;
  readonly valorNovo: string | null;
  readonly ocorridoEm: string;
}

export type EstadoDaSessao =
  | { readonly status: 'carregando' }
  | { readonly status: 'anonimo' }
  | { readonly status: 'autenticado'; readonly usuario: UsuarioSessao };

/* ------------------------------------------------------------------ *
 * Configuração (Princípio III) — formas dos dados de src/config.ts
 * ------------------------------------------------------------------ */

/** Identificador da página; `main.tsx` traduz para o componente, `config.ts` não importa JSX. */
export type NomeDePagina =
  | 'EntrarPage'
  | 'EsqueciSenhaPage'
  | 'RedefinirSenhaPage'
  | 'TrocarSenhaPage'
  | 'PainelAdministradorPage'
  | 'PainelSecretariaPage'
  | 'PainelCoordenacaoPage'
  | 'PainelProfessorPage'
  | 'UsuariosPage'
  | 'NovoUsuarioPage'
  | 'AuditoriaPage'
  | 'AcessoNegadoPage'
  | 'NaoEncontradaPage';

export interface Rota {
  readonly caminho: string;
  readonly pagina: NomeDePagina;
  readonly titulo: string;
  /** `null` = rota anônima; lista vazia = qualquer usuário autenticado. */
  readonly perfisPermitidos: readonly Perfil[] | null;
  /** `true` = a rota continua acessível enquanto a troca obrigatória estiver pendente. */
  readonly exigeTrocaDeSenha: boolean;
}

export interface ItemDeMenu {
  readonly caminho: string;
  readonly rotulo: string;
  readonly icone: NomeDeIcone;
}

export type NomeDeIcone =
  | 'painel'
  | 'usuarios'
  | 'auditoria'
  | 'sair'
  | 'alternar'
  | 'alerta'
  | 'erro'
  | 'sucesso'
  | 'bloqueado'
  | 'desativado'
  | 'ativo'
  | 'busca'
  | 'voltar';

export interface RegraDeSenhaExibida {
  readonly codigo: string;
  readonly texto: string;
}

export interface TemposDeSessao {
  readonly inatividadeEmMinutos: number;
  readonly limiteAbsolutoEmHoras: number;
  readonly avisoDeExpiracaoEmSegundos: number;
}
