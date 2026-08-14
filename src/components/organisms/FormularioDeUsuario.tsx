/**
 * Cadastro de usuário: seleção múltipla de perfis e campo de vínculo de professor que só aparece —
 * e só é exigido — quando `professor` está entre os selecionados (FR-018, T071).
 */
import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { NOME_DO_PERFIL, TEXTOS } from '../../config';
import { useRequisicao } from '../../lib/useRequisicao';
import { usePortas } from '../../services/PortasProvider';
import type { ErroDeGestao, NovoUsuario } from '../../services/usuarios/types';
import type { Perfil } from '../../types';
import { Botao } from '../atoms/Botao';
import { CampoTexto } from '../atoms/CampoTexto';
import { Rotulo } from '../atoms/Rotulo';

const PERFIS: readonly Perfil[] = ['administrador', 'secretaria', 'coordenacao', 'professor'];

export interface FormularioDeUsuarioProps {
  readonly aoSubmeter: (dados: NovoUsuario) => void;
  readonly enviando: boolean;
  readonly erro: ErroDeGestao | null;
}

export function FormularioDeUsuario({ aoSubmeter, enviando, erro }: FormularioDeUsuarioProps) {
  const { usuarios } = usePortas();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [perfis, setPerfis] = useState<ReadonlySet<Perfil>>(new Set());
  const [professorId, setProfessorId] = useState('');

  const professores = useRequisicao(() => usuarios.listarProfessoresDisponiveis(), []);

  const exigeProfessor = perfis.has('professor');

  function alternarPerfil(perfil: Perfil, evento: ChangeEvent<HTMLInputElement>): void {
    setPerfis((atual) => {
      const novo = new Set(atual);
      if (evento.target.checked) {
        novo.add(perfil);
      } else {
        novo.delete(perfil);
      }
      return novo;
    });
  }

  function aoEnviar(evento: FormEvent<HTMLFormElement>): void {
    evento.preventDefault();
    if (enviando) return;

    aoSubmeter({
      nome: nome.trim(),
      email: email.trim(),
      perfis: [...perfis],
      professorId: exigeProfessor && professorId !== '' ? professorId : null,
    });
  }

  const mensagemDeErro = erro === null ? null : TEXTOS.errosDeGestao[erro.codigo];

  return (
    <form onSubmit={aoEnviar} noValidate>
      <div role="alert" aria-live="polite">
        {mensagemDeErro !== null && (
          <p className="mb-4 rounded-sm border-2 border-erro bg-branco p-3 text-sm text-erro">
            {mensagemDeErro}
          </p>
        )}
      </div>

      <div className="mb-4">
        <Rotulo htmlFor="nome" obrigatorio>
          {TEXTOS.novoUsuario.rotuloNome}
        </Rotulo>
        <CampoTexto
          id="nome"
          name="nome"
          value={nome}
          onChange={(evento) => setNome(evento.target.value)}
          required
        />
      </div>

      <div className="mb-4">
        <Rotulo htmlFor="email" obrigatorio>
          {TEXTOS.novoUsuario.rotuloEmail}
        </Rotulo>
        <CampoTexto
          id="email"
          name="email"
          type="email"
          value={email}
          onChange={(evento) => setEmail(evento.target.value)}
          required
        />
      </div>

      <fieldset className="mb-4">
        <legend className="mb-2 text-sm font-weight-medio text-preto">
          {TEXTOS.novoUsuario.rotuloPerfis}
        </legend>
        <div className="flex flex-col gap-2">
          {PERFIS.map((perfil) => (
            <label
              key={perfil}
              className="inline-flex min-h-alvo-toque items-center gap-2 text-base"
            >
              <input
                type="checkbox"
                checked={perfis.has(perfil)}
                onChange={(evento) => alternarPerfil(perfil, evento)}
              />
              {NOME_DO_PERFIL[perfil]}
            </label>
          ))}
        </div>
      </fieldset>

      {exigeProfessor && (
        <div className="mb-4">
          <Rotulo htmlFor="professor" obrigatorio>
            {TEXTOS.novoUsuario.rotuloProfessor}
          </Rotulo>
          <p className="mb-1 text-sm">{TEXTOS.novoUsuario.explicacaoProfessor}</p>
          <select
            id="professor"
            value={professorId}
            onChange={(evento) => setProfessorId(evento.target.value)}
            className="min-h-alvo-toque w-full rounded-sm border border-verde-escuro bg-branco px-3 text-base text-preto"
            required
          >
            <option value="">—</option>
            {(professores.dados ?? []).map((professor) => (
              <option key={professor.id} value={professor.id}>
                {professor.nome}
              </option>
            ))}
          </select>
        </div>
      )}

      <Botao type="submit" carregando={enviando}>
        {enviando ? TEXTOS.novoUsuario.acaoCriando : TEXTOS.novoUsuario.acaoCriar}
      </Botao>
    </form>
  );
}
