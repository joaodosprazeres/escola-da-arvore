/**
 * Adaptador real da `AuditoriaPort` (Princípio IV). Somente leitura, contra a política de
 * `audit_log` que já restringe ao Administrador (`contracts/rls-e-rotas.md` §A.2) — sem checagem
 * de perfil aqui, a negação vem do banco (US6-4).
 */
import type { RegistroDeAuditoria } from '../../types';
import type { Resultado } from '../auth/types';
import type { AuditoriaPort, ErroDeAuditoria, FiltroDeAuditoria } from '../auditoria/types';
import { obterCliente } from './cliente';
import type { ClienteSupabase } from './cliente';

const LIMITE_PADRAO = 50;

interface LinhaDeAuditoria {
  readonly id: number;
  readonly action: RegistroDeAuditoria['acao'];
  readonly old_value: string | null;
  readonly new_value: string | null;
  readonly created_at: string;
  readonly autor: { readonly id: string; readonly full_name: string } | null;
  readonly afetado: { readonly id: string; readonly full_name: string } | null;
}

function paraRegistro(linha: LinhaDeAuditoria): RegistroDeAuditoria {
  return {
    id: String(linha.id),
    autor: { id: linha.autor?.id ?? '', nome: linha.autor?.full_name ?? '' },
    afetado: { id: linha.afetado?.id ?? '', nome: linha.afetado?.full_name ?? '' },
    acao: linha.action,
    valorAnterior: linha.old_value,
    valorNovo: linha.new_value,
    ocorridoEm: linha.created_at,
  };
}

export function criarAuditoriaAdapter(cliente: ClienteSupabase = obterCliente()): AuditoriaPort {
  return {
    async listar(
      filtro: FiltroDeAuditoria,
    ): Promise<Resultado<readonly RegistroDeAuditoria[], ErroDeAuditoria>> {
      let consulta = cliente
        .from('audit_log')
        .select(
          'id, action, old_value, new_value, created_at, autor:actor_id(id, full_name), afetado:target_user_id(id, full_name)',
        )
        .order('created_at', { ascending: false })
        .limit(filtro.limite ?? LIMITE_PADRAO);

      if (filtro.usuarioAfetadoId !== undefined) {
        consulta = consulta.eq('target_user_id', filtro.usuarioAfetadoId);
      }
      if (filtro.de !== undefined) {
        consulta = consulta.gte('created_at', filtro.de);
      }
      if (filtro.ate !== undefined) {
        consulta = consulta.lte('created_at', filtro.ate);
      }

      const { data, error } = await consulta.returns<LinhaDeAuditoria[]>();

      if (error !== null) {
        return {
          ok: false,
          erro: { codigo: error.code === 'PGRST301' ? 'nao_autorizado' : 'indisponivel' },
        };
      }

      return { ok: true, valor: data.map(paraRegistro) };
    },
  };
}
