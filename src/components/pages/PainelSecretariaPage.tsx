import { TEXTOS } from '../../config';
import { LayoutInterno } from '../templates/LayoutInterno';

export function PainelSecretariaPage() {
  return (
    <LayoutInterno titulo="Painel da Secretaria">
      <p>{TEXTOS.paineis.secretaria}</p>
    </LayoutInterno>
  );
}
