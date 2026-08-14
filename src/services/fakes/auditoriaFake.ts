/**
 * Fake in-memory da `AuditoriaPort` (Princípios IV e VIII).
 *
 * Somente leitura, restrita ao Administrador (FR-042). A visão ativa é ignorada: o alcance vem das
 * permissões efetivas (invariante 8).
 */
import type { RegistroDeAuditoria } from '../../types';
import type { Resultado } from '../auth/types';
import type { AuditoriaPort, ErroDeAuditoria, FiltroDeAuditoria } from '../auditoria/types';
import { contaPorId } from './estado';
import type { EstadoDoFake } from './estado';

const LIMITE_PADRAO = 50;

export function criarAuditoriaFake(estado: EstadoDoFake): AuditoriaPort {
  return {
    async listar(
      filtro: FiltroDeAuditoria,
    ): Promise<Resultado<readonly RegistroDeAuditoria[], ErroDeAuditoria>> {
      const conta =
        estado.contaDaSessao === null ? undefined : contaPorId(estado, estado.contaDaSessao);

      if (
        conta === undefined ||
        conta.situacao !== 'ativo' ||
        !conta.perfis.includes('administrador')
      ) {
        return { ok: false, erro: { codigo: 'nao_autorizado' } };
      }

      const encontrados = estado.auditoria
        .filter((registro) => {
          const casaAfetado =
            filtro.usuarioAfetadoId === undefined ||
            registro.afetado.id === filtro.usuarioAfetadoId;
          const casaDe = filtro.de === undefined || registro.ocorridoEm >= filtro.de;
          const casaAte = filtro.ate === undefined || registro.ocorridoEm <= filtro.ate;
          return casaAfetado && casaDe && casaAte;
        })
        .slice()
        .reverse()
        .slice(0, filtro.limite ?? LIMITE_PADRAO);

      return { ok: true, valor: encontrados };
    },
  };
}
