/**
 * US1-3, US1-4, US1-5 — senha errada e e-mail inexistente são indistinguíveis (FR-002); conta
 * bloqueada ou desativada, mesmo com a senha certa, não entra (FR-003).
 */
import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { TEXTOS } from '../../src/config';
import { renderizarApp } from './apoio/renderizarApp';
import { entrarComo } from './apoio/interacoes';

describe('US1 — entrada negada', () => {
  it('e-mail inexistente e senha errada mostram exatamente o mesmo aviso', async () => {
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
      '/entrar',
    );

    await entrarComo('desconhecido@escola.local', 'qualquer');

    await waitFor(() =>
      expect(screen.getByText(TEXTOS.errosDeEntrada.credenciais_invalidas)).toBeInTheDocument(),
    );
  });

  it('e-mail existente com senha errada mostra o mesmo texto de credenciais inválidas', async () => {
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
      '/entrar',
    );

    await entrarComo('admin@escola.local', 'senha-errada');

    await waitFor(() =>
      expect(screen.getByText(TEXTOS.errosDeEntrada.credenciais_invalidas)).toBeInTheDocument(),
    );
  });

  it('conta bloqueada com a senha certa orienta a procurar a secretaria, sem entrar', async () => {
    renderizarApp(
      {
        usuarios: [
          {
            email: 'bloqueado@escola.local',
            nome: 'Bia',
            senha: 'senha123',
            perfis: ['secretaria'],
            situacao: 'bloqueado',
          },
        ],
      },
      '/entrar',
    );

    await entrarComo('bloqueado@escola.local', 'senha123');

    await waitFor(() =>
      expect(screen.getByText(TEXTOS.errosDeEntrada.conta_indisponivel)).toBeInTheDocument(),
    );
    expect(screen.getByRole('heading', { name: 'Entrar' })).toBeInTheDocument();
  });

  it('conta desativada com a senha certa orienta a procurar a secretaria, sem entrar', async () => {
    renderizarApp(
      {
        usuarios: [
          {
            email: 'ex@escola.local',
            nome: 'Cid',
            senha: 'senha123',
            perfis: ['professor'],
            professorId: 'p1',
            situacao: 'desativado',
          },
        ],
        professores: [{ id: 'p1', nome: 'P' }],
      },
      '/entrar',
    );

    await entrarComo('ex@escola.local', 'senha123');

    await waitFor(() =>
      expect(screen.getByText(TEXTOS.errosDeEntrada.conta_indisponivel)).toBeInTheDocument(),
    );
  });
});
