/**
 * SC-004; R-07 — `auth-login` contra o Supabase local: e-mail inexistente e senha errada devolvem
 * o mesmo código, o mesmo corpo, e o tempo de resposta cai na mesma faixa (piso de ~350 ms).
 *
 * Roda contra `supabase start` **local e efêmero** (CT-3), nunca produção. Depende do Edge Runtime
 * — em ambientes sem acesso à rede para os imports remotos do Deno (`deno.land`, `jsr.io`), a
 * função `auth-login` não sobe e esta suíte fica vermelha por infraestrutura, não por regra
 * quebrada; ver nota em `quickstart.md`.
 */
import { describe, expect, it } from 'vitest';

const URL_BASE = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321';
const CHAVE_ANONIMA = process.env.SUPABASE_ANON_KEY ?? '';

interface RespostaDeEntrada {
  readonly codigo?: string;
}

async function chamarAuthLogin(
  email: string,
  senha: string,
): Promise<{
  readonly status: number;
  readonly corpo: RespostaDeEntrada;
  readonly duracaoMs: number;
}> {
  const inicio = performance.now();

  const resposta = await fetch(`${URL_BASE}/functions/v1/auth-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: CHAVE_ANONIMA },
    body: JSON.stringify({ email, senha }),
  });

  const corpo = (await resposta.json()) as RespostaDeEntrada;
  const duracaoMs = performance.now() - inicio;

  return { status: resposta.status, corpo, duracaoMs };
}

describe('auth-login — piso de tempo e indistinguibilidade', () => {
  it('e-mail inexistente e senha errada têm o mesmo código, o mesmo corpo e tempos na mesma faixa', async () => {
    const NUMERO_DE_EXECUCOES = 10;
    const temposInexistente: number[] = [];
    const temposSenhaErrada: number[] = [];

    for (let i = 0; i < NUMERO_DE_EXECUCOES; i += 1) {
      const inexistente = await chamarAuthLogin(`nao-existe-${i}@escola.local`, 'qualquer-coisa');
      expect(inexistente.status).toBe(401);
      expect(inexistente.corpo).toEqual({ codigo: 'credenciais_invalidas' });
      expect(inexistente.duracaoMs).toBeGreaterThanOrEqual(340);
      temposInexistente.push(inexistente.duracaoMs);

      const senhaErrada = await chamarAuthLogin('admin@escola.local', `errada-${i}`);
      expect(senhaErrada.status).toBe(401);
      expect(senhaErrada.corpo).toEqual({ codigo: 'credenciais_invalidas' });
      expect(senhaErrada.duracaoMs).toBeGreaterThanOrEqual(340);
      temposSenhaErrada.push(senhaErrada.duracaoMs);
    }

    const mediana = (valores: readonly number[]): number => {
      const ordenados = [...valores].sort((a, b) => a - b);
      const meio = Math.floor(ordenados.length / 2);
      return ordenados.length % 2 === 0
        ? ((ordenados[meio - 1] ?? 0) + (ordenados[meio] ?? 0)) / 2
        : (ordenados[meio] ?? 0);
    };

    const diferencaDeMediana = Math.abs(mediana(temposInexistente) - mediana(temposSenhaErrada));
    expect(diferencaDeMediana).toBeLessThan(50);
  }, 60_000);

  it('contenção por tentativas devolve 429 com Retry-After após 5 falhas em 15 min', async () => {
    const email = `contencao-${Date.now()}@escola.local`;

    for (let i = 0; i < 5; i += 1) {
      await chamarAuthLogin(email, 'senha-errada');
    }

    const resposta = await fetch(`${URL_BASE}/functions/v1/auth-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: CHAVE_ANONIMA },
      body: JSON.stringify({ email, senha: 'senha-errada' }),
    });

    expect(resposta.status).toBe(429);
    expect(resposta.headers.get('Retry-After')).not.toBeNull();

    const corpo = (await resposta.json()) as { codigo?: string };
    expect(corpo.codigo).toBe('contido_por_tentativas');
  }, 30_000);
});
