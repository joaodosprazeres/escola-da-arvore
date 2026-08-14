/**
 * T115 — `axe-core` sobre o histórico e seus filtros (SC-006, SC-007).
 */
import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { TEXTOS } from '../../src/config';
import { criarPortasFake } from '../../src/services/fakes';
import { renderizarApp } from '../integration/apoio/renderizarApp';
import { rodarAxe } from './apoio/rodarAxe';

describe('US6 — acessibilidade', () => {
  it('histórico de ações não tem violação de WCAG 2.1 AA', async () => {
    const portas = criarPortasFake({
      usuarios: [
        {
          id: 'admin',
          email: 'admin@escola.local',
          nome: 'Ana',
          senha: 's',
          perfis: ['administrador'],
        },
        { id: 'alvo', email: 'p@escola.local', nome: 'Pilar', senha: 's', perfis: ['secretaria'] },
      ],
    });
    portas.estado.contaDaSessao = 'admin';
    await portas.usuarios.bloquear('alvo');

    renderizarApp({}, '/auditoria', { portas, entrarComo: 'admin@escola.local' });

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: TEXTOS.auditoria.titulo })).toBeInTheDocument(),
    );
    const tabela = await screen.findByRole('table');
    await waitFor(() => expect(within(tabela).getByText('Pilar')).toBeInTheDocument());
    await rodarAxe();
  });
});
