/**
 * Cobre `turmas_do_professor()` (migração `20260811120400_funcoes_rls.sql`) **pelo que é
 * provável hoje**: a função existe e devolve conjunto vazio para todo professor, porque
 * `class_teachers` ainda não existe (`data-model.md` §2.3 declara a função como stub).
 *
 * Este teste NÃO prova delimitação de alcance — FR-036 só fica coberto quando a feature de turmas
 * chegar. T083.
 */
import { describe, expect, it } from 'vitest';
import { clienteDeServico, criarUsuarioDeTeste } from './apoio/clientes';

describe('RLS — turmas_do_professor (stub)', () => {
  it('devolve conjunto vazio para um professor com vínculo', async () => {
    const admin = clienteDeServico();
    const professor = await admin
      .from('teachers')
      .insert({ full_name: `Professor stub ${Date.now()}` })
      .select('id')
      .single();

    if (professor.error !== null || professor.data === null) {
      throw new Error(`Falha ao semear professor: ${professor.error?.message}`);
    }

    const usuario = await criarUsuarioDeTeste(['professor'], {
      teacherId: professor.data.id as string,
    });

    const { data, error } = await usuario.cliente.rpc('turmas_do_professor');

    expect(error).toBeNull();
    expect(data).toEqual([]);
  }, 30_000);

  it('devolve nulo (nenhuma linha) para quem não tem vínculo de professor', async () => {
    const usuario = await criarUsuarioDeTeste(['secretaria']);

    const { data, error } = await usuario.cliente.rpc('turmas_do_professor');

    // A função é `select … where exists(…)`: sem vínculo, a condição é falsa e a função não
    // devolve linha nenhuma — o cliente recebe `null`, não um array vazio.
    expect(error).toBeNull();
    expect(data).toBeNull();
  });
});
