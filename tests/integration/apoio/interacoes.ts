/**
 * Interações repetidas entre os testes de integração de US1/US2.
 */
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

export async function entrarComo(email: string, senha: string): Promise<void> {
  const usuario = userEvent.setup();

  await usuario.type(screen.getByLabelText(/e-mail/i), email);
  await usuario.type(screen.getByLabelText(/^senha/i), senha);
  await usuario.click(screen.getByRole('button', { name: /^entrar$/i }));
}
