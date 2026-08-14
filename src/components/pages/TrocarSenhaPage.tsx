/**
 * Troca obrigatória do primeiro acesso e troca voluntária (FR-027). A absorção de navegação
 * enquanto `primeiroAcesso` é verdadeiro já vem do passo 3 do `Guarda` — esta página só cuida do
 * formulário.
 */
import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { PAINEL_DO_PERFIL, TEXTOS } from '../../config';
import { usePortas } from '../../services/PortasProvider';
import { useSession } from '../../services/auth/useSession';
import type { ErroDeSenha } from '../../services/auth/types';
import { Botao } from '../atoms/Botao';
import { CampoTexto } from '../atoms/CampoTexto';
import { Rotulo } from '../atoms/Rotulo';
import { MedidorDeSenha } from '../molecules/MedidorDeSenha';
import { LayoutInterno } from '../templates/LayoutInterno';

function textoDoErro(erro: ErroDeSenha): string {
  switch (erro.codigo) {
    case 'senha_fraca':
      return TEXTOS.errosDeSenha.senha_fraca;
    case 'link_invalido':
      return TEXTOS.errosDeSenha.link_invalido;
    case 'sessao_expirada':
      return TEXTOS.errosDeSenha.sessao_expirada;
    case 'indisponivel':
      return TEXTOS.errosDeSenha.indisponivel;
  }
}

export function TrocarSenhaPage() {
  const { auth } = usePortas();
  const sessao = useSession();
  const navegar = useNavigate();
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<ErroDeSenha | null>(null);
  const [erroDeConfirmacao, setErroDeConfirmacao] = useState<string | null>(null);

  const usuario = sessao.status === 'autenticado' ? sessao.usuario : null;

  async function aoEnviar(evento: FormEvent<HTMLFormElement>): Promise<void> {
    evento.preventDefault();
    if (enviando) return;

    if (novaSenha !== confirmacao) {
      setErroDeConfirmacao(TEXTOS.errosDeSenha.confirmacao_diferente);
      return;
    }

    setErroDeConfirmacao(null);
    setEnviando(true);
    setErro(null);

    const resultado = await auth.trocarSenha(novaSenha);

    setEnviando(false);

    if (!resultado.ok) {
      setErro(resultado.erro);
      return;
    }

    if (usuario !== null) {
      navegar(PAINEL_DO_PERFIL[usuario.visaoAtiva], { replace: true });
    }
  }

  return (
    <LayoutInterno titulo={TEXTOS.trocaDeSenha.titulo}>
      {usuario?.primeiroAcesso === true && (
        <p className="mb-4 text-sm">{TEXTOS.trocaDeSenha.explicacaoPrimeiroAcesso}</p>
      )}

      <form onSubmit={(evento) => void aoEnviar(evento)} noValidate>
        <div role="alert" aria-live="polite">
          {erro !== null && (
            <div className="mb-4 rounded-sm border-2 border-erro bg-branco p-3 text-sm text-erro">
              <p>{textoDoErro(erro)}</p>
              {erro.codigo === 'senha_fraca' && (
                <ul className="mt-2 list-disc pl-5">
                  {erro.regrasNaoAtendidas.map((regra) => (
                    <li key={regra}>{regra}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {erroDeConfirmacao !== null && (
            <p className="mb-4 rounded-sm border-2 border-erro bg-branco p-3 text-sm text-erro">
              {erroDeConfirmacao}
            </p>
          )}
        </div>

        <div className="mb-2">
          <Rotulo htmlFor="nova-senha" obrigatorio>
            {TEXTOS.trocaDeSenha.rotuloNovaSenha}
          </Rotulo>
          <CampoTexto
            id="nova-senha"
            name="nova-senha"
            type="password"
            autoComplete="new-password"
            value={novaSenha}
            onChange={(evento) => setNovaSenha(evento.target.value)}
          />
        </div>

        <MedidorDeSenha
          senha={novaSenha}
          contexto={{
            ...(usuario?.email !== undefined && { email: usuario.email }),
            ...(usuario?.nome !== undefined && { nome: usuario.nome }),
          }}
        />

        <div className="mb-4">
          <Rotulo htmlFor="confirmacao" obrigatorio>
            {TEXTOS.trocaDeSenha.rotuloConfirmacao}
          </Rotulo>
          <CampoTexto
            id="confirmacao"
            name="confirmacao"
            type="password"
            autoComplete="new-password"
            value={confirmacao}
            onChange={(evento) => setConfirmacao(evento.target.value)}
          />
        </div>

        <Botao type="submit" carregando={enviando}>
          {enviando ? TEXTOS.trocaDeSenha.acaoSalvando : TEXTOS.trocaDeSenha.acaoSalvar}
        </Botao>
      </form>
    </LayoutInterno>
  );
}
