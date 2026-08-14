/**
 * T107 — `axe-core` sobre a lista com ações e os diálogos de confirmação (SC-006, SC-007).
 */
import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TEXTOS } from '../../src/config';
import { renderizarApp } from '../integration/apoio/renderizarApp';
import { rodarAxe } from './apoio/rodarAxe';

describe('US5 — acessibilidade', () => {
  it('lista com ações não tem violação de WCAG 2.1 AA', async () => {
    renderizarApp(
      {
        usuarios: [
          { email: 'admin@escola.local', nome: 'Ana', senha: 's', perfis: ['administrador'] },
          { email: 'joel@escola.local', nome: 'Joel', senha: 's', perfis: ['secretaria'] },
        ],
      },
      '/usuarios',
      { entrarComo: 'admin@escola.local' },
    );

    await waitFor(() => expect(screen.getByText('Joel')).toBeInTheDocument());
    await rodarAxe();
  });

  it('diálogo de confirmação não tem violação de WCAG 2.1 AA', async () => {
    renderizarApp(
      {
        usuarios: [
          { email: 'admin@escola.local', nome: 'Ana', senha: 's', perfis: ['administrador'] },
          { email: 'joel@escola.local', nome: 'Joel', senha: 's', perfis: ['secretaria'] },
        ],
      },
      '/usuarios',
      { entrarComo: 'admin@escola.local' },
    );

    await waitFor(() => expect(screen.getByText('Joel')).toBeInTheDocument());
    const linha = screen.getByText('Joel').closest('tr')!;
    const usuario = userEvent.setup();
    await usuario.click(within(linha).getByRole('button', { name: TEXTOS.usuarios.acaoBloquear }));

    await waitFor(() => expect(screen.getByRole('alertdialog')).toBeInTheDocument());
    await rodarAxe();
  });
});
