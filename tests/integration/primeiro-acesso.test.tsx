/**
 * US2-4, US2-5, US2-6 — entrada com senha temporária cai em `/trocar-senha`; qualquer outra rota
 * devolve para lá; senha fraca é recusada com a lista do que falta; concluída a troca, segue ao
 * painel e o acesso seguinte entra direto (FR-026, FR-027, FR-028; T065).
 */
import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TEXTOS } from '../../src/config';
import { renderizarApp } from './apoio/renderizarApp';
import { entrarComo } from './apoio/interacoes';

function semente() {
  return {
    usuarios: [
      {
        id: 'conta-nova',
        email: 'nova@escola.local',
        nome: 'Helena',
        senha: 'senha-temporaria-1',
        perfis: ['secretaria' as const],
        primeiroAcesso: true,
      },
    ],
  };
}

describe('US2 — primeiro acesso', () => {
  it('entrada com senha temporária cai em /trocar-senha', async () => {
    const app = renderizarApp(semente(), '/entrar');

    await entrarComo('nova@escola.local', 'senha-temporaria-1');

    await waitFor(() => expect(app.localizacao.valor).toBe('/trocar-senha'));
    expect(screen.getByRole('heading', { name: 'Trocar senha' })).toBeInTheDocument();
  });

  it('qualquer outra rota devolve para /trocar-senha enquanto o primeiro acesso está pendente', async () => {
    const app = renderizarApp(semente(), '/painel/secretaria', {
      entrarComo: 'nova@escola.local',
    });

    await waitFor(() => expect(app.localizacao.valor).toBe('/trocar-senha'));
  });

  it('senha fraca é recusada com a lista do que falta', async () => {
    renderizarApp(semente(), '/trocar-senha', { entrarComo: 'nova@escola.local' });

    const usuario = userEvent.setup();
    await usuario.type(screen.getByLabelText(/^nova senha/i), '123');
    await usuario.type(screen.getByLabelText(/confirmar nova senha/i), '123');
    await usuario.click(screen.getByRole('button', { name: TEXTOS.trocaDeSenha.acaoSalvar }));

    await waitFor(() =>
      expect(screen.getByText(TEXTOS.errosDeSenha.senha_fraca)).toBeInTheDocument(),
    );
  });

  it('concluída a troca, segue ao painel — e o acesso seguinte entra direto, sem passar por /trocar-senha', async () => {
    const app = renderizarApp(semente(), '/trocar-senha', { entrarComo: 'nova@escola.local' });

    const usuario = userEvent.setup();
    const senhaForte = 'girassol-robusto-42';
    await usuario.type(screen.getByLabelText(/^nova senha/i), senhaForte);
    await usuario.type(screen.getByLabelText(/confirmar nova senha/i), senhaForte);
    await usuario.click(screen.getByRole('button', { name: TEXTOS.trocaDeSenha.acaoSalvar }));

    await waitFor(() => expect(app.localizacao.valor).toBe('/painel/secretaria'));

    // Acesso seguinte: sai e entra de novo com a senha nova — direto ao painel.
    await usuario.click(screen.getByRole('button', { name: /^sair$/i }));
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Entrar' })).toBeInTheDocument(),
    );

    await entrarComo('nova@escola.local', senhaForte);

    await waitFor(() => expect(app.localizacao.valor).toBe('/painel/secretaria'));
    expect(screen.queryByRole('heading', { name: 'Trocar senha' })).not.toBeInTheDocument();
  });
});
