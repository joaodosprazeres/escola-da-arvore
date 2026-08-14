/**
 * Casca das telas anônimas (entrar, esqueci senha, redefinir senha, trocar senha).
 * Um `h1` por tela, foco movido a ele a cada troca de rota (§B.3).
 */
import type { ReactNode } from 'react';
import { NOME_DA_INSTITUICAO } from '../../config';
import { useFocoDeTitulo } from './useFocoDeTitulo';

export interface LayoutDeAutenticacaoProps {
  readonly titulo: string;
  readonly children: ReactNode;
}

export function LayoutDeAutenticacao({ titulo, children }: LayoutDeAutenticacaoProps) {
  const referenciaDoTitulo = useFocoDeTitulo(titulo);

  return (
    <div className="flex min-h-screen items-center justify-center bg-cinza-form px-4 py-8">
      <div className="w-full max-w-conteudo rounded-md bg-branco p-6 shadow-2 md:w-2/5">
        <p className="mb-4 text-sm font-weight-medio text-verde-escuro">{NOME_DA_INSTITUICAO}</p>
        <div aria-live="polite" className="sr-only">
          {titulo}
        </div>
        <h1 ref={referenciaDoTitulo} tabIndex={-1} className="mb-4 text-2xl font-weight-forte">
          {titulo}
        </h1>
        {children}
      </div>
    </div>
  );
}
