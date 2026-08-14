/**
 * Formulário de entrada: rótulos associados, erro ligado ao campo por `aria-describedby`,
 * resumo em `aria-live`, botão inerte durante o envio — sem envio duplicado (FR-046, FR-047).
 */
import { useState } from 'react';
import type { ChangeEvent, FormEvent as ReactFormEvent } from 'react';
import { TEXTOS } from '../../config';
import type { ErroDeEntrada } from '../../services/auth/types';
import { Botao } from '../atoms/Botao';
import { CampoTexto } from '../atoms/CampoTexto';
import { Rotulo } from '../atoms/Rotulo';

export interface FormularioDeEntradaProps {
  readonly aoSubmeter: (email: string, senha: string) => void;
  readonly enviando: boolean;
  readonly erro: ErroDeEntrada | null;
}

interface ErrosDeCampo {
  readonly email?: string;
  readonly senha?: string;
}

function textoDoErro(erro: ErroDeEntrada): string {
  switch (erro.codigo) {
    case 'credenciais_invalidas':
      return TEXTOS.errosDeEntrada.credenciais_invalidas;
    case 'conta_indisponivel':
      return TEXTOS.errosDeEntrada.conta_indisponivel;
    case 'contido_por_tentativas':
      return TEXTOS.errosDeEntrada.contido_por_tentativas.replace(
        '{minutos}',
        String(Math.ceil(erro.liberadoEmSegundos / 60)),
      );
    case 'indisponivel':
      return TEXTOS.errosDeEntrada.indisponivel;
  }
}

export function FormularioDeEntrada({ aoSubmeter, enviando, erro }: FormularioDeEntradaProps) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [errosDeCampo, setErrosDeCampo] = useState<ErrosDeCampo>({});

  function aoMudarEmail(evento: ChangeEvent<HTMLInputElement>): void {
    setEmail(evento.target.value);
  }

  function aoMudarSenha(evento: ChangeEvent<HTMLInputElement>): void {
    setSenha(evento.target.value);
  }

  function aoEnviar(formData: FormData): void {
    // evento.preventDefault();
    if (enviando) return;
    setEmail(formData.get("email") as string);
    setSenha(formData.get("senha") as string);

    const problemas: ErrosDeCampo = {
      ...(email.trim() === '' && { email: TEXTOS.errosDeEntrada.campo_email_obrigatorio }),
      ...(senha === '' && { senha: TEXTOS.errosDeEntrada.campo_senha_obrigatoria }),
    };

    setErrosDeCampo(problemas);
    if (Object.keys(problemas).length > 0) return;

    aoSubmeter(email.trim(), senha);
  }

  const mensagemDeErro = erro === null ? null : textoDoErro(erro);

  return (
    <form action={aoEnviar} noValidate>
      <div role="alert" aria-live="polite">
        {mensagemDeErro !== null && (
          <p className="mb-4 rounded-sm border-2 border-erro bg-branco p-3 text-sm text-erro">
            {mensagemDeErro}
          </p>
        )}
      </div>

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
          onChange={aoMudarEmail}
          erro={errosDeCampo.email !== undefined}
          aria-describedby={errosDeCampo.email !== undefined ? 'erro-email' : undefined}
        />
        {errosDeCampo.email !== undefined && (
          <p id="erro-email" className="mt-1 text-sm text-erro">
            {errosDeCampo.email}
          </p>
        )}
      </div>

      <div className="mb-4">
        <Rotulo htmlFor="senha" obrigatorio>
          {TEXTOS.entrada.rotuloSenha}
        </Rotulo>
        <CampoTexto
          id="senha"
          name="senha"
          type="password"
          autoComplete="current-password"
          value={senha}
          onChange={aoMudarSenha}
          erro={errosDeCampo.senha !== undefined}
          aria-describedby={errosDeCampo.senha !== undefined ? 'erro-senha' : undefined}
        />
        {errosDeCampo.senha !== undefined && (
          <p id="erro-senha" className="mt-1 text-sm text-erro">
            {errosDeCampo.senha}
          </p>
        )}
      </div>

      <Botao type="submit" carregando={enviando} className="w-full">
        {enviando ? TEXTOS.entrada.acaoEntrando : TEXTOS.entrada.acaoEntrar}
      </Botao>
    </form>
  );
}
