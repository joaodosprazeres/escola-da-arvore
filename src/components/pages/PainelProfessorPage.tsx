/**
 * `turmas_do_professor()` é stub até a feature de turmas existir (data-model.md §2.3): toda conta
 * Professor vê o painel vazio com orientação, nunca erro (Edge Cases da spec 001).
 */
import { TEXTOS } from '../../config';
import { LayoutInterno } from '../templates/LayoutInterno';

export function PainelProfessorPage() {
  return (
    <LayoutInterno titulo="Painel do Professor">
      <p>{TEXTOS.paineis.professor}</p>
      <p>{TEXTOS.paineis.professorSemVinculo}</p>
    </LayoutInterno>
  );
}
