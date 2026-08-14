import { TEXTOS } from '../../config';
import { LayoutInterno } from '../templates/LayoutInterno';

export function PainelCoordenacaoPage() {
  return (
    <LayoutInterno titulo="Painel da Coordenação">
      <p>{TEXTOS.paineis.coordenacao}</p>
    </LayoutInterno>
  );
}
