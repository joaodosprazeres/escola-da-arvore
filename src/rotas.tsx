/**
 * Traduz a tabela de dados de `config.ts` para o array de `useRoutes()` (R-04) — único lugar que
 * conhece `react-router-dom` E os componentes de página. Compartilhado por `main.tsx` e pelos
 * testes de integração, para que ambos exerçam exatamente a mesma árvore de rotas.
 */
import type { RouteObject } from 'react-router-dom';
import { ROTAS } from './config';
import type { NomeDePagina } from './types';
import { Guarda } from './components/templates/Guarda';
import { EntrarPage } from './components/pages/EntrarPage';
import { EsqueciSenhaPage } from './components/pages/EsqueciSenhaPage';
import { RedefinirSenhaPage } from './components/pages/RedefinirSenhaPage';
import { TrocarSenhaPage } from './components/pages/TrocarSenhaPage';
import { PainelAdministradorPage } from './components/pages/PainelAdministradorPage';
import { PainelSecretariaPage } from './components/pages/PainelSecretariaPage';
import { PainelCoordenacaoPage } from './components/pages/PainelCoordenacaoPage';
import { PainelProfessorPage } from './components/pages/PainelProfessorPage';
import { UsuariosPage } from './components/pages/UsuariosPage';
import { NovoUsuarioPage } from './components/pages/NovoUsuarioPage';
import { AuditoriaPage } from './components/pages/AuditoriaPage';
import { AcessoNegadoPage } from './components/pages/AcessoNegadoPage';
import { NaoEncontradaPage } from './components/pages/NaoEncontradaPage';

const PAGINA_POR_NOME: Record<NomeDePagina, () => React.JSX.Element> = {
  EntrarPage,
  EsqueciSenhaPage,
  RedefinirSenhaPage,
  TrocarSenhaPage,
  PainelAdministradorPage,
  PainelSecretariaPage,
  PainelCoordenacaoPage,
  PainelProfessorPage,
  UsuariosPage,
  NovoUsuarioPage,
  AuditoriaPage,
  AcessoNegadoPage,
  NaoEncontradaPage,
};

export const rotasDaAplicacao: RouteObject[] = [
  {
    element: <Guarda />,
    children: ROTAS.map((rota) => {
      const Pagina = PAGINA_POR_NOME[rota.pagina];
      return { path: rota.caminho, element: <Pagina /> };
    }),
  },
];
