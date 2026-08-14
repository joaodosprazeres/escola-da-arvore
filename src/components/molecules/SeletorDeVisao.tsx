/**
 * Alterna a visão ativa entre os perfis do usuário (US1-9, US1-10; FR-012; SC-011).
 * Só aparece com mais de um perfil; a visão ativa é indicada por texto — a opção selecionada —,
 * não só por cor (design system §2.3). Um `<select>` nativo alterna em 2 acionamentos de qualquer
 * tela: abrir e escolher.
 */
import { NOME_DO_PERFIL, TEXTOS } from '../../config';
import type { Perfil } from '../../types';
import { Rotulo } from '../atoms/Rotulo';

export interface SeletorDeVisaoProps {
  readonly perfis: readonly Perfil[];
  readonly visaoAtiva: Perfil;
  readonly aoTrocar: (visao: Perfil) => void;
}

export function SeletorDeVisao({ perfis, visaoAtiva, aoTrocar }: SeletorDeVisaoProps) {
  if (perfis.length <= 1) return null;

  return (
    <div className="sobre-escuro flex items-center gap-2">
      <Rotulo htmlFor="seletor-de-visao" className="text-branco">
        {TEXTOS.layout.rotuloSeletorDeVisao}
      </Rotulo>
      <select
        id="seletor-de-visao"
        value={visaoAtiva}
        onChange={(evento) => {
          aoTrocar(evento.target.value as Perfil);
        }}
        className="min-h-alvo-toque rounded-sm border border-branco bg-branco px-2 text-base text-preto"
      >
        {perfis.map((perfil) => (
          <option key={perfil} value={perfil}>
            {NOME_DO_PERFIL[perfil]}
          </option>
        ))}
      </select>
    </div>
  );
}
