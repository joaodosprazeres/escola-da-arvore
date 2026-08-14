/**
 * US4-3, US4-4 — link válido e senha forte redefine e permite entrar; link já usado ou expirado é
 * recusado com oferta de novo pedido (FR-029, FR-031; T088).
 */
import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TEXTOS } from '../../src/config';
import { criarPortasFake } from '../../src/services/fakes';
import { renderizarApp } from './apoio/renderizarApp';
import { entrarComo } from './apoio/interacoes';

describe('US4 — redefinição de senha', () => {
  it('link válido e senha forte redefine e permite entrar com a senha nova', async () => {
    const portas = criarPortasFake({
      usuarios: [
        { email: 'davi@escola.local', nome: 'Davi', senha: 'antiga123', perfis: ['secretaria'] },
      ],
    });
    await portas.auth.solicitarRecuperacao('davi@escola.local');
    const token = portas.estado.links[0]!.token;

    renderizarApp({}, `/redefinir-senha?token_hash=${token}`, { portas });

    const usuario = userEvent.setup();
    await usuario.type(screen.getByLabelText(/^nova senha/i), 'girassol-robusto-77');
    await usuario.type(screen.getByLabelText(/confirmar nova senha/i), 'girassol-robusto-77');
    await usuario.click(screen.getByRole('button', { name: TEXTOS.redefinicao.acaoRedefinir }));

    await waitFor(() => expect(screen.getByText(TEXTOS.redefinicao.sucesso)).toBeInTheDocument());

    await usuario.click(screen.getByRole('link', { name: TEXTOS.entrada.acaoEntrar }));
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Entrar' })).toBeInTheDocument(),
    );

    await entrarComo('davi@escola.local', 'girassol-robusto-77');
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Painel da Secretaria' })).toBeInTheDocument(),
    );
  });

  it('link já usado é recusado, com oferta de solicitar um novo', async () => {
    const portas = criarPortasFake({
      usuarios: [
        { email: 'eva@escola.local', nome: 'Eva', senha: 'antiga123', perfis: ['secretaria'] },
      ],
    });
    await portas.auth.solicitarRecuperacao('eva@escola.local');
    const token = portas.estado.links[0]!.token;
    await portas.auth.redefinirSenhaComLink(token, 'primeira-troca-99');

    renderizarApp({}, `/redefinir-senha?token_hash=${token}`, { portas });

    const usuario = userEvent.setup();
    await usuario.type(screen.getByLabelText(/^nova senha/i), 'segunda-troca-88');
    await usuario.type(screen.getByLabelText(/confirmar nova senha/i), 'segunda-troca-88');
    await usuario.click(screen.getByRole('button', { name: TEXTOS.redefinicao.acaoRedefinir }));

    await waitFor(() =>
      expect(screen.getByText(TEXTOS.errosDeSenha.link_invalido)).toBeInTheDocument(),
    );
    expect(
      screen.getByRole('link', { name: TEXTOS.redefinicao.solicitarNovoLink }),
    ).toBeInTheDocument();
  });

  it('link inexistente é recusado, com oferta de solicitar um novo', async () => {
    renderizarApp({}, '/redefinir-senha?token_hash=token-que-nunca-existiu');

    const usuario = userEvent.setup();
    await usuario.type(screen.getByLabelText(/^nova senha/i), 'terceira-troca-66');
    await usuario.type(screen.getByLabelText(/confirmar nova senha/i), 'terceira-troca-66');
    await usuario.click(screen.getByRole('button', { name: TEXTOS.redefinicao.acaoRedefinir }));

    await waitFor(() =>
      expect(screen.getByText(TEXTOS.errosDeSenha.link_invalido)).toBeInTheDocument(),
    );
    expect(
      screen.getByRole('link', { name: TEXTOS.redefinicao.solicitarNovoLink }),
    ).toBeInTheDocument();
  });
});
