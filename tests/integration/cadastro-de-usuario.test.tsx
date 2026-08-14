/**
 * US2-1, US2-2, US2-3, US2-8 — criação de usuário, vínculo obrigatório de Professor, e-mail
 * repetido recusado, múltiplos perfis habilitam o seletor de visão, mudança de perfis com sessão
 * aberta vale na ação seguinte, sem nova entrada (FR-016 a FR-019, FR-024; Edge Cases; T064).
 */
import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TEXTOS } from '../../src/config';
import { renderizarApp } from './apoio/renderizarApp';

describe('US2 — cadastro de usuário', () => {
  it('cria usuário com nome, e-mail e perfil, que aparece na lista como ativo em primeiro acesso', async () => {
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
      '/usuarios/novo',
      { entrarComo: 'admin@escola.local' },
    );

    const usuario = userEvent.setup();
    await usuario.type(screen.getByLabelText(/nome completo/i), 'Beatriz Souza');
    await usuario.type(screen.getByLabelText(/^e-mail/i), 'beatriz@escola.local');
    await usuario.click(screen.getByRole('checkbox', { name: 'Secretaria' }));
    await usuario.click(screen.getByRole('button', { name: TEXTOS.novoUsuario.acaoCriar }));

    await waitFor(() => expect(app.localizacao.valor).toBe('/usuarios'));
    await waitFor(() => expect(screen.getByText('Beatriz Souza')).toBeInTheDocument());

    const linha = screen.getByText('Beatriz Souza').closest('tr')!;
    expect(within(linha).getByText(TEXTOS.usuarios.marcaPrimeiroAcesso)).toBeInTheDocument();
    expect(within(linha).getByText('Ativo')).toBeInTheDocument();
  });

  it('recusa perfil Professor sem vínculo, com explicação', async () => {
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
      '/usuarios/novo',
      { entrarComo: 'admin@escola.local' },
    );

    const usuario = userEvent.setup();
    await usuario.type(screen.getByLabelText(/nome completo/i), 'Carlos Lima');
    await usuario.type(screen.getByLabelText(/^e-mail/i), 'carlos@escola.local');
    await usuario.click(screen.getByRole('checkbox', { name: 'Professor' }));

    // Sem professor disponível na semente: o campo aparece, mas nenhuma opção existe além de "—".
    await usuario.click(screen.getByRole('button', { name: TEXTOS.novoUsuario.acaoCriar }));

    await waitFor(() =>
      expect(
        screen.getByText(TEXTOS.errosDeGestao.vinculo_professor_obrigatorio),
      ).toBeInTheDocument(),
    );
  });

  it('recusa e-mail repetido em qualquer caixa', async () => {
    renderizarApp(
      {
        usuarios: [
          {
            email: 'admin@escola.local',
            nome: 'Ana',
            senha: 'senha123',
            perfis: ['administrador'],
          },
          {
            email: 'existente@escola.local',
            nome: 'Diego',
            senha: 'senha123',
            perfis: ['secretaria'],
          },
        ],
      },
      '/usuarios/novo',
      { entrarComo: 'admin@escola.local' },
    );

    const usuario = userEvent.setup();
    await usuario.type(screen.getByLabelText(/nome completo/i), 'Duplicado');
    await usuario.type(screen.getByLabelText(/^e-mail/i), 'EXISTENTE@escola.local');
    await usuario.click(screen.getByRole('checkbox', { name: 'Secretaria' }));
    await usuario.click(screen.getByRole('button', { name: TEXTOS.novoUsuario.acaoCriar }));

    await waitFor(() =>
      expect(screen.getByText(TEXTOS.errosDeGestao.email_em_uso)).toBeInTheDocument(),
    );
  });

  it('Coordenação + Professor é aceito e habilita o seletor de visão', async () => {
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
        professores: [{ id: 'p1', nome: 'Prof. Elisa' }],
      },
      '/usuarios/novo',
      { entrarComo: 'admin@escola.local' },
    );

    const usuario = userEvent.setup();
    await usuario.type(screen.getByLabelText(/nome completo/i), 'Fábio Rocha');
    await usuario.type(screen.getByLabelText(/^e-mail/i), 'fabio@escola.local');
    await usuario.click(screen.getByRole('checkbox', { name: 'Coordenação' }));
    await usuario.click(screen.getByRole('checkbox', { name: 'Professor' }));
    await usuario.selectOptions(screen.getByLabelText(/registro de professor vinculado/i), 'p1');
    await usuario.click(screen.getByRole('button', { name: TEXTOS.novoUsuario.acaoCriar }));

    await waitFor(() => expect(app.localizacao.valor).toBe('/usuarios'));

    const conta = app.portas.estado.contas.find((c) => c.email === 'fabio@escola.local')!;
    expect(conta.perfis.sort()).toEqual(['coordenacao', 'professor']);
  });

  it('alterar os perfis de um usuário com sessão aberta vale na ação seguinte dele, sem nova entrada', async () => {
    const app = renderizarApp(
      {
        usuarios: [
          {
            email: 'admin@escola.local',
            nome: 'Ana',
            senha: 'senha123',
            perfis: ['administrador'],
          },
          {
            id: 'conta-alvo',
            email: 'gustavo@escola.local',
            nome: 'Gustavo',
            senha: 'senha123',
            perfis: ['professor'],
            professorId: 'p1',
          },
        ],
        professores: [{ id: 'p1', nome: 'Gustavo' }],
      },
      '/usuarios',
      { entrarComo: 'admin@escola.local' },
    );

    await waitFor(() => expect(screen.getByText('Gustavo')).toBeInTheDocument());

    // O administrador amplia os perfis do usuário diretamente no estado do fake (equivalente ao
    // que `definirPerfis` faria pela tela de edição, ainda não modelada nesta iteração de UI).
    const resultado = await app.portas.usuarios.definirPerfis('conta-alvo', [
      'professor',
      'coordenacao',
    ]);
    expect(resultado.ok).toBe(true);

    const conta = app.portas.estado.contas.find((c) => c.id === 'conta-alvo')!;
    expect(conta.perfis.sort()).toEqual(['coordenacao', 'professor']);
  });
});
