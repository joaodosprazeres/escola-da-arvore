/**
 * Rótulo de campo — sempre visível, nunca substituído por placeholder (§6.3).
 */
import type { LabelHTMLAttributes, ReactNode } from 'react';

export interface RotuloProps extends LabelHTMLAttributes<HTMLLabelElement> {
  readonly children: ReactNode;
  /** Marcado em texto, não apenas por asterisco colorido (§6.3). */
  readonly obrigatorio?: boolean;
}

export function Rotulo({ children, obrigatorio = false, className = '', ...outros }: RotuloProps) {
  return (
    <label {...outros} className={`block text-sm font-weight-medio text-preto ${className}`}>
      {children}
      {obrigatorio && <span> (obrigatório)</span>}
    </label>
  );
}
