/**
 * US5-5 — bloquear, desativar ou rebaixar o último Administrador ativo é recusado com explicação,
 * inclusive contra si mesmo (FR-023, INV-3; T100).
 */
import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TEXTOS } from '../../src/config';
import { renderizarApp } from './apoio/renderizarApp';

describe('US5 — proteção do último administrador', () => {
  it('bloquear o único administrador ativo é recusado, inclusive contra si mesmo', async () => {
    renderizarApp(
      {
        usuarios: [
          {
            id: 'unico-admin',
            email: 'admin@escola.local',
            nome: 'Ana',
            senha: 's',
            perfis: ['administrador'],
          },
        ],
      },
      '/usuarios',
      { entrarComo: 'admin@escola.local' },
    );

    await waitFor(() => expect(screen.getByText('Ana')).toBeInTheDocument());
    const linha = screen.getByText('Ana').closest('tr')!;

    const usuario = userEvent.setup();
    await usuario.click(within(linha).getByRole('button', { name: TEXTOS.usuarios.acaoBloquear }));
    await usuario.click(within(linha).getByRole('button', { name: TEXTOS.usuarios.confirmar }));

    await waitFor(() =>
      expect(
        within(linha).getByText(TEXTOS.errosDeGestao.ultimo_administrador),
      ).toBeInTheDocument(),
    );
    expect(within(linha).getByText('Ativo')).toBeInTheDocument();
  });

  it('desativar o único administrador ativo é recusado com explicação', async () => {
    renderizarApp(
      {
        usuarios: [
          {
            id: 'unico-admin',
            email: 'admin@escola.local',
            nome: 'Ana',
            senha: 's',
            perfis: ['administrador'],
          },
        ],
      },
      '/usuarios',
      { entrarComo: 'admin@escola.local' },
    );

    await waitFor(() => expect(screen.getByText('Ana')).toBeInTheDocument());
    const linha = screen.getByText('Ana').closest('tr')!;

    const usuario = userEvent.setup();
    await usuario.click(within(linha).getByRole('button', { name: TEXTOS.usuarios.acaoDesativar }));
    await usuario.click(within(linha).getByRole('button', { name: TEXTOS.usuarios.confirmar }));

    await waitFor(() =>
      expect(
        within(linha).getByText(TEXTOS.errosDeGestao.ultimo_administrador),
      ).toBeInTheDocument(),
    );
    expect(within(linha).getByText('Ativo')).toBeInTheDocument();
  });

  it('rebaixar o último administrador (remover o perfil) é recusado', async () => {
    const app = renderizarApp(
      {
        usuarios: [
          {
            id: 'unico-admin',
            email: 'admin@escola.local',
            nome: 'Ana',
            senha: 's',
            perfis: ['administrador'],
          },
        ],
      },
      '/usuarios',
      { entrarComo: 'admin@escola.local' },
    );

    await waitFor(() => expect(screen.getByText('Ana')).toBeInTheDocument());

    const resultado = await app.portas.usuarios.definirPerfis('unico-admin', ['secretaria']);

    expect(resultado.ok).toBe(false);
    expect(!resultado.ok && resultado.erro.codigo).toBe('ultimo_administrador');
  });
});
