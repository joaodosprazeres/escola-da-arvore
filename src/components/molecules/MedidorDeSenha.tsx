/**
 * Mostra **o que falta**, nunca só "fraca/forte" (FR-028). Reutilizado por `TrocarSenhaPage` e
 * `RedefinirSenhaPage` (T075, T094).
 */
import { useEffect, useState } from 'react';
import { REGRAS_DE_SENHA_EXIBIDAS } from '../../config';
import { avaliarSenha } from '../../lib/forcaDeSenha';
import type { ContextoDaSenha } from '../../lib/forcaDeSenha';
import { Icone } from '../atoms/Icone';

export interface MedidorDeSenhaProps {
  readonly senha: string;
  readonly contexto?: ContextoDaSenha;
}

export function MedidorDeSenha({ senha, contexto }: MedidorDeSenhaProps) {
  const [regrasNaoAtendidas, setRegrasNaoAtendidas] = useState<readonly string[]>(
    REGRAS_DE_SENHA_EXIBIDAS.map((regra) => regra.texto),
  );

  useEffect(() => {
    let ativo = true;

    void avaliarSenha(senha, contexto).then((avaliacao) => {
      if (ativo) setRegrasNaoAtendidas(avaliacao.regrasNaoAtendidas);
    });

    return () => {
      ativo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [senha, contexto?.email, contexto?.nome]);

  return (
    <ul aria-live="polite" className="mt-2 mb-4 flex flex-col gap-1 text-sm">
      {REGRAS_DE_SENHA_EXIBIDAS.map((regra) => {
        const falta = regrasNaoAtendidas.includes(regra.texto);
        return (
          <li
            key={regra.codigo}
            className={`flex items-center gap-2 ${falta ? 'text-preto' : 'text-verde-escuro'}`}
          >
            <Icone nome={falta ? 'alerta' : 'sucesso'} tamanho={16} />
            {regra.texto}
          </li>
        );
      })}
    </ul>
  );
}
