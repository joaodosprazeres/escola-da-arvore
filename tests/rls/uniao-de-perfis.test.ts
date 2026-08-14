/**
 * US3-8, FR-013 — usuário Coordenação + Professor com a visão de Professor ativa continua
 * alcançando o que a Coordenação alcança: `active_view` não é consultada por política nenhuma.
 * Linha 8 de `contracts/rls-e-rotas.md` §A.3. T080.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { clienteDeServico, criarUsuarioDeTeste } from './apoio/clientes';
import type { UsuarioDeTeste } from './apoio/clientes';

describe('RLS — união de perfis independe da visão ativa', () => {
  let professorVinculado: { id: string; nome: string };
  let outroProfessor: { id: string; nome: string };
  let usuario: UsuarioDeTeste;

  beforeAll(async () => {
    const admin = clienteDeServico();

    const professores = await admin
      .from('teachers')
      .insert([{ full_name: `Vinculado ${Date.now()}` }, { full_name: `Outro ${Date.now()}` }])
      .select('id, full_name');

    if (professores.error !== null || professores.data === null) {
      throw new Error(`Falha ao semear professores: ${professores.error?.message}`);
    }

    professorVinculado = { id: professores.data[0]!.id, nome: professores.data[0]!.full_name };
    outroProfessor = { id: professores.data[1]!.id, nome: professores.data[1]!.full_name };

    usuario = await criarUsuarioDeTeste(['coordenacao', 'professor'], {
      teacherId: professorVinculado.id,
    });

    // A visão ativa nasce no perfil de maior alcance (coordenacao); troca explicitamente para a de
    // professor — é exatamente o cenário que a política NÃO pode enxergar.
    const { error } = await usuario.cliente
      .from('profiles')
      .update({ active_view: 'professor' })
      .eq('id', usuario.id);
    if (error !== null) throw new Error(`Falha ao definir active_view: ${error.message}`);
  }, 30_000);

  it('com a visão de Professor ativa, o select em teachers ainda alcança o que a Coordenação alcança', async () => {
    const { data, error } = await usuario.cliente
      .from('teachers')
      .select('id')
      .in('id', [professorVinculado.id, outroProfessor.id]);

    expect(error).toBeNull();
    // Um professor puro só enxergaria o próprio vínculo (1 linha); a união com coordenacao
    // enxerga também o professor sem vínculo algum com a conta.
    expect(data).toHaveLength(2);
  });

  it('um professor sem o perfil de coordenacao só enxerga o próprio vínculo, para contraste', async () => {
    const soProfessor = await criarUsuarioDeTeste(['professor'], { teacherId: outroProfessor.id });

    const { data, error } = await soProfessor.cliente
      .from('teachers')
      .select('id')
      .in('id', [professorVinculado.id, outroProfessor.id]);

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data?.[0]?.id).toBe(outroProfessor.id);
  });
});
