/**
 * Estado de uma requisição: `carregando / dados / erro / recarregar` (R-03 regra 6).
 *
 * Sem cache global e sem revalidação — a escala é de dezenas de usuários. O `AbortController`
 * existe para que a resposta de uma requisição descartada nunca chegue ao estado: nem depois do
 * desmonte, nem depois de um `recarregar()` que a substituiu.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

export interface EstadoDaRequisicao<T, E> {
  readonly carregando: boolean;
  readonly dados: T | null;
  readonly erro: E | null;
  readonly recarregar: () => void;
}

export type Buscador<T, E> = (
  sinal: AbortSignal,
) => Promise<{ readonly ok: true; readonly valor: T } | { readonly ok: false; readonly erro: E }>;

export function useRequisicao<T, E>(
  buscar: Buscador<T, E>,
  dependencias: readonly unknown[] = [],
): EstadoDaRequisicao<T, E> {
  const [carregando, setCarregando] = useState(true);
  const [dados, setDados] = useState<T | null>(null);
  const [erro, setErro] = useState<E | null>(null);
  const [gatilho, setGatilho] = useState(0);

  const buscarRef = useRef(buscar);
  buscarRef.current = buscar;

  const recarregar = useCallback(() => {
    setGatilho((valor) => valor + 1);
  }, []);

  useEffect(() => {
    const controle = new AbortController();
    let ativo = true;

    setCarregando(true);

    void (async () => {
      try {
        const resultado = await buscarRef.current(controle.signal);

        // Nada é escrito depois do abort: nem sucesso, nem erro.
        if (!ativo || controle.signal.aborted) return;

        if (resultado.ok) {
          setDados(resultado.valor);
          setErro(null);
        } else {
          setDados(null);
          setErro(resultado.erro);
        }
      } catch (falha) {
        if (!ativo || controle.signal.aborted) return;
        setDados(null);
        setErro(falha as E);
      } finally {
        // O erro não pode deixar `carregando` preso em true.
        if (ativo && !controle.signal.aborted) setCarregando(false);
      }
    })();

    return () => {
      ativo = false;
      controle.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gatilho, ...dependencias]);

  return { carregando, dados, erro, recarregar };
}
