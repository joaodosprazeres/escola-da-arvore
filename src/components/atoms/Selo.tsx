/**
 * Selo de situação — ícone **e** texto, nunca só cor (design system §2.3; FR-045).
 */
import type { SituacaoUsuario } from '../../types';
import { NOME_DA_SITUACAO } from '../../config';
import { Icone } from './Icone';
import type { NomeDeIcone } from '../../types';

const ICONE_POR_SITUACAO: Record<SituacaoUsuario, NomeDeIcone> = {
  ativo: 'ativo',
  bloqueado: 'bloqueado',
  desativado: 'desativado',
};

const CLASSE_POR_SITUACAO: Record<SituacaoUsuario, string> = {
  ativo: 'bg-cinza-form text-preto',
  bloqueado: 'bg-aviso text-preto',
  desativado: 'bg-preto text-branco',
};

export interface SeloProps {
  readonly situacao: SituacaoUsuario;
}

export function Selo({ situacao }: SeloProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-sm px-2 py-1 text-sm font-weight-medio ${CLASSE_POR_SITUACAO[situacao]}`}
    >
      <Icone nome={ICONE_POR_SITUACAO[situacao]} tamanho={16} />
      {NOME_DA_SITUACAO[situacao]}
    </span>
  );
}
