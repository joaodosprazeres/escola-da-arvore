/**
 * Leitura da sessão por `useSyncExternalStore` (API nativa do React 19).
 * Quem não chama este hook não re-renderiza quando a sessão muda (R-03).
 */
import { useSyncExternalStore } from 'react';
import type { EstadoDaSessao } from '../../types';
import { usePortas } from '../PortasProvider';

export function useSession(): EstadoDaSessao {
  const { sessao } = usePortas();

  return useSyncExternalStore(sessao.subscribe, sessao.getSnapshot, sessao.getSnapshot);
}
