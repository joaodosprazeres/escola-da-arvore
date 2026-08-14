/**
 * Renderiza a árvore real de rotas (`src/rotas.tsx`) sobre o fake in-memory das portas — o mesmo
 * princípio de `main.tsx`, trocando `BrowserRouter` por `MemoryRouter` (Princípio VIII).
 *
 * Expõe `localizacao` para os testes lerem o caminho atual sem depender de texto de tela — útil
 * quando o que se prova é o redirecionamento em si, não o conteúdo da página de destino.
 */
import { useEffect } from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter, useLocation, useRoutes } from 'react-router-dom';
import { LazyMotion, MotionConfig, domAnimation } from 'motion/react';
import { PortasProvider } from '../../../src/services/PortasProvider';
import { criarPortasFake } from '../../../src/services/fakes';
import type { PortasFake } from '../../../src/services/fakes';
import { contaPorEmail, ressincronizarSessao } from '../../../src/services/fakes/estado';
import type { SementeDoFake } from '../../../src/services/fakes/estado';
import { rotasDaAplicacao } from '../../../src/rotas';

function App() {
  return useRoutes(rotasDaAplicacao);
}

function Sonda({ localizacao }: { localizacao: { valor: string } }) {
  const location = useLocation();

  useEffect(() => {
    localizacao.valor = location.pathname + location.search;
  }, [localizacao, location.pathname, location.search]);

  return null;
}

export interface AppRenderizado {
  readonly portas: PortasFake;
  /** `.valor` é atualizado a cada troca de rota — leia depois de um `waitFor`. */
  readonly localizacao: { valor: string };
}

export interface OpcoesDeRenderizacao {
  /** Pré-autentica a sessão com esta conta antes do primeiro render (pula o formulário de entrada). */
  readonly entrarComo?: string;
  /** Reaproveita um `PortasFake` já preparado (ex.: um link de recuperação gerado antes do render). */
  readonly portas?: PortasFake;
}

export function renderizarApp(
  semente: SementeDoFake = {},
  caminhoInicial = '/',
  opcoes: OpcoesDeRenderizacao = {},
): AppRenderizado {
  const portas = opcoes.portas ?? criarPortasFake(semente);
  const localizacao = { valor: caminhoInicial };

  if (opcoes.entrarComo !== undefined) {
    const conta = contaPorEmail(portas.estado, opcoes.entrarComo);
    if (conta === undefined) {
      throw new Error(`renderizarApp: nenhuma conta semeada com o e-mail ${opcoes.entrarComo}.`);
    }
    portas.estado.contaDaSessao = conta.id;
    ressincronizarSessao(portas.estado);
  }

  render(
    <PortasProvider portas={portas}>
      <MemoryRouter initialEntries={[caminhoInicial]}>
        <LazyMotion features={domAnimation}>
          <MotionConfig reducedMotion="user">
            <Sonda localizacao={localizacao} />
            <App />
          </MotionConfig>
        </LazyMotion>
      </MemoryRouter>
    </PortasProvider>,
  );

  return { portas, localizacao };
}
