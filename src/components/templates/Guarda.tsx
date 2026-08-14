/**
 * Rota de layout que decide todo redirecionamento — a única autoridade de navegação da interface
 * (`contracts/rls-e-rotas.md` §B.1). Ordem fixa; inverter qualquer par quebra um requisito.
 *
 * `encontrarRota` devolve `undefined` para caminho desconhecido: a página não encontrada é aberta a
 * qualquer status de sessão (tabela §B, `*` → "qualquer"), diferente das rotas anônimas nomeadas
 * (`/entrar` etc.), que afastam quem já está autenticado.
 */
import { useEffect, useRef } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSession } from '../../services/auth/useSession';
import { consumirSaidaIntencional } from '../../services/auth/sinalDeSaida';
import { encontrarRota, rotaEhAnonima, rotaPermitida } from '../../lib/permissoes';
import { comoParametroDeDestino } from '../../lib/destino';
import { NOME_DO_PERFIL, PAINEL_DO_PERFIL } from '../../config';
import { Carregando } from '../atoms/Carregando';

export function Guarda() {
  const sessao = useSession();
  const location = useLocation();
  const caminhoAtual = location.pathname;
  const rota = encontrarRota(caminhoAtual);

  // Detecta a transição autenticado → anônimo para escolher o aviso certo em `/entrar` (US1-7).
  const statusAnterior = useRef(sessao.status);
  const veioDeSessaoAtiva = statusAnterior.current === 'autenticado' && sessao.status === 'anonimo';
  useEffect(() => {
    statusAnterior.current = sessao.status;
  });

  // Página não encontrada: aberta a qualquer status. Rotas anônimas nomeadas afastam quem já
  // entrou (passo 5).
  const acessoAnonimoPermitido = rota === undefined || rotaEhAnonima(rota);
  const paginaSoParaAnonimos = rota !== undefined && rotaEhAnonima(rota);

  // 1. Carregamento da sessão inicial.
  if (sessao.status === 'carregando') {
    return (
      <div className="flex min-h-screen items-center justify-center" aria-busy="true">
        <Carregando />
      </div>
    );
  }

  // 2. Não autenticado em rota interna.
  if (sessao.status === 'anonimo') {
    if (!acessoAnonimoPermitido) {
      const destino = comoParametroDeDestino(caminhoAtual, location.search);
      const aviso = veioDeSessaoAtiva ? (consumirSaidaIntencional() ? 'saida' : 'expirada') : null;
      const parametroDeAviso = aviso === null ? '' : `&aviso=${aviso}`;
      return <Navigate to={`/entrar?destino=${destino}${parametroDeAviso}`} replace />;
    }
    return <Outlet />;
  }

  const { usuario } = sessao;

  // 3. Primeiro acesso absorve toda navegação, exceto a própria troca de senha.
  if (usuario.primeiroAcesso && caminhoAtual !== '/trocar-senha') {
    return <Navigate to="/trocar-senha" replace />;
  }

  // 4. Rota exige perfil ausente das permissões efetivas.
  if (rota !== undefined && !rotaPermitida(rota, usuario.perfis)) {
    // FR-016: o próprio painel deixou de valer porque a visão ativa perdeu o perfil que a
    // sustentava — `ajustarVisaoAtiva` já a reconduziu ao maior alcance restante (`lib/permissoes`);
    // aqui só resta seguir para lá, em vez de negar acesso à própria conta.
    const rotaEhPainel = Object.values(PAINEL_DO_PERFIL).includes(caminhoAtual);
    if (rotaEhPainel) {
      return (
        <Navigate
          to={PAINEL_DO_PERFIL[usuario.visaoAtiva]}
          replace
          state={{ avisoDeVisaoAjustada: NOME_DO_PERFIL[usuario.visaoAtiva] }}
        />
      );
    }
    return <Navigate to="/acesso-negado" replace />;
  }

  // 5. Autenticado em rota só para anônimos → painel da visão ativa.
  if (paginaSoParaAnonimos) {
    return <Navigate to={PAINEL_DO_PERFIL[usuario.visaoAtiva]} replace />;
  }

  // 6. Caso contrário, segue.
  return <Outlet />;
}
