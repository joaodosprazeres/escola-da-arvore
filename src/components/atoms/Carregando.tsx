/**
 * Indicador de carregamento — texto sempre visível (nunca só um ícone girando), anunciado a leitor
 * de tela por `aria-live="polite"` (§6.1, §6.3).
 */
import { TEXTOS } from '../../config';

export interface CarregandoProps {
  readonly texto?: string;
}

export function Carregando({ texto = TEXTOS.layout.carregando }: CarregandoProps) {
  return (
    <p role="status" aria-live="polite" aria-busy="true" className="text-base text-preto">
      {texto}
    </p>
  );
}
