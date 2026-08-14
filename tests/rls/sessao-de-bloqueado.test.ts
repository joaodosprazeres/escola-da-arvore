/**
 * US5-2, SC-009 — usuário bloqueado com sessão aberta é negado na solicitação seguinte, sem
 * esperar expiração. T101.
 */
import { describe, expect, it } from 'vitest';
import { criarUsuarioDeTeste, definirSituacao } from './apoio/clientes';

describe('RLS — sessão de usuário bloqueado', () => {
  it('bloquear a conta nega a próxima solicitação, com o mesmo JWT ainda formalmente válido', async () => {
    const conta = await criarUsuarioDeTeste(['secretaria']);

    const antes = await conta.cliente.from('profiles').select('*').eq('id', conta.id);
    expect(antes.data).toHaveLength(1);

    await definirSituacao(conta.id, 'bloqueado');

    const depois = await conta.cliente.from('profiles').select('*').eq('id', conta.id);
    if (depois.error !== null) {
      expect(depois.error).not.toBeNull();
    } else {
      expect(depois.data).toHaveLength(0);
    }
  }, 30_000);

  it('desbloquear devolve o acesso imediatamente, sem nova entrada', async () => {
    const conta = await criarUsuarioDeTeste(['secretaria']);
    await definirSituacao(conta.id, 'bloqueado');

    const bloqueado = await conta.cliente.from('profiles').select('*').eq('id', conta.id);
    expect(bloqueado.data ?? []).toHaveLength(0);

    await definirSituacao(conta.id, 'ativo');

    const desbloqueado = await conta.cliente.from('profiles').select('*').eq('id', conta.id);
    expect(desbloqueado.error).toBeNull();
    expect(desbloqueado.data).toHaveLength(1);
  }, 30_000);
});
