/**
 * Move o foco para o `<h1>` a cada troca de título — comportamento próprio, não herdado do
 * roteador (`contracts/rls-e-rotas.md` §B.3). Usado por `LayoutDeAutenticacao` e `LayoutInterno`.
 */
import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';

export function useFocoDeTitulo(titulo: string): RefObject<HTMLHeadingElement | null> {
  const referencia = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    referencia.current?.focus();
  }, [titulo]);

  return referencia;
}
