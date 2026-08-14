import { TEXTOS } from '../../config';
import { LayoutInterno } from '../templates/LayoutInterno';

export function PainelAdministradorPage() {
  return (
    <LayoutInterno titulo="Painel do Administrador">
      <p>{TEXTOS.paineis.administrador}</p>
    </LayoutInterno>
  );
}
