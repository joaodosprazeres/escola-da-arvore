/**
 * Conjunto de portas entregue aos componentes pelo único Context do projeto (R-03).
 *
 * Contrato de contenção — o que separa injeção de dependência de "estado global":
 *   - montado UMA vez no bootstrap e passado por prop ao provider; a referência nunca muda,
 *     portanto o Context não propaga re-render;
 *   - o provider não contém `useState`, `useReducer` nem valor derivado mutável;
 *   - o Context entrega o *store*, não o *snapshot*: `useSession()` lê por `useSyncExternalStore`.
 *
 * Em produção: adaptadores de `src/services/supabase/`.
 * Em teste:    fakes de `src/services/fakes/`, injetados por render — sem `vi.mock`.
 */
import type { AuthPort, SessionStore } from './auth/types';
import type { UsuariosPort } from './usuarios/types';
import type { AuditoriaPort } from './auditoria/types';

export interface Portas {
  readonly auth: AuthPort;
  readonly usuarios: UsuariosPort;
  readonly auditoria: AuditoriaPort;
  readonly sessao: SessionStore;
}
