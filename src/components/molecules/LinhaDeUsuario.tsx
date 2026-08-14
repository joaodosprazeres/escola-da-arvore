/**
 * Uma linha da tabela de usuários: nome, e-mail, perfis, situação e ações (T073).
 * As ações chegam prontas por prop — a molécula não importa serviço algum (R-12).
 */
import type { ReactNode } from 'react';
import { NOME_DO_PERFIL, TEXTOS } from '../../config';
import type { Usuario } from '../../types';
import { Selo } from '../atoms/Selo';

export interface LinhaDeUsuarioProps {
  readonly usuario: Usuario;
  readonly acoes: ReactNode;
}

export function LinhaDeUsuario({ usuario, acoes }: LinhaDeUsuarioProps) {
  return (
    <tr className="border-b border-cinza-form">
      <td className="px-3 py-3 align-top">
        {usuario.nome}
        {usuario.primeiroAcesso && (
          <p className="text-sm text-verde-escuro">{TEXTOS.usuarios.marcaPrimeiroAcesso}</p>
        )}
      </td>
      <td className="px-3 py-3 align-top">{usuario.email}</td>
      <td className="px-3 py-3 align-top">
        {usuario.perfis.map((perfil) => NOME_DO_PERFIL[perfil]).join(', ')}
      </td>
      <td className="px-3 py-3 align-top">
        <Selo situacao={usuario.situacao} />
      </td>
      <td className="px-3 py-3 align-top">{acoes}</td>
    </tr>
  );
}
