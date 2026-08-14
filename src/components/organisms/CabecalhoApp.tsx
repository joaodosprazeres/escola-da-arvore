/**
 * Cabeçalho da casca interna: menu derivado da visão ativa, seletor de visão e ação de sair
 * (FR-014, FR-005). Navegação sempre por `<NavLink>` — âncora real, preserva ctrl-clique e
 * clique do meio (R-04).
 */
import { NavLink, useNavigate } from 'react-router-dom';
import { ITENS_DE_MENU, NOME_DA_INSTITUICAO, PAINEL_DO_PERFIL, TEXTOS } from '../../config';
import type { Perfil } from '../../types';
import { usePortas } from '../../services/PortasProvider';
import { useSession } from '../../services/auth/useSession';
import { marcarSaidaIntencional } from '../../services/auth/sinalDeSaida';
import { Botao } from '../atoms/Botao';
import { Icone } from '../atoms/Icone';
import { SeletorDeVisao } from '../molecules/SeletorDeVisao';

export function CabecalhoApp() {
  const sessao = useSession();
  const { auth } = usePortas();
  const navegar = useNavigate();

  if (sessao.status !== 'autenticado') return null;

  const { usuario } = sessao;
  const itens = ITENS_DE_MENU[usuario.visaoAtiva];

  async function aoTrocarVisao(visao: Perfil): Promise<void> {
    const resultado = await auth.definirVisaoAtiva(visao);
    // Entra direto no painel da visão escolhida — a troca é sobre "onde estou", não só o menu
    // (SC-010, SC-011); a navegação só acontece depois da ação já executada (§B.3).
    if (resultado.ok) navegar(PAINEL_DO_PERFIL[visao]);
  }

  function aoSair(): void {
    marcarSaidaIntencional();
    void auth.sair();
  }

  return (
    <header className="sobre-escuro bg-verde-escuro">
      <div className="mx-auto flex max-w-conteudo flex-wrap items-center justify-between gap-3 px-4 py-3">
        <span className="text-lg font-weight-forte">{NOME_DA_INSTITUICAO}</span>
        <div className="flex flex-wrap items-center gap-4">
          <SeletorDeVisao
            perfis={usuario.perfis}
            visaoAtiva={usuario.visaoAtiva}
            aoTrocar={aoTrocarVisao}
          />
          <span className="text-sm">{TEXTOS.layout.saudacao.replace('{nome}', usuario.nome)}</span>
          <Botao variante="sobreEscuro" onClick={aoSair}>
            <Icone nome="sair" />
            {TEXTOS.layout.acaoSair}
          </Botao>
        </div>
      </div>
      <nav aria-label={TEXTOS.layout.rotuloMenu} className="border-t border-branco/20 px-4">
        <ul className="flex flex-wrap gap-4">
          {itens.map((item) => (
            <li key={item.caminho}>
              <NavLink
                to={item.caminho}
                className={({ isActive }) =>
                  `inline-flex items-center gap-1 py-2 ${isActive ? 'font-weight-forte underline' : ''}`
                }
              >
                <Icone nome={item.icone} />
                {item.rotulo}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
