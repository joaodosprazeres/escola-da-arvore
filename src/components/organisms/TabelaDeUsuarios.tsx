/**
 * Lista de usuários, utilizável com dezenas de contas: rola dentro do próprio contêiner, nunca a
 * página inteira (FR-025, FR-043; T073).
 */
import { TEXTOS } from '../../config';
import type { Usuario } from '../../types';
import { LinhaDeUsuario } from '../molecules/LinhaDeUsuario';
import { AcoesDeUsuario } from './AcoesDeUsuario';

export interface TabelaDeUsuariosProps {
  readonly usuarios: readonly Usuario[];
  readonly aoAtualizar: (usuario: Usuario) => void;
}

export function TabelaDeUsuarios({ usuarios, aoAtualizar }: TabelaDeUsuariosProps) {
  if (usuarios.length === 0) {
    return <p className="text-sm">{TEXTOS.usuarios.listaVazia}</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-conteudo text-left text-base">
        <thead>
          <tr className="border-b-2 border-verde-escuro">
            <th scope="col" className="px-3 py-2">
              {TEXTOS.usuarios.colunaNome}
            </th>
            <th scope="col" className="px-3 py-2">
              {TEXTOS.usuarios.colunaEmail}
            </th>
            <th scope="col" className="px-3 py-2">
              {TEXTOS.usuarios.colunaPerfis}
            </th>
            <th scope="col" className="px-3 py-2">
              {TEXTOS.usuarios.colunaSituacao}
            </th>
            <th scope="col" className="px-3 py-2">
              {TEXTOS.usuarios.colunaAcoes}
            </th>
          </tr>
        </thead>
        <tbody>
          {usuarios.map((usuario) => (
            <LinhaDeUsuario
              key={usuario.id}
              usuario={usuario}
              acoes={<AcoesDeUsuario usuario={usuario} aoAtualizar={aoAtualizar} />}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
