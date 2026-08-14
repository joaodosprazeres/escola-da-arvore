/**
 * `POST /functions/v1/password-recovery` — recuperação silenciosa de senha
 * (`contracts/edge-functions.md` §3; FR-029 a FR-032). Chamada sem JWT.
 *
 * Resposta **sempre** `200 { ok: true }`, com o mesmo piso de tempo de `auth-login`, para nunca
 * revelar se o e-mail existe, está bloqueado ou desativado (FR-030, SC-004).
 *
 * O envio em si usa `resetPasswordForEmail` (GoTrue), que gera um token novo e invalida
 * automaticamente qualquer link anterior — é por isso que `password_reset_requests` não precisa
 * repetir essa invalidação para a segurança do link; a tabela é o registro do ciclo de vida do
 * pedido (FR-031) e sustenta o índice único parcial de um pedido vivo por usuário.
 */
import { createClient } from 'npm:@supabase/supabase-js@2';
import { respostaErro, respostaJson, tratarPreflight } from '../_shared/resposta.ts';

const PISO_DE_TEMPO_MS = 350;

interface CorpoDaRequisicao {
  readonly email?: unknown;
}

Deno.serve(async (requisicao) => {
  const inicio = Date.now();

  const preflight = tratarPreflight(requisicao);
  if (preflight !== null) return preflight;

  async function comPisoDeTempo(resposta: Response): Promise<Response> {
    const decorrido = Date.now() - inicio;
    if (decorrido < PISO_DE_TEMPO_MS) {
      await new Promise((resolver) => setTimeout(resolver, PISO_DE_TEMPO_MS - decorrido));
    }
    return resposta;
  }

  if (requisicao.method !== 'POST') {
    return comPisoDeTempo(respostaErro('indisponivel', 503));
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const appBaseUrl = Deno.env.get('APP_BASE_URL');

  if (supabaseUrl === undefined || serviceRoleKey === undefined || anonKey === undefined) {
    return comPisoDeTempo(respostaErro('indisponivel', 503));
  }

  let corpo: CorpoDaRequisicao;
  try {
    corpo = (await requisicao.json()) as CorpoDaRequisicao;
  } catch {
    return comPisoDeTempo(respostaJson({ ok: true }, 200));
  }

  if (typeof corpo.email !== 'string' || corpo.email.trim() === '') {
    return comPisoDeTempo(respostaJson({ ok: true }, 200));
  }

  const email = corpo.email.trim().toLowerCase();

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: perfil } = await admin
    .from('profiles')
    .select('id, status')
    .eq('email', email)
    .maybeSingle<{ id: string; status: string }>();

  // E-mail inexistente, bloqueado ou desativado: nada acontece, mas a resposta é idêntica
  // (FR-030; US4 cenário 5).
  if (perfil !== null && perfil !== undefined && perfil.status === 'ativo') {
    await admin
      .from('password_reset_requests')
      .update({ superseded_at: new Date().toISOString() })
      .eq('user_id', perfil.id)
      .is('consumed_at', null)
      .is('superseded_at', null);

    await admin.from('password_reset_requests').insert({ user_id: perfil.id });

    const publico = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    await publico.auth.resetPasswordForEmail(email, {
      redirectTo: appBaseUrl === undefined ? undefined : `${appBaseUrl}/redefinir-senha`,
    });
  }

  return comPisoDeTempo(respostaJson({ ok: true }, 200));
});
