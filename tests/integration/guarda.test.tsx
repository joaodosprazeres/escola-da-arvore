/**
 * `Guarda` — ordem de decisão de 6 passos (`contracts/rls-e-rotas.md` §B.1). Cada teste de par
 * adjacente prova que a ordem importa: as duas condições valem ao mesmo tempo e só a ordem certa
 * decide o destino.
 */
import { describe, expect, it } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Guarda } from '../../src/components/templates/Guarda';
import { PortasProvider } from '../../src/services/PortasProvider';
import type { Portas } from '../../src/services/portas';
import type { AuthPort } from '../../src/services/auth/types';
import type { UsuariosPort } from '../../src/services/usuarios/types';
import type { AuditoriaPort } from '../../src/services/auditoria/types';
import type { EstadoDaSessao } from '../../src/types';
import { ressincronizarSessao } from '../../src/services/fakes/estado';
import { TEXTOS } from '../../src/config';
import { renderizarApp } from './apoio/renderizarApp';
import { entrarComo } from './apoio/interacoes';

function portasComEstadoFixo(estado: EstadoDaSessao): Portas {
  return {
    auth: {
      obterEstado: () => estado,
      aoMudarSessao: () => () => {},
    } as unknown as AuthPort,
    usuarios: {} as UsuariosPort,
    auditoria: {} as AuditoriaPort,
    sessao: { subscribe: () => () => {}, getSnapshot: () => estado },
  };
}

describe('Guarda — passo 1 (carregando)', () => {
  it('mostra placeholder acessível e não decide nada enquanto a sessão carrega', () => {
    const portas = portasComEstadoFixo({ status: 'carregando' });

    render(
      <PortasProvider portas={portas}>
        <MemoryRouter initialEntries={['/painel/administrador']}>
          <Routes>
            <Route element={<Guarda />}>
              <Route path="/painel/administrador" element={<div>Painel</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </PortasProvider>,
    );

    expect(screen.getByText(TEXTOS.layout.carregando)).toBeInTheDocument();
    expect(screen.queryByText('Painel')).not.toBeInTheDocument();
  });
});

describe('Guarda — passo 2 (não autenticado em rota interna)', () => {
  it('redireciona para /entrar com o destino codificado', async () => {
    const app = renderizarApp({}, '/painel/administrador');

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Entrar' })).toBeInTheDocument(),
    );
    expect(app.localizacao.valor).toBe('/entrar?destino=%2Fpainel%2Fadministrador');
  });

  it('passo 2 antes do passo 3: anônimo visitando /trocar-senha vai para /entrar, não fica lá', async () => {
    const app = renderizarApp({}, '/trocar-senha');

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Entrar' })).toBeInTheDocument(),
    );
    expect(app.localizacao.valor).toContain('/entrar');
  });
});

describe('Guarda — passo 3 (primeiro acesso absorve navegação)', () => {
  it('redireciona qualquer rota interna para /trocar-senha', async () => {
    renderizarApp(
      {
        usuarios: [
          {
            email: 'novo@escola.local',
            nome: 'Teste',
            senha: 'temp',
            perfis: ['professor'],
            professorId: 'p1',
            primeiroAcesso: true,
          },
        ],
        professores: [{ id: 'p1', nome: 'P' }],
      },
      '/entrar',
    );

    await entrarComo('novo@escola.local', 'temp');

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: TEXTOS.trocaDeSenha.titulo })).toBeInTheDocument(),
    );
  });

  it('passo 3 antes do passo 4: primeiro acesso vence mesmo em rota que o perfil não alcança', async () => {
    renderizarApp(
      {
        usuarios: [
          {
            email: 'novo@escola.local',
            nome: 'Teste',
            senha: 'temp',
            perfis: ['professor'],
            professorId: 'p1',
            primeiroAcesso: true,
          },
        ],
        professores: [{ id: 'p1', nome: 'P' }],
      },
      '/usuarios',
    );

    // A sessão nasce anônima: entra primeiro, depois a navegação cai sob o primeiro acesso.
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Entrar' })).toBeInTheDocument(),
    );
    await entrarComo('novo@escola.local', 'temp');

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: TEXTOS.trocaDeSenha.titulo })).toBeInTheDocument(),
    );
    expect(
      screen.queryByRole('heading', { name: TEXTOS.acessoNegado.titulo }),
    ).not.toBeInTheDocument();
  });
});

