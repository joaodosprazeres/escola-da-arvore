/**
 * US5-1, US5-3 — bloqueio pede confirmação e reflete na lista; desbloqueio devolve o acesso com a
 * mesma senha (FR-021; T098).
 */
import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TEXTOS } from '../../src/config';
import { renderizarApp } from './apoio/renderizarApp';
import { entrarComo } from './apoio/interacoes';

describe('US5 — bloqueio e desbloqueio', () => {
  it('bloquear pede confirmação explícita e reflete na lista', async () => {
    renderizarApp(
      {
        usuarios: [
          { email: 'admin@escola.local', nome: 'Ana', senha: 's', perfis: ['administrador'] },
          { email: 'gui@escola.local', nome: 'Gui', senha: 's', perfis: ['secretaria'] },
        ],
      },
      '/usuarios',
      { entrarComo: 'admin@escola.local' },
    );

    await waitFor(() => expect(screen.getByText('Gui')).toBeInTheDocument());
    const linha = screen.getByText('Gui').closest('tr')!;

    const usuario = userEvent.setup();
    await usuario.click(within(linha).getByRole('button', { name: TEXTOS.usuarios.acaoBloquear }));

    // Confirmação explícita: o bloqueio ainda não aconteceu até confirmar.
    expect(within(linha).getByText('Ativo')).toBeInTheDocument();
    await usuario.click(within(linha).getByRole('button', { name: TEXTOS.usuarios.confirmar }));

    await waitFor(() => expect(within(linha).getByText('Bloqueado')).toBeInTheDocument());
  });

  it('desbloquear devolve o acesso com a mesma senha', async () => {
    const app = renderizarApp(
      {
        usuarios: [
          { email: 'admin@escola.local', nome: 'Ana', senha: 's', perfis: ['administrador'] },
          {
            email: 'hugo@escola.local',
            nome: 'Hugo',
            senha: 'senha-do-hugo',
            perfis: ['secretaria'],
            situacao: 'bloqueado',
          },
        ],
      },
      '/usuarios',
      { entrarComo: 'admin@escola.local' },
    );

    await waitFor(() => expect(screen.getByText('Hugo')).toBeInTheDocument());
    const linha = screen.getByText('Hugo').closest('tr')!;

    const usuario = userEvent.setup();
    await usuario.click(
      within(linha).getByRole('button', { name: TEXTOS.usuarios.acaoDesbloquear }),
    );
    await usuario.click(within(linha).getByRole('button', { name: TEXTOS.usuarios.confirmar }));

    await waitFor(() => expect(within(linha).getByText('Ativo')).toBeInTheDocument());

    // A mesma senha volta a funcionar — sem redefinição.
    await usuario.click(screen.getByRole('button', { name: /^sair$/i }));
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Entrar' })).toBeInTheDocument(),
    );
    await entrarComo('hugo@escola.local', 'senha-do-hugo');

    await waitFor(() => expect(app.localizacao.valor).toBe('/painel/secretaria'));
  });
});
