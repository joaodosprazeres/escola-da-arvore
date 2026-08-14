/**
 * Apoio comum da suíte `test:rls` (contracts/rls-e-rotas.md §A.3): um cliente por perfil, sempre
 * pela mesma porta que o PostgREST oferece a qualquer chamador — nunca um atalho de infraestrutura.
 *
 * Roda contra `supabase start` **local e efêmero** (CT-3), nunca produção — por isso a service role
 * só existe aqui, para semear as contas de teste, nunca para ler dado de domínio no lugar da política
 * sob teste.
 */
import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

export const URL_BASE = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321';
export const CHAVE_ANONIMA = process.env.SUPABASE_ANON_KEY ?? '';
const CHAVE_DE_SERVICO = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

if (!/^https?:\/\/(127\.0\.0\.1|localhost)/.test(URL_BASE)) {
  throw new Error(
    `test:rls recusado: ${URL_BASE} não é uma instância local. Esta suíte só roda contra ` +
      '`supabase start` local e efêmero (CT-3, R-14).',
  );
}

export function clienteDeServico(): SupabaseClient {
  return createClient(URL_BASE, CHAVE_DE_SERVICO, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function clienteAnonimo(): SupabaseClient {
  return createClient(URL_BASE, CHAVE_ANONIMA, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export type Perfil = 'administrador' | 'secretaria' | 'coordenacao' | 'professor';

export interface UsuarioDeTeste {
  readonly id: string;
  readonly email: string;
  readonly cliente: SupabaseClient;
}

let contador = 0;

/**
 * Cria uma conta ativa (fora do primeiro acesso) com os perfis dados, via Admin API — a mesma
 * rotina de `supabase/functions/admin-users`, sem repeti-la aqui — e devolve um cliente já
 * autenticado com o JWT real dessa conta.
 */
export async function criarUsuarioDeTeste(
  perfis: readonly Perfil[],
  opcoes: { readonly teacherId?: string } = {},
): Promise<UsuarioDeTeste> {
  contador += 1;
  const admin = clienteDeServico();
  const email = `rls-teste-${Date.now()}-${contador}@escola.local`;
  const senha = 'senha-de-teste-rls-123';

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    user_metadata: {
      full_name: `Teste RLS ${contador}`,
      perfis,
      teacher_id: opcoes.teacherId ?? null,
      first_access: false,
    },
  });

  if (error !== null || data.user === null) {
    throw new Error(`Falha ao criar usuário de teste RLS: ${error?.message}`);
  }

  const cliente = clienteAnonimo();
  const { error: erroDeEntrada } = await cliente.auth.signInWithPassword({
    email,
    password: senha,
  });

  if (erroDeEntrada !== null) {
    throw new Error(`Falha ao entrar com o usuário de teste RLS: ${erroDeEntrada.message}`);
  }

  return { id: data.user.id, email, cliente };
}

export async function definirSituacao(
  usuarioId: string,
  situacao: 'ativo' | 'bloqueado' | 'desativado',
): Promise<void> {
  const admin = clienteDeServico();
  const { error } = await admin.from('profiles').update({ status: situacao }).eq('id', usuarioId);
  if (error !== null) throw new Error(`Falha ao mudar situação: ${error.message}`);
}
