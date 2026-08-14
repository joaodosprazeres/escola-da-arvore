/**
 * Botão nos cinco tratamentos de superfície de `docs/design-system.md` §6.1.
 * Alvo de toque ≥ 44×44px sempre; estado de carregamento fica inerte para impedir envio duplo
 * (FR-047).
 */
import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type VarianteDeBotao =
  'primario' | 'secundario' | 'terciario' | 'destrutivo' | 'sobreEscuro';

const CLASSE_POR_VARIANTE: Record<VarianteDeBotao, string> = {
  primario: 'bg-laranja-escuro text-branco hover:bg-verde-escuro',
  secundario:
    'border-2 border-verde-escuro bg-transparent text-verde-escuro hover:bg-verde-escuro hover:text-branco',
  terciario: 'text-verde-escuro hover:bg-cinza-form',
  destrutivo: 'bg-erro text-branco hover:bg-preto',
  sobreEscuro: 'sobre-escuro bg-branco text-preto hover:bg-laranja',
};

export interface BotaoProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variante?: VarianteDeBotao;
  readonly carregando?: boolean;
  readonly children: ReactNode;
}

export function Botao({
  variante = 'primario',
  carregando = false,
  disabled,
  className = '',
  children,
  ...outros
}: BotaoProps) {
  const inerte = disabled === true || carregando;

  return (
    <button
      {...outros}
      disabled={inerte}
      aria-disabled={inerte}
      aria-busy={carregando}
      className={`inline-flex min-h-alvo-toque min-w-alvo-toque items-center justify-center gap-2 rounded-sm px-4 text-base font-weight-medio transition-colors disabled:opacity-60 ${CLASSE_POR_VARIANTE[variante]} ${className}`}
    >
      {children}
    </button>
  );
}
