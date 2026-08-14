/**
 * Porta de auditoria (US6). Somente leitura: a ausência de método de escrita ou exclusão é o
 * contrato da FR-041 — a imutabilidade não depende de disciplina de chamador.
 */
import type { RegistroDeAuditoria } from '../../types';
import type { Resultado } from '../auth/types';

export interface FiltroDeAuditoria {
  readonly usuarioAfetadoId?: string;
  /** ISO 8601. */
  readonly de?: string;
  /** ISO 8601. */
  readonly ate?: string;
  /** Padrão 50. */
  readonly limite?: number;
}

export type ErroDeAuditoria = { readonly codigo: 'nao_autorizado' | 'indisponivel' };

export interface AuditoriaPort {
  listar(
    filtro: FiltroDeAuditoria,
  ): Promise<Resultado<readonly RegistroDeAuditoria[], ErroDeAuditoria>>;
}
