/**
 * `contracts/rls-e-rotas.md` §A.3 — as 10 linhas da tabela de contrato (linhas 2 e 8 ficam de
 * fora: a 2 está formalmente diferida por não haver tabela de alunos ainda, e a 8 tem suíte própria
 * em `uniao-de-perfis.test.ts`). Roda contra `supabase start` local (CT-3). T079.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  clienteAnonimo,
  clienteDeServico,
  criarUsuarioDeTeste,
  definirSituacao,
} from './apoio/clientes';
import type { UsuarioDeTeste } from './apoio/clientes';

describe('RLS — contrato de perfis (contracts/rls-e-rotas.md §A.3)', () => {
  let professor: UsuarioDeTeste;
  let secretaria: UsuarioDeTeste;
  let coordenacao: UsuarioDeTeste;
  let desativado: UsuarioDeTeste;

  beforeAll(async () => {
    const admin = clienteDeServico();
    const professorRegistrado = await admin
      .from('teachers')
      .insert({ full_name: `Professor do contrato ${Date.now()}` })
      .select('id')
      .single();
    if (professorRegistrado.error !== null || professorRegistrado.data === null) {
      throw new Error(`Falha ao semear professor: ${professorRegistrado.error?.message}`);
    }

    professor = await criarUsuarioDeTeste(['professor'], {
      teacherId: professorRegistrado.data.id as string,
    });
    secretaria = await criarUsuarioDeTeste(['secretaria']);
    coordenacao = await criarUsuarioDeTeste(['coordenacao']);
    desativado = await criarUsuarioDeTeste(['secretaria']);
  }, 30_000);

  afterAll(async () => {
    await definirSituacao(desativado.id, 'ativo');
  });

  it('linha 1 — professor: select em profiles devolve só a própria linha (US3-1, FR-035)', async () => {
    const { data, error } = await professor.cliente.from('profiles').select('*');

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data?.[0]?.id).toBe(professor.id);
  });

  it('linha 3 — secretaria: insert em profiles é recusado (US3-3, FR-020)', async () => {
    const { error } = await secretaria.cliente
      .from('profiles')
      .insert({ id: crypto.randomUUID(), full_name: 'Invasor', email: 'invasor@escola.local' });

    expect(error).not.toBeNull();
  });

  it('linha 3 — secretaria: insert em user_roles é recusado (US3-3, FR-020)', async () => {
    const { error } = await secretaria.cliente
      .from('user_roles')
      .insert({ user_id: secretaria.id, role: 'administrador', granted_by: secretaria.id });

    expect(error).not.toBeNull();
  });

  it('linha 4 — coordenacao: select em audit_log não devolve nada (metade negativa; US3-4, FR-037)', async () => {
    const { data, error } = await coordenacao.cliente.from('audit_log').select('*');

    if (error !== null) {
      expect(error).not.toBeNull();
    } else {
      expect(data).toHaveLength(0);
    }
  });

  it('linha 5 — não-administrador: update em audit_log é recusado (US3-5, FR-041)', async () => {
    const { error } = await coordenacao.cliente
      .from('audit_log')
      .update({ action: 'usuario_criado' })
      .eq('id', 1);

    expect(error).not.toBeNull();
  });

  it('linha 5 — não-administrador: delete em audit_log é recusado (US3-5, FR-041)', async () => {
    const { error } = await coordenacao.cliente.from('audit_log').delete().eq('id', 1);

    expect(error).not.toBeNull();
  });

  it('linha 6 — anônimo: select em profiles não devolve nada (US3-6, FR-038)', async () => {
    const { data, error } = await clienteAnonimo().from('profiles').select('*');

    if (error !== null) {
      expect(error).not.toBeNull();
    } else {
      expect(data).toHaveLength(0);
    }
  });

  it('linha 7 — usuário desativado com JWT ainda válido: select não devolve nada (US3-7, SC-009)', async () => {
    // Entra ainda ativo (JWT válido) e só depois é desativado — a política nega na próxima
    // requisição, sem esperar o token expirar (SC-009).
    const conta = await criarUsuarioDeTeste(['secretaria']);
    await definirSituacao(conta.id, 'desativado');

    const { data, error } = await conta.cliente.from('profiles').select('*');

    if (error !== null) {
      expect(error).not.toBeNull();
    } else {
      expect(data).toHaveLength(0);
    }
  });

  it('linha 9 — professor: update de profiles.status é recusado (coluna não concedida; FR-020)', async () => {
    const { error } = await professor.cliente
      .from('profiles')
      .update({ status: 'ativo' })
      .eq('id', professor.id);

    expect(error).not.toBeNull();
  });

  it('linha 10 — professor: active_view para perfil não atribuído é recusado pelo with check (FR-012)', async () => {
    const { error } = await professor.cliente
      .from('profiles')
      .update({ active_view: 'administrador' })
      .eq('id', professor.id);

    expect(error).not.toBeNull();
  });

  it('professor pode definir active_view para um perfil que de fato possui', async () => {
    const { error } = await professor.cliente
      .from('profiles')
      .update({ active_view: 'professor' })
      .eq('id', professor.id);

    expect(error).toBeNull();
  });

  it('sanity check — o serviço enxerga o total de contas de teste desta suíte', async () => {
    const admin = clienteDeServico();
    const { data, error } = await admin
      .from('profiles')
      .select('id')
      .in('id', [professor.id, secretaria.id, coordenacao.id]);

    expect(error).toBeNull();
    expect(data).toHaveLength(3);
  });
});
