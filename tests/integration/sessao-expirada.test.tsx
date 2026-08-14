/**
 * US1-7 — sessão expirada por inatividade volta a /entrar com aviso; saída em uma aba encerra a
 * outra na ação seguinte (FR-005, FR-007; Edge Cases da spec 001).
 */
import { describe, expect, it } from 'vitest';
import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { criarPortasFake } from '../../src/services/fakes';
import { criarSessionStore } from '../../src/services/auth/criarSessionStore';
import { contaPorEmail, emitir, ressincronizarSessao } from '../../src/services/fakes/estado';
import { TEXTOS } from '../../src/config';
import { entrarComo } from './apoio/interacoes';
import { renderizarApp } from './apoio/renderizarApp';

describe('US1 — sessão expirada', () => {
  it('sessão encerrada pelo servidor (sem ação do usuário) devolve a /entrar com o aviso de expiração', async () => {
    const app = renderizarApp(
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

    // Simula o servidor derrubando a sessão (inatividade / limite absoluto) — nenhum componente
    // pediu a saída, então não é `marcarSaidaIntencional()`.
    act(() => {
      app.portas.estado.contaDaSessao = null;
      emitir(app.portas.estado, { status: 'anonimo' });
    });

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Entrar' })).toBeInTheDocument(),
    );
    expect(screen.getByText(TEXTOS.entrada.avisoSessaoExpirada)).toBeInTheDocument();
  });

  it('saída pedida pelo usuário mostra a confirmação de saída, não o aviso de expiração', async () => {
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
    expect(screen.getByText(TEXTOS.entrada.avisoSaidaConcluida)).toBeInTheDocument();
    expect(screen.queryByText(TEXTOS.entrada.avisoSessaoExpirada)).not.toBeInTheDocument();
  });

  it('saída em uma aba encerra a outra na ação seguinte', async () => {
    const semente = {
      usuarios: [
        {
          email: 'admin@escola.local',
          nome: 'Ana',
          senha: 'senha123',
          perfis: ['administrador'] as const,
        },
      ],
    };

    // As duas "abas" compartilham o mesmo backend (estado do fake) — cada uma com seu próprio
    // AuthPort e store, como duas instâncias reais do adaptador apontando para o mesmo projeto.
    const abaA = criarPortasFake(semente);
    const conta = contaPorEmail(abaA.estado, 'admin@escola.local')!;
    abaA.estado.contaDaSessao = conta.id;
    ressincronizarSessao(abaA.estado);

    const storeDaAbaB = criarSessionStore(abaA.auth);
    expect(storeDaAbaB.getSnapshot().status).toBe('autenticado');

    await abaA.auth.sair();

    expect(storeDaAbaB.getSnapshot().status).toBe('anonimo');
  });
});
