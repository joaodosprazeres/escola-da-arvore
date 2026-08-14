/**
 * Campo de formulário (§6.3): 16px para não disparar zoom automático do iOS, altura mínima 44px,
 * borda de erro + `aria-invalid` + `aria-describedby` — nunca só cor para indicar estado inválido.
 */
import type { InputHTMLAttributes } from 'react';

export interface CampoTextoProps extends InputHTMLAttributes<HTMLInputElement> {
  readonly erro?: boolean;
}

export function CampoTexto({ erro = false, className = '', ...outros }: CampoTextoProps) {
  return (
    <input
      {...outros}
      aria-invalid={erro}
      className={`min-h-alvo-toque w-full rounded-sm border bg-branco px-3 text-base text-preto focus-visible:border-2 ${
        erro ? 'border-2 border-erro' : 'border-verde-escuro'
      } ${className}`}
    />
  );
}
