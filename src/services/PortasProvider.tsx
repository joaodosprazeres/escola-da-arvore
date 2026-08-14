/**
 * ÚNICO `createContext` do projeto (R-03, imposto por lint fora de `src/services/`).
 *
 * O provider recebe as portas prontas por prop e as repassa. Sem `useState`, sem `useReducer`,
 * sem valor derivado: a referência é constante e, por isso, o Context não propaga re-render.
 * O que muda em runtime é o *store*, lido por `useSyncExternalStore` em `useSession()`.
 */
import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import type { Portas } from './portas';

const PortasContext = createContext<Portas | null>(null);

export interface PortasProviderProps {
  readonly portas: Portas;
  readonly children: ReactNode;
}

export function PortasProvider({ portas, children }: PortasProviderProps) {
  return <PortasContext value={portas}>{children}</PortasContext>;
}

export function usePortas(): Portas {
  const portas = useContext(PortasContext);

  if (portas === null) {
    throw new Error('usePortas() exige um <PortasProvider portas={…}> acima na árvore.');
  }

  return portas;
}
