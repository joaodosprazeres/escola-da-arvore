/**
 * Montagem das portas fake. Fábrica, nunca singleton: cada teste monta o seu conjunto e nada vaza
 * entre arquivos (R-03 regra 7).
 */
import { criarSessionStore } from '../auth/criarSessionStore';
import type { SessionStoreControlado } from '../auth/criarSessionStore';
import type { Portas } from '../portas';
import { criarAuthFake } from './authFake';
import { criarAuditoriaFake } from './auditoriaFake';
import { criarUsuariosFake } from './usuariosFake';
import { criarEstadoDoFake } from './estado';
import type { EstadoDoFake, SementeDoFake } from './estado';

export interface PortasFake extends Portas {
  readonly sessao: SessionStoreControlado;
  /** Acesso ao estado interno, só para o preparo e a verificação dos testes. */
  readonly estado: EstadoDoFake;
}

export function criarPortasFake(semente: SementeDoFake = {}): PortasFake {
  const estado = criarEstadoDoFake(semente);
  const auth = criarAuthFake(estado);

  return {
    auth,
    usuarios: criarUsuariosFake(estado),
    auditoria: criarAuditoriaFake(estado),
    sessao: criarSessionStore(auth),
    estado,
  };
}

export type { SementeDoFake, EstadoDoFake } from './estado';
