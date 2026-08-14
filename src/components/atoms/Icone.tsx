/**
 * ÚNICO ponto de import de `lucide-react` do projeto (R-12, imposto por lint fora deste arquivo).
 * `aria-hidden` por padrão — o ícone é decorativo a menos que `rotulo` o torne o único conteúdo de
 * um controle (FR-045).
 */
import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  CheckCircle2,
  History,
  LayoutDashboard,
  Lock,
  LogOut,
  RefreshCw,
  Search,
  Users,
  XCircle,
} from 'lucide-react';
import type { NomeDeIcone } from '../../types';

const COMPONENTE_POR_NOME: Record<NomeDeIcone, typeof Users> = {
  painel: LayoutDashboard,
  usuarios: Users,
  auditoria: History,
  sair: LogOut,
  alternar: RefreshCw,
  alerta: AlertTriangle,
  erro: XCircle,
  sucesso: CheckCircle2,
  bloqueado: Lock,
  desativado: Ban,
  ativo: CheckCircle2,
  busca: Search,
  voltar: ArrowLeft,
};

export interface IconeProps {
  readonly nome: NomeDeIcone;
  /** Presente só quando o ícone é o único conteúdo de um controle (FR-045). */
  readonly rotulo?: string;
  readonly tamanho?: number;
  readonly className?: string;
}

export function Icone({ nome, rotulo, tamanho = 20, className }: IconeProps) {
  const Componente = COMPONENTE_POR_NOME[nome];

  if (rotulo !== undefined) {
    return (
      <span role="img" aria-label={rotulo} className={className}>
        <Componente size={tamanho} aria-hidden="true" />
      </span>
    );
  }

  return <Componente size={tamanho} aria-hidden="true" className={className} />;
}
