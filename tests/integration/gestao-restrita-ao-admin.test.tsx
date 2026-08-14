/**
 * US2-7 — para a Secretaria, `/usuarios` não aparece no menu e o acesso direto cai em
 * `/acesso-negado` (FR-020; T066).
 */
import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { TEXTOS } from '../../src/config';
import { renderizarApp } from './apoio/renderizarApp';

function semente() {
  return {
    usuarios: [
      {
        email: 'secretaria@escola.local',
        nome: 'Íris',
        senha: 'senha123',
        perfis: ['secretaria' as const],
      },
    ],
  };
}

describe('US2 — gestão restrita ao Administrador', () => {
  it('/usuarios não aparece no menu da Secretaria', async () => {
    renderizarApp(semente(), '/painel/secretaria', { entrarComo: 'secretaria@escola.local' });

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Painel da Secretaria' })).toBeInTheDocument(),
    );

    const menu = screen.getByRole('navigation', { name: /menu principal/i });
    expect(within(menu).queryByRole('link', { name: /usuários/i })).not.toBeInTheDocument();
  });

  it('acesso direto a /usuarios cai em /acesso-negado', async () => {
    const app = renderizarApp(semente(), '/usuarios', { entrarComo: 'secretaria@escola.local' });

    await waitFor(() => expect(app.localizacao.valor).toBe('/acesso-negado'));
    expect(screen.getByRole('heading', { name: TEXTOS.acessoNegado.titulo })).toBeInTheDocument();
  });
});
