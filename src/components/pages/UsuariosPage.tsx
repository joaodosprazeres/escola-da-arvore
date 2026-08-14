/**
 * Lista de usuários com busca por nome, e-mail, perfil e situação (FR-024, FR-025; T074).
 */
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { NOME_DO_PERFIL, NOME_DA_SITUACAO, TEXTOS } from '../../config';
import { useRequisicao } from '../../lib/useRequisicao';
import { usePortas } from '../../services/PortasProvider';
import type { Perfil, SituacaoUsuario, Usuario } from '../../types';
import { Botao } from '../atoms/Botao';
import { CampoTexto } from '../atoms/CampoTexto';
import { Icone } from '../atoms/Icone';
import { Rotulo } from '../atoms/Rotulo';
import { Carregando } from '../atoms/Carregando';
import { TabelaDeUsuarios } from '../organisms/TabelaDeUsuarios';
import { LayoutInterno } from '../templates/LayoutInterno';

const PERFIS: readonly Perfil[] = ['administrador', 'secretaria', 'coordenacao', 'professor'];
const SITUACOES: readonly SituacaoUsuario[] = ['ativo', 'bloqueado', 'desativado'];

interface EstadoDeNavegacao {
  readonly mensagem?: string;
}

export function UsuariosPage() {
  const { usuarios } = usePortas();
  const location = useLocation();
  const mensagem = (location.state as EstadoDeNavegacao | null)?.mensagem;

  const [termo, setTermo] = useState('');
  const [perfil, setPerfil] = useState<Perfil | ''>('');
  const [situacao, setSituacao] = useState<SituacaoUsuario | ''>('');
  const [lista, setLista] = useState<readonly Usuario[] | null>(null);

  const requisicao = useRequisicao(
    () =>
      usuarios.listar({
        ...(termo !== '' && { termo }),
        ...(perfil !== '' && { perfil }),
        ...(situacao !== '' && { situacao }),
      }),
    [termo, perfil, situacao],
  );

  const dados = lista ?? requisicao.dados;

  function aoAtualizarUsuario(atualizado: Usuario): void {
    setLista(
      (requisicao.dados ?? []).map((usuario) =>
        usuario.id === atualizado.id ? atualizado : usuario,
      ),
    );
  }

  return (
    <LayoutInterno titulo={TEXTOS.usuarios.titulo}>
      <div aria-live="polite">
        {mensagem !== undefined && <p className="mb-4 text-sm text-verde-escuro">{mensagem}</p>}
      </div>

      <div className="mb-4 flex items-center justify-between gap-4">
        <Link to="/usuarios/novo">
          <Botao>{TEXTOS.usuarios.acaoNovo}</Botao>
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap gap-4">
        <div>
          <Rotulo htmlFor="busca">{TEXTOS.usuarios.rotuloBusca}</Rotulo>
          <CampoTexto
            id="busca"
            name="busca"
            value={termo}
            onChange={(evento) => {
              setLista(null);
              setTermo(evento.target.value);
            }}
          />
        </div>

        <div>
          <Rotulo htmlFor="filtro-perfil">{TEXTOS.usuarios.rotuloFiltroPerfil}</Rotulo>
          <select
            id="filtro-perfil"
            value={perfil}
            onChange={(evento) => {
              setLista(null);
              setPerfil(evento.target.value as Perfil | '');
            }}
            className="min-h-alvo-toque rounded-sm border border-verde-escuro bg-branco px-3 text-base text-preto"
          >
            <option value="">{TEXTOS.usuarios.opcaoTodos}</option>
            {PERFIS.map((valor) => (
              <option key={valor} value={valor}>
                {NOME_DO_PERFIL[valor]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Rotulo htmlFor="filtro-situacao">{TEXTOS.usuarios.rotuloFiltroSituacao}</Rotulo>
          <select
            id="filtro-situacao"
            value={situacao}
            onChange={(evento) => {
              setLista(null);
              setSituacao(evento.target.value as SituacaoUsuario | '');
            }}
            className="min-h-alvo-toque rounded-sm border border-verde-escuro bg-branco px-3 text-base text-preto"
          >
            <option value="">{TEXTOS.usuarios.opcaoTodos}</option>
            {SITUACOES.map((valor) => (
              <option key={valor} value={valor}>
                {NOME_DA_SITUACAO[valor]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {requisicao.carregando && dados === null && <Carregando />}

      {requisicao.erro !== null && (
        <p role="alert" className="mb-4 flex items-center gap-2 text-sm text-erro">
          <Icone nome="erro" />
          {TEXTOS.errosDeGestao[requisicao.erro.codigo]}
        </p>
      )}

      {dados !== null && <TabelaDeUsuarios usuarios={dados} aoAtualizar={aoAtualizarUsuario} />}
    </LayoutInterno>
  );
}
