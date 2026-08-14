/**
 * T078 — `axe-core` sobre lista de usuários, novo usuário e troca de senha (SC-006, SC-007).
 */
import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { TEXTOS } from '../../src/config';
import { renderizarApp } from '../integration/apoio/renderizarApp';
import { rodarAxe } from './apoio/rodarAxe';

describe('US2 — acessibilidade', () => {
  it('lista de usuários não tem violação de WCAG 2.1 AA', async () => {
    renderizarApp(
      {
        usuarios: [
          {
            email: 'admin@escola.local',
            nome: 'Ana',
            senha: 'senha123',
            perfis: ['administrador'],
          },
          { email: 'sec@escola.local', nome: 'Bia', senha: 'senha123', perfis: ['secretaria'] },
        ],
      },
      '/usuarios',
      { entrarComo: 'admin@escola.local' },
    );

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: TEXTOS.usuarios.titulo })).toBeInTheDocument(),
    );
    await waitFor(() => expect(screen.getByText('Bia')).toBeInTheDocument());
    await rodarAxe();
  });

  it('novo usuário não tem violação de WCAG 2.1 AA', async () => {
    renderizarApp(
      {
        usuarios: [
          {
            email: 'admin@escola.local',
            nome: 'Ana',
            senha: 'senha123',
            perfis: ['administrador'],
          },
        ],
      },
      '/usuarios/novo',
      { entrarComo: 'admin@escola.local' },
    );

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: TEXTOS.novoUsuario.titulo })).toBeInTheDocument(),
    );
    await rodarAxe();
  });

  it('troca de senha não tem violação de WCAG 2.1 AA', async () => {
    renderizarApp(
      {
        usuarios: [
          {
            email: 'nova@escola.local',
            nome: 'Helena',
            senha: 'temporaria',
            perfis: ['secretaria'],
            primeiroAcesso: true,
          },
        ],
      },
      '/trocar-senha',
      { entrarComo: 'nova@escola.local' },
    );

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: TEXTOS.trocaDeSenha.titulo })).toBeInTheDocument(),
    );
    await rodarAxe();
  });
});
