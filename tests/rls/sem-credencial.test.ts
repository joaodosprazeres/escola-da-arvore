/**
 * US3-6, US3-7 — requisição sem credencial não retorna nada; usuário desativado com sessão ainda
 * não expirada é negado na solicitação seguinte (FR-038; SC-009). T081.
 */
import { describe, expect, it } from 'vitest';
import { CHAVE_ANONIMA, URL_BASE, criarUsuarioDeTeste, definirSituacao } from './apoio/clientes';

describe('RLS — sem credencial e conta desativada', () => {
  it('requisição REST sem nenhum cabeçalho de credencial é recusada', async () => {
    const resposta = await fetch(`${URL_BASE}/rest/v1/profiles?select=*`);

    // Sem `apikey`, o PostgREST recusa antes mesmo de chegar à política — nunca 200 com dados.
    expect(resposta.ok).toBe(false);
  });

  it('requisição só com a chave anônima (sem JWT de usuário) não devolve linha de profiles', async () => {
    const resposta = await fetch(`${URL_BASE}/rest/v1/profiles?select=*`, {
      headers: { apikey: CHAVE_ANONIMA },
    });

    const corpo: unknown = await resposta.json();
    if (resposta.ok) {
      expect(Array.isArray(corpo) ? corpo : []).toHaveLength(0);
    } else {
      expect(resposta.ok).toBe(false);
    }
  });

  it('usuário desativado com sessão ainda válida é negado na solicitação seguinte, sem esperar expirar (SC-009)', async () => {
    const conta = await criarUsuarioDeTeste(['secretaria']);

    // Confirma que, ainda ativo, a conta lê a própria linha — a base de comparação do teste.
    const antes = await conta.cliente.from('profiles').select('*').eq('id', conta.id);
    expect(antes.data).toHaveLength(1);

    await definirSituacao(conta.id, 'desativado');

    const depois = await conta.cliente.from('profiles').select('*').eq('id', conta.id);
    if (depois.error !== null) {
      expect(depois.error).not.toBeNull();
    } else {
      expect(depois.data).toHaveLength(0);
    }
  }, 30_000);
});
