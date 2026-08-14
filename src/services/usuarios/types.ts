/**
 * Porta de gestão administrativa de usuários (US2, US5).
 * Princípio IV: tipos de domínio apenas; nada aqui conhece Supabase.
 */
import type { Perfil, SituacaoUsuario, Usuario } from '../../types';
import type { Resultado } from '../auth/types';

export interface NovoUsuario {
  readonly nome: string;
  readonly email: string;
  /** Ao menos um (FR-008 / INV-1). */
  readonly perfis: readonly Perfil[];
  /** Obrigatório quando `perfis` inclui 'professor' (FR-018 / INV-2). */
  readonly professorId: string | null;
}

export interface FiltroDeUsuarios {
  /** Casa contra nome e e-mail. */
  readonly termo?: string;
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

export interface ProfessorDisponivel {
  readonly id: string;
  readonly nome: string;
}

export interface UsuariosPort {
  listar(filtro: FiltroDeUsuarios): Promise<Resultado<readonly Usuario[], ErroDeGestao>>;
  criar(dados: NovoUsuario): Promise<Resultado<Usuario, ErroDeGestao>>;
  definirPerfis(
    usuarioId: string,
    perfis: readonly Perfil[],
  ): Promise<Resultado<Usuario, ErroDeGestao>>;
  bloquear(usuarioId: string): Promise<Resultado<Usuario, ErroDeGestao>>;
  desbloquear(usuarioId: string): Promise<Resultado<Usuario, ErroDeGestao>>;
  desativar(usuarioId: string): Promise<Resultado<Usuario, ErroDeGestao>>;
  reemitirSenhaTemporaria(usuarioId: string): Promise<Resultado<void, ErroDeGestao>>;
  /** Só para o vínculo obrigatório do perfil Professor; cadastro completo é outra feature. */
  listarProfessoresDisponiveis(): Promise<Resultado<readonly ProfessorDisponivel[], ErroDeGestao>>;
}
