/**
 * US6-4, FR-042 — não-Administrador tem a consulta ao histórico negada. Complementa
 * `auditoria-imutavel.test.ts` (T082), que cobre a imutabilidade (US6-3). T109.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { clienteDeServico, criarUsuarioDeTeste } from './apoio/clientes';

describe('RLS — acesso ao histórico de auditoria', () => {
  let professorId: string;

  beforeAll(async () => {
    const admin = clienteDeServico();
    const professor = await admin
      .from('teachers')
      .insert({ full_name: `Professor auditoria ${Date.now()}` })
      .select('id')
      .single();
    if (professor.error !== null || professor.data === null) {
      throw new Error(`Falha ao semear professor: ${professor.error?.message}`);
    }
    professorId = professor.data.id as string;
  }, 30_000);

  it('secretaria não enxerga nenhuma linha de audit_log', async () => {
    const usuario = await criarUsuarioDeTeste(['secretaria']);
    const { data, error } = await usuario.cliente.from('audit_log').select('*');
    if (error !== null) {
      expect(error).not.toBeNull();
    } else {
      expect(data).toHaveLength(0);
    }
  });

  it('coordenacao não enxerga nenhuma linha de audit_log', async () => {
    const usuario = await criarUsuarioDeTeste(['coordenacao']);
    const { data, error } = await usuario.cliente.from('audit_log').select('*');
    if (error !== null) {
      expect(error).not.toBeNull();
    } else {
      expect(data).toHaveLength(0);
    }
  });

  it('professor não enxerga nenhuma linha de audit_log', async () => {
    const usuario = await criarUsuarioDeTeste(['professor'], { teacherId: professorId });
    const { data, error } = await usuario.cliente.from('audit_log').select('*');
    if (error !== null) {
      expect(error).not.toBeNull();
    } else {
      expect(data).toHaveLength(0);
    }
  });

  it('administrador enxerga o histórico', async () => {
    const administrador = await criarUsuarioDeTeste(['administrador']);

    const { error } = await administrador.cliente.from('audit_log').select('*').limit(1);

    expect(error).toBeNull();
  });
});
