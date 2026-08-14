/**
 * Aviso claro, sem revelar conteúdo da área negada (FR-015).
 */
import { Link } from 'react-router-dom';
import { PAINEL_DO_PERFIL, TEXTOS } from '../../config';
import { useSession } from '../../services/auth/useSession';
import { LayoutInterno } from '../templates/LayoutInterno';

export function AcessoNegadoPage() {
  const sessao = useSession();
  const destino =
    sessao.status === 'autenticado' ? PAINEL_DO_PERFIL[sessao.usuario.visaoAtiva] : '/entrar';

  return (
    <LayoutInterno titulo={TEXTOS.acessoNegado.titulo}>
      <p>{TEXTOS.acessoNegado.explicacao}</p>
      <p>
        <Link to={destino}>{TEXTOS.acessoNegado.voltarAoPainel}</Link>
      </p>
    </LayoutInterno>
  );
}
