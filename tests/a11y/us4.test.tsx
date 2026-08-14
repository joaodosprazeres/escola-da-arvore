/**
 * T097 — `axe-core` sobre esqueci-senha e redefinir-senha (SC-006, SC-007).
 */
import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { TEXTOS } from '../../src/config';
import { criarPortasFake } from '../../src/services/fakes';
import { renderizarApp } from '../integration/apoio/renderizarApp';
import { rodarAxe } from './apoio/rodarAxe';

describe('US4 — acessibilidade', () => {
  it('esqueci minha senha não tem violação de WCAG 2.1 AA', async () => {
    renderizarApp({}, '/esqueci-senha');
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: TEXTOS.recuperacao.titulo })).toBeInTheDocument(),
    );
    await rodarAxe();
  });

  it('redefinir senha não tem violação de WCAG 2.1 AA', async () => {
    const portas = criarPortasFake({
      usuarios: [
        { email: 'flavia@escola.local', nome: 'Flávia', senha: 's', perfis: ['secretaria'] },
      ],
    });
    await portas.auth.solicitarRecuperacao('flavia@escola.local');
    const token = portas.estado.links[0]!.token;

    renderizarApp({}, `/redefinir-senha?token_hash=${token}`, { portas });

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: TEXTOS.redefinicao.titulo })).toBeInTheDocument(),
    );
    await rodarAxe();
  });

  it('link inválido não tem violação de WCAG 2.1 AA', async () => {
    renderizarApp({}, '/redefinir-senha?token_hash=inexistente');
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: TEXTOS.redefinicao.titulo })).toBeInTheDocument(),
    );
    await rodarAxe();
  });
});
