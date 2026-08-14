/**
 * Histórico de ações administrativas, com filtros por usuário afetado e por período (FR-042; T113).
 */
import { useState } from 'react';
import { TEXTOS } from '../../config';
import { useRequisicao } from '../../lib/useRequisicao';
import { usePortas } from '../../services/PortasProvider';
import { Carregando } from '../atoms/Carregando';
import { Icone } from '../atoms/Icone';
import { Rotulo } from '../atoms/Rotulo';
import { TabelaDeAuditoria } from '../organisms/TabelaDeAuditoria';
import { LayoutInterno } from '../templates/LayoutInterno';

export function AuditoriaPage() {
  const { auditoria, usuarios } = usePortas();
  const [usuarioAfetadoId, setUsuarioAfetadoId] = useState('');
  const [de, setDe] = useState('');
  const [ate, setAte] = useState('');

  const listaDeUsuarios = useRequisicao(() => usuarios.listar({}), []);

  const requisicao = useRequisicao(
    () =>
      auditoria.listar({
        ...(usuarioAfetadoId !== '' && { usuarioAfetadoId }),
        ...(de !== '' && { de: new Date(de).toISOString() }),
        ...(ate !== '' && { ate: new Date(ate).toISOString() }),
      }),
    [usuarioAfetadoId, de, ate],
  );

  return (
    <LayoutInterno titulo={TEXTOS.auditoria.titulo}>
      <div className="mb-4 flex flex-wrap items-end gap-4">
        <div>
          <Rotulo htmlFor="filtro-afetado">{TEXTOS.auditoria.rotuloFiltroAfetado}</Rotulo>
          <select
            id="filtro-afetado"
            value={usuarioAfetadoId}
            onChange={(evento) => setUsuarioAfetadoId(evento.target.value)}
            className="min-h-alvo-toque rounded-sm border border-verde-escuro bg-branco px-3 text-base text-preto"
          >
            <option value="">{TEXTOS.usuarios.opcaoTodos}</option>
            {(listaDeUsuarios.dados ?? []).map((usuario) => (
              <option key={usuario.id} value={usuario.id}>
                {usuario.nome}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Rotulo htmlFor="filtro-de">{TEXTOS.auditoria.rotuloFiltroDe}</Rotulo>
          <input
            id="filtro-de"
            type="date"
            value={de}
            onChange={(evento) => setDe(evento.target.value)}
            className="min-h-alvo-toque rounded-sm border border-verde-escuro bg-branco px-3 text-base text-preto"
          />
        </div>

        <div>
          <Rotulo htmlFor="filtro-ate">{TEXTOS.auditoria.rotuloFiltroAte}</Rotulo>
          <input
            id="filtro-ate"
            type="date"
            value={ate}
            onChange={(evento) => setAte(evento.target.value)}
            className="min-h-alvo-toque rounded-sm border border-verde-escuro bg-branco px-3 text-base text-preto"
          />
        </div>
      </div>

      {requisicao.carregando && <Carregando />}

      {requisicao.erro !== null && (
        <p role="alert" className="mb-4 flex items-center gap-2 text-sm text-erro">
          <Icone nome="erro" />
          {requisicao.erro.codigo === 'nao_autorizado'
            ? TEXTOS.errosDeGestao.nao_autorizado
            : TEXTOS.errosDeGestao.indisponivel}
        </p>
      )}

      {requisicao.dados !== null && <TabelaDeAuditoria registros={requisicao.dados} />}
    </LayoutInterno>
  );
}
