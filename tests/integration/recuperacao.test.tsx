/**
 * US4-1, US4-2, US4-5 — e-mail cadastrado e não cadastrado produzem a mesma confirmação; conta
 * bloqueada ou desativada também; nenhuma mensagem é enviada nos dois últimos casos (FR-030; T087).
 */
import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TEXTOS } from '../../src/config';
import { renderizarApp } from './apoio/renderizarApp';

async function solicitar(email: string): Promise<void> {
  const usuario = userEvent.setup();
  await usuario.type(screen.getByLabelText(/^e-mail/i), email);
  await usuario.click(screen.getByRole('button', { name: TEXTOS.recuperacao.acaoEnviar }));
}

describe('US4 — recuperação de senha', () => {
  it('e-mail cadastrado mostra a confirmação genérica e gera o link', async () => {
    const app = renderizarApp(
      {
        usuarios: [{ email: 'ana@escola.local', nome: 'Ana', senha: 's', perfis: ['secretaria'] }],
      },
      '/esqueci-senha',
    );
    await solicitar('ana@escola.local');
    await waitFor(() =>
      expect(screen.getByText(TEXTOS.recuperacao.confirmacaoGenerica)).toBeInTheDocument(),
    );
    expect(app.portas.estado.links).toHaveLength(1);
  });

  it('e-mail não cadastrado mostra exatamente a mesma confirmação, sem gerar link', async () => {
    const app = renderizarApp({}, '/esqueci-senha');
    await solicitar('desconhecido@escola.local');
    await waitFor(() =>
      expect(screen.getByText(TEXTOS.recuperacao.confirmacaoGenerica)).toBeInTheDocument(),
    );
    expect(app.portas.estado.links).toHaveLength(0);
  });

  it('conta bloqueada mostra a mesma confirmação, sem enviar mensagem', async () => {
    const app = renderizarApp(
      {
        usuarios: [
          {
            email: 'bloqueado@escola.local',
            nome: 'Bia',
            senha: 's',
            perfis: ['secretaria'],
            situacao: 'bloqueado',
          },
        ],
      },
      '/esqueci-senha',
    );

    await solicitar('bloqueado@escola.local');

    await waitFor(() =>
      expect(screen.getByText(TEXTOS.recuperacao.confirmacaoGenerica)).toBeInTheDocument(),
    );
    expect(app.portas.estado.links).toHaveLength(0);
  });

  it('conta desativada mostra a mesma confirmação, sem enviar mensagem', async () => {
    const app = renderizarApp(
      {
        usuarios: [
          {
            email: 'ex@escola.local',
            nome: 'Cid',
            senha: 's',
            perfis: ['secretaria'],
            situacao: 'desativado',
          },
        ],
      },
      '/esqueci-senha',
    );

    await solicitar('ex@escola.local');

    await waitFor(() =>
      expect(screen.getByText(TEXTOS.recuperacao.confirmacaoGenerica)).toBeInTheDocument(),
    );
    expect(app.portas.estado.links).toHaveLength(0);
  });
});
