/**
 * US1-1, US1-2, US1-6, US1-8 — entrada por e-mail e senha, painel da visão ativa com menu
 * limitado, saída efetiva (FR-005, FR-006, FR-011, FR-014).
 */
import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TEXTOS } from '../../src/config';
import { renderizarApp } from './apoio/renderizarApp';
import { entrarComo } from './apoio/interacoes';

describe('US1 — entrada e painel', () => {
  it('rota interna sem sessão redireciona para /entrar com o destino', async () => {
    const app = renderizarApp({}, '/painel/administrador');

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Entrar' })).toBeInTheDocument(),
    );
    expect(app.localizacao.valor).toBe('/entrar?destino=%2Fpainel%2Fadministrador');
  });

  it('credencial válida chega ao painel da visão ativa com o menu da visão, não a união dos perfis', async () => {
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

    await entrarComo('admin@escola.local', 'senha123');

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Painel do Administrador' })).toBeInTheDocument(),
    );
    expect(screen.getByText(TEXTOS.layout.saudacao.replace('{nome}', 'Ana'))).toBeInTheDocument();

    const menu = screen.getByRole('navigation', { name: TEXTOS.layout.rotuloMenu });
    expect(within(menu).getByRole('link', { name: /usuários/i })).toBeInTheDocument();
    expect(within(menu).getByRole('link', { name: /histórico de ações/i })).toBeInTheDocument();
  });

  it('menu de quem só tem um perfil fica limitado a esse perfil, nunca à união', async () => {
    renderizarApp(
      {
        usuarios: [
          { email: 'sec@escola.local', nome: 'Bia', senha: 'senha123', perfis: ['secretaria'] },
        ],
      },
      '/entrar',
    );

    await entrarComo('sec@escola.local', 'senha123');

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Painel da Secretaria' })).toBeInTheDocument(),
    );

    const menu = screen.getByRole('navigation', { name: TEXTOS.layout.rotuloMenu });
    expect(within(menu).queryByRole('link', { name: /usuários/i })).not.toBeInTheDocument();
    expect(
      within(menu).queryByRole('link', { name: /histórico de ações/i }),
    ).not.toBeInTheDocument();
  });

  it('sair encerra a sessão e devolve a /entrar', async () => {
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

    await entrarComo('admin@escola.local', 'senha123');
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Painel do Administrador' })).toBeInTheDocument(),
    );

    const usuario = userEvent.setup();
    await usuario.click(screen.getByRole('button', { name: TEXTOS.layout.acaoSair }));

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Entrar' })).toBeInTheDocument(),
    );
  });
});
