/**
 * Bloquear, desbloquear e desativar — confirmação explícita antes de cada ação destrutiva, e
 * mensagem específica para `ultimo_administrador` (US5-1, US5-5; T104).
 */
import { useState } from 'react';
import { TEXTOS } from '../../config';
import { usePortas } from '../../services/PortasProvider';
import type { ErroDeGestao } from '../../services/usuarios/types';
import type { Usuario } from '../../types';
import { Botao } from '../atoms/Botao';

type Acao = 'bloquear' | 'desbloquear' | 'desativar';

export interface AcoesDeUsuarioProps {
  readonly usuario: Usuario;
  readonly aoAtualizar: (usuario: Usuario) => void;
}

const TEXTO_DE_CONFIRMACAO: Record<Acao, string> = {
  bloquear: TEXTOS.usuarios.confirmarBloqueio,
  desbloquear: TEXTOS.usuarios.confirmarDesbloqueio,
  desativar: TEXTOS.usuarios.confirmarDesativacao,
};

export function AcoesDeUsuario({ usuario, aoAtualizar }: AcoesDeUsuarioProps) {
  const { usuarios } = usePortas();
  const [acaoPendente, setAcaoPendente] = useState<Acao | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<ErroDeGestao | null>(null);

  async function confirmar(): Promise<void> {
    if (acaoPendente === null) return;

    setEnviando(true);
    setErro(null);

    const resultado =
      acaoPendente === 'bloquear'
        ? await usuarios.bloquear(usuario.id)
        : acaoPendente === 'desbloquear'
          ? await usuarios.desbloquear(usuario.id)
          : await usuarios.desativar(usuario.id);

    setEnviando(false);

    if (!resultado.ok) {
      setErro(resultado.erro);
      return;
    }

    setAcaoPendente(null);
    aoAtualizar(resultado.valor);
  }

  function cancelar(): void {
    setAcaoPendente(null);
    setErro(null);
  }

  if (acaoPendente !== null) {
    return (
      <div
        role="alertdialog"
        aria-label={TEXTO_DE_CONFIRMACAO[acaoPendente].replace('{nome}', usuario.nome)}
      >
        <p className="mb-2 text-sm">
          {TEXTO_DE_CONFIRMACAO[acaoPendente].replace('{nome}', usuario.nome)}
        </p>
        <div role="alert" aria-live="polite">
          {erro !== null && (
            <p className="mb-2 text-sm text-erro">{TEXTOS.errosDeGestao[erro.codigo]}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Botao variante="destrutivo" carregando={enviando} onClick={() => void confirmar()}>
            {TEXTOS.usuarios.confirmar}
          </Botao>
          <Botao variante="terciario" onClick={cancelar} disabled={enviando}>
            {TEXTOS.usuarios.cancelar}
          </Botao>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {usuario.situacao === 'ativo' && (
        <Botao variante="secundario" onClick={() => setAcaoPendente('bloquear')}>
          {TEXTOS.usuarios.acaoBloquear}
        </Botao>
      )}
      {usuario.situacao === 'bloqueado' && (
        <Botao variante="secundario" onClick={() => setAcaoPendente('desbloquear')}>
          {TEXTOS.usuarios.acaoDesbloquear}
        </Botao>
      )}
      {usuario.situacao !== 'desativado' && (
        <Botao variante="destrutivo" onClick={() => setAcaoPendente('desativar')}>
          {TEXTOS.usuarios.acaoDesativar}
        </Botao>
      )}
    </div>
  );
}
