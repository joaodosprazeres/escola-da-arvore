/**
 * US5-4 — usuário desativado continua visível com o estado e o histórico dele permanece íntegro;
 * não existe exclusão definitiva (FR-022; T099).
 */
import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TEXTOS } from '../../src/config';
import { renderizarApp } from './apoio/renderizarApp';

describe('US5 — desativação', () => {
  it('usuário desativado continua visível na lista, com o estado refletido, sem exclusão definitiva', async () => {
    const app = renderizarApp(
      {
        usuarios: [
          { email: 'admin@escola.local', nome: 'Ana', senha: 's', perfis: ['administrador'] },
          {
            id: 'conta-ines',
            email: 'ines@escola.local',
            nome: 'Inês',
            senha: 's',
            perfis: ['secretaria'],
          },
        ],
      },
      '/usuarios',
      { entrarComo: 'admin@escola.local' },
    );

    await waitFor(() => expect(screen.getByText('Inês')).toBeInTheDocument());
    const linha = screen.getByText('Inês').closest('tr')!;

    const usuario = userEvent.setup();
    await usuario.click(within(linha).getByRole('button', { name: TEXTOS.usuarios.acaoDesativar }));
    await usuario.click(within(linha).getByRole('button', { name: TEXTOS.usuarios.confirmar }));

    await waitFor(() => expect(within(linha).getByText('Desativado')).toBeInTheDocument());

    // Não existe exclusão definitiva: a conta continua no estado do fake.
    const conta = app.portas.estado.contas.find((c) => c.id === 'conta-ines');
    expect(conta).toBeDefined();
    expect(conta?.situacao).toBe('desativado');
  });
});
