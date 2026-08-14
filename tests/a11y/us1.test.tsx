/**
 * T062 — `axe-core` sobre entrada, os quatro painéis, acesso negado e não encontrada
 * (FR-043 a FR-046; SC-006, SC-007).
 */
import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { entrarComo } from '../integration/apoio/interacoes';
import { renderizarApp } from '../integration/apoio/renderizarApp';
import { rodarAxe } from './apoio/rodarAxe';

const USUARIOS = [
  {
    email: 'admin@escola.local',
    nome: 'Ana',
    senha: 'senha123',
    perfis: ['administrador'] as const,
  },
  { email: 'sec@escola.local', nome: 'Bia', senha: 'senha123', perfis: ['secretaria'] as const },
  {
    email: 'coord@escola.local',
    nome: 'Caio',
    senha: 'senha123',
    perfis: ['coordenacao'] as const,
  },
  {
    email: 'prof@escola.local',
    nome: 'Duda',
    senha: 'senha123',
    perfis: ['professor'] as const,
    professorId: 'p1',
  },
];

describe('US1 — acessibilidade', () => {
  it('tela de entrada não tem violação de WCAG 2.1 AA', async () => {
    renderizarApp({}, '/entrar');
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Entrar' })).toBeInTheDocument(),
    );
    await rodarAxe();
  });

  it('tela de entrada com erro anunciado não tem violação de WCAG 2.1 AA', async () => {
    renderizarApp({}, '/entrar');
    await entrarComo('ninguem@escola.local', 'qualquer');
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    await rodarAxe();
  });

  it.each(USUARIOS)('painel de $perfis.0 não tem violação de WCAG 2.1 AA', async (usuario) => {
    renderizarApp({ usuarios: [usuario], professores: [{ id: 'p1', nome: 'P' }] }, '/entrar');
    await entrarComo(usuario.email, usuario.senha);
    await waitFor(() => expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument());
    await rodarAxe();
  });

  it('acesso negado não tem violação de WCAG 2.1 AA', async () => {
    renderizarApp(
      {
        usuarios: [
          {
            email: 'prof@escola.local',
            nome: 'Duda',
            senha: 'senha123',
            perfis: ['professor'],
            professorId: 'p1',
          },
        ],
        professores: [{ id: 'p1', nome: 'P' }],
      },
      '/usuarios',
      { entrarComo: 'prof@escola.local' },
    );
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Acesso negado' })).toBeInTheDocument(),
    );
    await rodarAxe();
  });

  it('página não encontrada não tem violação de WCAG 2.1 AA', async () => {
    renderizarApp({}, '/rota-que-nao-existe');
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Página não encontrada' })).toBeInTheDocument(),
    );
    await rodarAxe();
  });
});
