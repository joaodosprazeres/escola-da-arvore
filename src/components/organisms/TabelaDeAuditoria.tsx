/**
 * Histórico de ações administrativas — legível a 320px sem rolagem horizontal da página; a tabela
 * rola dentro do próprio contêiner (FR-043; T112).
 */
import { TEXTOS } from '../../config';
import type { RegistroDeAuditoria } from '../../types';

export interface TabelaDeAuditoriaProps {
  readonly registros: readonly RegistroDeAuditoria[];
}

function formatarMomento(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(
    new Date(iso),
  );
}

export function TabelaDeAuditoria({ registros }: TabelaDeAuditoriaProps) {
  if (registros.length === 0) {
    return <p className="text-sm">{TEXTOS.auditoria.listaVazia}</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-conteudo text-left text-base">
        <thead>
          <tr className="border-b-2 border-verde-escuro">
            <th scope="col" className="px-3 py-2">
              {TEXTOS.auditoria.colunaMomento}
            </th>
            <th scope="col" className="px-3 py-2">
              {TEXTOS.auditoria.colunaAutor}
            </th>
            <th scope="col" className="px-3 py-2">
              {TEXTOS.auditoria.colunaAfetado}
            </th>
            <th scope="col" className="px-3 py-2">
              {TEXTOS.auditoria.colunaAcao}
            </th>
            <th scope="col" className="px-3 py-2">
              {TEXTOS.auditoria.colunaAnterior}
            </th>
            <th scope="col" className="px-3 py-2">
              {TEXTOS.auditoria.colunaNovo}
            </th>
          </tr>
        </thead>
        <tbody>
          {registros.map((registro) => (
            <tr key={registro.id} className="border-b border-cinza-form">
              <td className="px-3 py-3 align-top">{formatarMomento(registro.ocorridoEm)}</td>
              <td className="px-3 py-3 align-top">{registro.autor.nome}</td>
              <td className="px-3 py-3 align-top">{registro.afetado.nome}</td>
              <td className="px-3 py-3 align-top">{TEXTOS.acoesDeAuditoria[registro.acao]}</td>
              <td className="px-3 py-3 align-top">{registro.valorAnterior ?? '—'}</td>
              <td className="px-3 py-3 align-top">{registro.valorNovo ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
