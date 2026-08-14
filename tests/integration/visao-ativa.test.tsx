/**
 * US1-9, US1-10 — usuário multi-perfil entra direto no painel preferido, alterna em ≤ 2
 * acionamentos, a escolha persiste no acesso seguinte, a alternância não muda permissões
 * (FR-010, FR-012, FR-013; SC-010, SC-011).
 */
import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { entrarComo } from './apoio/interacoes';
import { renderizarApp } from './apoio/renderizarApp';

describe('US1 — visão ativa', () => {
  it('usuário multi-perfil entra direto no painel preferido, sem tela intermediária', async () => {
    const app = renderizarApp(
      {
        usuarios: [
          {
            email: 'multi@escola.local',
            nome: 'Zeca',
            senha: 'senha123',
            perfis: ['coordenacao', 'professor'],
            professorId: 'p1',
            visaoAtiva: 'professor',
          },
        ],
        professores: [{ id: 'p1', nome: 'P' }],
      },
      '/entrar',
    );

    await entrarComo('multi@escola.local', 'senha123');

    await waitFor(() => expect(app.localizacao.valor).toBe('/painel/professor'));
    expect(screen.queryByText(/escolha um perfil/i)).not.toBeInTheDocument();
  });

  it('alterna a visão em até 2 acionamentos e a escolha persiste no acesso seguinte', async () => {
    const app = renderizarApp(
      {
        usuarios: [
          {
            email: 'multi@escola.local',
            nome: 'Zeca',
            senha: 'senha123',
            perfis: ['coordenacao', 'professor'],
            professorId: 'p1',
            visaoAtiva: 'professor',
          },
        ],
        professores: [{ id: 'p1', nome: 'P' }],
      },
      '/entrar',
    );

    await entrarComo('multi@escola.local', 'senha123');
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Painel do Professor' })).toBeInTheDocument(),
    );

    // 2 acionamentos: abrir o seletor e escolher a opção (select nativo conta como 1 gesto por
    // teclado/toque; aqui simulado por selectOptions, que é o equivalente de teste).
    const usuario = userEvent.setup();
    await usuario.selectOptions(screen.getByLabelText(/visão ativa/i), 'coordenacao');

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Painel da Coordenação' })).toBeInTheDocument(),
    );

    // Persiste no acesso seguinte: a conta do fake já guarda `visaoAtiva`.
    const conta = app.portas.estado.contas[0]!;
    expect(conta.visaoAtiva).toBe('coordenacao');
  });

  it('alternar a visão não muda as permissões efetivas — o menu de administração continua fora do alcance do professor', async () => {
    renderizarApp(
      {
        usuarios: [
          {
            email: 'multi@escola.local',
            nome: 'Zeca',
            senha: 'senha123',
            perfis: ['coordenacao', 'professor'],
            professorId: 'p1',
            visaoAtiva: 'professor',
          },
        ],
        professores: [{ id: 'p1', nome: 'P' }],
      },
      '/entrar',
    );

    await entrarComo('multi@escola.local', 'senha123');
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Painel do Professor' })).toBeInTheDocument(),
    );

    const usuario = userEvent.setup();
    await usuario.selectOptions(screen.getByLabelText(/visão ativa/i), 'coordenacao');
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Painel da Coordenação' })).toBeInTheDocument(),
    );

    const menu = screen.getByRole('navigation', { name: /menu principal/i });
    expect(within(menu).queryByRole('link', { name: /usuários/i })).not.toBeInTheDocument();
  });
});
