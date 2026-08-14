/**
 * US3-5, FR-041 — `update` e `delete` em `audit_log` são recusados para todos os perfis, inclusive
 * Administrador. Três camadas somadas: ausência de política, `revoke`/ausência de `grant`, trigger
 * — válido até contra conexão privilegiada. T082.
 *
 * A linha semente nasce por uma das funções `security definer` de `admin_rpc.sql` (o caminho real
 * de produção), não por insert direto: a service role nunca recebeu `grant insert` em `audit_log`
 * — é exatamente essa ausência que fecha a segunda camada.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { clienteDeServico, criarUsuarioDeTeste } from './apoio/clientes';
import type { UsuarioDeTeste } from './apoio/clientes';

describe('RLS — auditoria imutável', () => {
  let administrador: UsuarioDeTeste;
  let linhaId: number;

  beforeAll(async () => {
    administrador = await criarUsuarioDeTeste(['administrador']);
    const alvo = await criarUsuarioDeTeste(['secretaria']);

    const admin = clienteDeServico();
    const { data, error } = await admin.rpc('admin_mudar_situacao', {
      p_usuario_id: alvo.id,
      p_situacao: 'bloqueado',
      p_acao: 'usuario_bloqueado',
      p_autor: administrador.id,
    });
    if (error !== null) throw new Error(`Falha ao semear audit_log via RPC: ${error.message}`);

    const linha = await administrador.cliente
      .from('audit_log')
      .select('id')
      .eq('target_user_id', alvo.id)
      .single();
    if (linha.error !== null || linha.data === null) {
      throw new Error(`Falha ao localizar a linha semeada: ${linha.error?.message}`);
    }
    linhaId = linha.data.id as number;
    expect(data).toBeTruthy();
  }, 30_000);

  it('Administrador não consegue alterar uma linha de audit_log', async () => {
    const { error } = await administrador.cliente
      .from('audit_log')
      .update({ action: 'usuario_desbloqueado' })
      .eq('id', linhaId);

    expect(error).not.toBeNull();
  });

  it('Administrador não consegue apagar uma linha de audit_log', async () => {
    const { error } = await administrador.cliente.from('audit_log').delete().eq('id', linhaId);

    expect(error).not.toBeNull();
  });

  it('mesmo a conexão privilegiada (service role) é recusada — sem grant, o trigger nem chega a ser a única barreira', async () => {
    const admin = clienteDeServico();
    const { error } = await admin
      .from('audit_log')
      .update({ action: 'usuario_desbloqueado' })
      .eq('id', linhaId);

    expect(error).not.toBeNull();
  });

  it('a linha original permanece íntegra', async () => {
    const { data } = await administrador.cliente
      .from('audit_log')
      .select('action')
      .eq('id', linhaId)
      .single();

    expect(data?.action).toBe('usuario_bloqueado');
  });
});
