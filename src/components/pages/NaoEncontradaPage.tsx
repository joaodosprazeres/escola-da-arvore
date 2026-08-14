import { Link } from 'react-router-dom';
import { PAINEL_DO_PERFIL, TEXTOS } from '../../config';
import { useSession } from '../../services/auth/useSession';
import { LayoutInterno } from '../templates/LayoutInterno';

export function NaoEncontradaPage() {
  const sessao = useSession();
  const destino =
    sessao.status === 'autenticado' ? PAINEL_DO_PERFIL[sessao.usuario.visaoAtiva] : '/entrar';

  return (
    <LayoutInterno titulo={TEXTOS.naoEncontrada.titulo}>
      <p>{TEXTOS.naoEncontrada.explicacao}</p>
      <p>
        <Link to={destino}>{TEXTOS.naoEncontrada.voltarAoPainel}</Link>
      </p>
    </LayoutInterno>
  );
}
