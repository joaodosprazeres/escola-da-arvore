/**
 * @vitest-environment jsdom
 *
 * O hook é o único item de `src/lib/` que exige DOM: o resto da suíte unitária roda em node.
 */
import { describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useRequisicao } from '../../src/lib/useRequisicao';

interface Erro {
  readonly codigo: string;
}

describe('useRequisicao (R-03 regra 6, Princípio VIII)', () => {
  it('entrega dados e sai de carregando no caminho feliz', async () => {
    const { result } = renderHook(() =>
      useRequisicao<string, Erro>(async () => ({ ok: true, valor: 'lista' })),
    );

    expect(result.current.carregando).toBe(true);

    await waitFor(() => expect(result.current.carregando).toBe(false));
    expect(result.current.dados).toBe('lista');
    expect(result.current.erro).toBeNull();
  });

  it('erro não deixa carregando preso em true', async () => {
    const { result } = renderHook(() =>
      useRequisicao<string, Erro>(async () => ({ ok: false, erro: { codigo: 'indisponivel' } })),
    );

    await waitFor(() => expect(result.current.carregando).toBe(false));
    expect(result.current.erro).toEqual({ codigo: 'indisponivel' });
    expect(result.current.dados).toBeNull();
  });

  it('exceção lançada também encerra o carregamento', async () => {
    const { result } = renderHook(() =>
      useRequisicao<string, Error>(async () => {
        throw new Error('falha de rede');
      }),
    );

    await waitFor(() => expect(result.current.carregando).toBe(false));
    expect(result.current.erro).toBeInstanceOf(Error);
  });

  it('aborta na desmontagem e não atualiza estado depois do abort', async () => {
    const avisos = vi.spyOn(console, 'error');
    let liberar: (() => void) | null = null;
    let sinalObservado: AbortSignal | null = null;

    const { unmount } = renderHook(() =>
      useRequisicao<string, Erro>(async (sinal) => {
        sinalObservado = sinal;
        await new Promise<void>((resolve) => {
          liberar = resolve;
        });
        return { ok: true, valor: 'tarde demais' };
      }),
    );

    await waitFor(() => expect(sinalObservado).not.toBeNull());

    unmount();
    expect((sinalObservado as unknown as AbortSignal).aborted).toBe(true);

    await act(async () => {
      liberar?.();
      await Promise.resolve();
    });

    // Escrita depois do desmonte apareceria como aviso do React.
    expect(avisos).not.toHaveBeenCalled();
    avisos.mockRestore();
  });

  it('recarregar descarta o resultado anterior e busca de novo', async () => {
    let chamada = 0;

    const { result } = renderHook(() =>
      useRequisicao<number, Erro>(async () => {
        chamada += 1;
        return { ok: true, valor: chamada };
      }),
    );

    await waitFor(() => expect(result.current.dados).toBe(1));

    act(() => {
      result.current.recarregar();
    });

    await waitFor(() => expect(result.current.dados).toBe(2));
    expect(chamada).toBe(2);
  });
});