describe('Guarda — passo 4 (permissões efetivas)', () => {
  it('rota exige perfil ausente → acesso negado', async () => {
    // Link direto a uma URL fora do alcance com a sessão já aberta — o formulário de entrada
    // nunca ofereceria este destino (ele mesmo o filtra), então a sessão nasce autenticada aqui.
    renderizarApp(
      {
        usuarios: [
          {
            email: 'prof@escola.local',
            nome: 'Teste',
            senha: 'senha123',
            perfis: ['professor'],
            professorId: 'p1',
          },
        ],
        professores: [{ id: 'p1', nome: 'P' }],
      },
      '/usuarios',
      { entrarComo: 'prof@escola.local' },
    );

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: TEXTOS.acessoNegado.titulo })).toBeInTheDocument(),
    );
  });
});

describe('Guarda — passo 5 (autenticado em rota só para anônimos)', () => {
  it('visitar /entrar já autenticado leva ao painel da visão ativa', async () => {
    const app = renderizarApp(
      {
        usuarios: [
          {
            email: 'admin@escola.local',
            nome: 'Teste',
            senha: 'senha123',
            perfis: ['administrador'],
          },
        ],
      },
      '/entrar',
    );

    await entrarComo('admin@escola.local', 'senha123');

    await waitFor(() => expect(app.localizacao.valor).toBe('/painel/administrador'));
  });

  it('passo 5 só vale para rota anônima nomeada: página não encontrada não redireciona', async () => {
    renderizarApp(
      {
        usuarios: [
          {
            email: 'admin@escola.local',
            nome: 'Teste',
            senha: 'senha123',
            perfis: ['administrador'],
          },
        ],
      },
      '/rota-que-nao-existe',
    );

    await waitFor(() =>
      expect(
        screen.getByRole('heading', { name: TEXTOS.naoEncontrada.titulo }),
      ).toBeInTheDocument(),
    );
  });
});

describe('Guarda — passo 6 (segue)', () => {
  it('rota permitida e sessão pronta renderiza a página', async () => {
    renderizarApp(
      {
        usuarios: [
          {
            email: 'admin@escola.local',
            nome: 'Teste',
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
  });
});

describe('Guarda — FR-016 (perfis mudam com a sessão aberta)', () => {
  it('visão ativa reajustada mostra aviso visível, nunca silencioso', async () => {
    const app = renderizarApp(
      {
        usuarios: [
          {
            email: 'coord@escola.local',
            nome: 'Teste',
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

    await entrarComo('coord@escola.local', 'senha123');
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Painel do Professor' })).toBeInTheDocument(),
    );

    const conta = app.portas.estado.contas[0]!;
    conta.perfis = ['coordenacao'];
    conta.visaoAtiva = 'coordenacao';
    act(() => {
      ressincronizarSessao(app.portas.estado);
    });

    await waitFor(() => expect(screen.getByText(/passou a ser Coordenação/)).toBeInTheDocument());
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Painel da Coordenação' })).toBeInTheDocument(),
    );
  });

  it('perfil algum restante encerra a sessão', async () => {
    const app = renderizarApp(
      {
        usuarios: [
          {
            email: 'coord@escola.local',
            nome: 'Teste',
            senha: 'senha123',
            perfis: ['coordenacao'],
          },
        ],
      },
      '/entrar',
    );

    await entrarComo('coord@escola.local', 'senha123');
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Painel da Coordenação' })).toBeInTheDocument(),
    );

    const conta = app.portas.estado.contas[0]!;
    conta.perfis = [];
    act(() => {
      ressincronizarSessao(app.portas.estado);
    });

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Entrar' })).toBeInTheDocument(),
    );
  });
});
