/**
 * Solicitação de recuperação — confirmação genérica única, exista ou não o e-mail (FR-030; US4-1,
 * US4-2, US4-5).
 */
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { TEXTOS } from '../../config';
import { usePortas } from '../../services/PortasProvider';
import { Botao } from '../atoms/Botao';
import { CampoTexto } from '../atoms/CampoTexto';
import { Rotulo } from '../atoms/Rotulo';
import { LayoutDeAutenticacao } from '../templates/LayoutDeAutenticacao';

export function EsqueciSenhaPage() {
  const { auth } = usePortas();
  const [email, setEmail] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  async function aoEnviar(evento: FormEvent<HTMLFormElement>): Promise<void> {
    evento.preventDefault();
    if (enviando || email.trim() === '') return;

    setEnviando(true);
    await auth.solicitarRecuperacao(email.trim());
    setEnviando(false);
    // Sempre a mesma confirmação, exista ou não o e-mail — nunca revela a existência da conta.
    setEnviado(true);
  }

  if (enviado) {
    return (
      <LayoutDeAutenticacao titulo={TEXTOS.recuperacao.titulo}>
        <p role="status" aria-live="polite" className="mb-4 text-sm">
          {TEXTOS.recuperacao.confirmacaoGenerica}
        </p>
        <Link to="/entrar" className="text-verde-escuro underline">
          {TEXTOS.recuperacao.voltarParaEntrar}
        </Link>
      </LayoutDeAutenticacao>
    );
  }

  return (
    <LayoutDeAutenticacao titulo={TEXTOS.recuperacao.titulo}>
      <p className="mb-4 text-sm">{TEXTOS.recuperacao.explicacao}</p>

      <form onSubmit={(evento) => void aoEnviar(evento)} noValidate>
        <div className="mb-4">
          <Rotulo htmlFor="email" obrigatorio>
            {TEXTOS.entrada.rotuloEmail}
          </Rotulo>
          <CampoTexto
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(evento) => setEmail(evento.target.value)}
          />
        </div>

        <Botao type="submit" carregando={enviando} className="w-full">
          {enviando ? TEXTOS.recuperacao.acaoEnviando : TEXTOS.recuperacao.acaoEnviar}
        </Botao>
      </form>

      <p className="mt-4 text-sm">
        <Link to="/entrar">{TEXTOS.recuperacao.voltarParaEntrar}</Link>
      </p>
    </LayoutDeAutenticacao>
  );
}
