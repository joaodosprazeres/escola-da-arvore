/**
 * `destino` só é honrado depois de validado por `lib/destino.ts` e de o perfil permitir (FR-006).
 * Fora isso, cai no fallback do passo 5 do `Guarda`: painel da visão ativa.
 */
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { PAINEL_DO_PERFIL, TEXTOS } from '../../config';
import { destinoInternoValido } from '../../lib/destino';
import { encontrarRota, rotaPermitida } from '../../lib/permissoes';
import { usePortas } from '../../services/PortasProvider';
import type { ErroDeEntrada } from '../../services/auth/types';
import type { UsuarioSessao } from '../../types';
import { FormularioDeEntrada } from '../organisms/FormularioDeEntrada';
import { LayoutDeAutenticacao } from '../templates/LayoutDeAutenticacao';

function destinoAposEntrar(usuario: UsuarioSessao, destinoBruto: string | null): string {
  const destino = destinoInternoValido(destinoBruto);

  if (destino !== null) {
    const rota = encontrarRota(destino);
    if (rota !== undefined && rotaPermitida(rota, usuario.perfis)) {
      return destino;
    }
  }

  return PAINEL_DO_PERFIL[usuario.visaoAtiva];
}

export function EntrarPage() {
  const { auth } = usePortas();
  const navegar = useNavigate();
  const [parametros] = useSearchParams();
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<ErroDeEntrada | null>(null);

  const avisoDeSessao = parametros.get('aviso');

  async function aoSubmeter(email: string, senha: string): Promise<void> {
    setEnviando(true);
    setErro(null);

    const resultado = await auth.entrar(email, senha);

    setEnviando(false);

    if (!resultado.ok) {
      setErro(resultado.erro);
      return;
    }

    const usuario = resultado.valor;
    if (usuario.primeiroAcesso) {
      navegar('/trocar-senha', { replace: true });
      return;
    }

    navegar(destinoAposEntrar(usuario, parametros.get('destino')), { replace: true });
  }

  return (
    <LayoutDeAutenticacao titulo={TEXTOS.entrada.titulo}>
      <div aria-live="polite">
        {avisoDeSessao === 'expirada' && (
          <p className="mb-4 text-sm">{TEXTOS.entrada.avisoSessaoExpirada}</p>
        )}
        {avisoDeSessao === 'saida' && (
          <p className="mb-4 text-sm">{TEXTOS.entrada.avisoSaidaConcluida}</p>
        )}
      </div>
      <FormularioDeEntrada
        aoSubmeter={(email, senha) => void aoSubmeter(email, senha)}
        enviando={enviando}
        erro={erro}
      />
      <p className="mt-4 text-sm">
        <Link to="/esqueci-senha">{TEXTOS.entrada.linkEsqueciSenha}</Link>
      </p>
    </LayoutDeAutenticacao>
  );
}
