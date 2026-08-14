/**
 * Casca das telas autenticadas: cabeçalho, link de pular para o conteúdo, `h1` com foco
 * movido a cada troca de rota e região `aria-live` anunciando o título (§B.3).
 *
 * `location.state.avisoDeVisaoAjustada` chega do `Guarda` (passo 4, FR-016): a visão ativa mudou
 * sem ação do usuário e precisa de aviso visível, nunca silencioso.
 */
import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { CabecalhoApp } from '../organisms/CabecalhoApp';
import { TEXTOS } from '../../config';
import { useFocoDeTitulo } from './useFocoDeTitulo';

export interface LayoutInternoProps {
  readonly titulo: string;
  readonly children: ReactNode;
}

interface EstadoDeNavegacao {
  readonly avisoDeVisaoAjustada?: string;
}

export function LayoutInterno({ titulo, children }: LayoutInternoProps) {
  const referenciaDoTitulo = useFocoDeTitulo(titulo);
  const location = useLocation();
  const estado = location.state as EstadoDeNavegacao | null;
  const perfilAjustado = estado?.avisoDeVisaoAjustada;

  return (
    <div className="min-h-screen bg-branco">
      <a
        href="#conteudo"
        className="sr-only rounded-sm bg-preto px-4 py-2 text-branco focus:not-sr-only focus:absolute focus:top-2 focus:left-2"
      >
        {TEXTOS.layout.irParaConteudo}
      </a>
      <CabecalhoApp />
      {perfilAjustado !== undefined && (
        <p role="status" aria-live="polite" className="bg-aviso px-4 py-2 text-sm text-preto">
          {TEXTOS.layout.avisoVisaoAjustada.replace('{perfil}', perfilAjustado)}
        </p>
      )}
      <main id="conteudo" className="mx-auto max-w-conteudo px-4 py-6">
        <div aria-live="polite" className="sr-only">
          {titulo}
        </div>
        <h1 ref={referenciaDoTitulo} tabIndex={-1} className="mb-4 text-2xl font-weight-forte">
          {titulo}
        </h1>
        {children}
      </main>
    </div>
  );
}
