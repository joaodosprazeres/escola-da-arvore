/**
 * Conclui a redefinição a partir do link de recuperação (FR-029, FR-031). Link inválido ou vencido
 * oferece solicitar um novo (US4-4).
 */
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { TEXTOS } from '../../config';
import { usePortas } from '../../services/PortasProvider';
import type { ErroDeSenha } from '../../services/auth/types';
import { Botao } from '../atoms/Botao';
import { CampoTexto } from '../atoms/CampoTexto';
import { Rotulo } from '../atoms/Rotulo';
import { MedidorDeSenha } from '../molecules/MedidorDeSenha';
import { LayoutDeAutenticacao } from '../templates/LayoutDeAutenticacao';

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

export function RedefinirSenhaPage() {
  const { auth } = usePortas();
  const [parametros] = useSearchParams();
  const token = parametros.get('token_hash') ?? parametros.get('token') ?? '';
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<ErroDeSenha | null>(null);
  const [erroDeConfirmacao, setErroDeConfirmacao] = useState<string | null>(null);
  const [concluido, setConcluido] = useState(false);

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

    const resultado = await auth.redefinirSenhaComLink(token, novaSenha);

    setEnviando(false);

    if (!resultado.ok) {
      setErro(resultado.erro);
      return;
    }

    setConcluido(true);
  }

  if (concluido) {
    return (
      <LayoutDeAutenticacao titulo={TEXTOS.redefinicao.titulo}>
        <p role="status" aria-live="polite" className="mb-4 text-sm">
          {TEXTOS.redefinicao.sucesso}
        </p>
        <Link to="/entrar" className="text-verde-escuro underline">
          {TEXTOS.entrada.acaoEntrar}
        </Link>
      </LayoutDeAutenticacao>
    );
  }

  if (token === '' || erro?.codigo === 'link_invalido') {
    return (
      <LayoutDeAutenticacao titulo={TEXTOS.redefinicao.titulo}>
        <p role="alert" className="mb-4 text-sm text-erro">
          {TEXTOS.errosDeSenha.link_invalido}
        </p>
        <Link to="/esqueci-senha" className="text-verde-escuro underline">
          {TEXTOS.redefinicao.solicitarNovoLink}
        </Link>
      </LayoutDeAutenticacao>
    );
  }

  return (
    <LayoutDeAutenticacao titulo={TEXTOS.redefinicao.titulo}>
      <p className="mb-4 text-sm">{TEXTOS.redefinicao.explicacao}</p>

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

        <MedidorDeSenha senha={novaSenha} />

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

        <Botao type="submit" carregando={enviando} className="w-full">
          {enviando ? TEXTOS.redefinicao.acaoRedefinindo : TEXTOS.redefinicao.acaoRedefinir}
        </Botao>
      </form>
    </LayoutDeAutenticacao>
  );
}
