/**
 * `POST /functions/v1/auth-login` — contenção por tentativas, resposta em tempo constante,
 * `credenciais_invalidas` único para e-mail inexistente e senha errada (`contracts/edge-functions.md`
 * §1; FR-002 a FR-004, FR-007; SC-004; R-07).
 *
 * Chamada sem JWT: a única identidade que importa é a que a senha prova.
 */
import { createClient } from 'npm:@supabase/supabase-js@2';
import { respostaErro, respostaJson, tratarPreflight } from '../_shared/resposta.ts';

const PISO_DE_TEMPO_MS = 350;
const JANELA_DE_CONTENCAO_MS = 15 * 60 * 1000;
const LIMITE_DE_TENTATIVAS = 5;

interface CorpoDaRequisicao {
  readonly email?: unknown;
  readonly senha?: unknown;
}

async function hashDoIp(ip: string, pepper: string): Promise<string> {
  const bytes = new TextEncoder().encode(`${ip}:${pepper}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function enderecoDoCliente(requisicao: Request): string {
  const encaminhado = requisicao.headers.get('x-forwarded-for');
  if (encaminhado !== null) return encaminhado.split(',')[0]?.trim() ?? 'desconhecido';
  return requisicao.headers.get('cf-connecting-ip') ?? 'desconhecido';
}

Deno.serve(async (requisicao) => {
  const inicio = Date.now();

  const preflight = tratarPreflight(requisicao);
  if (preflight !== null) return preflight;

  // 6. Piso de tempo: toda resposta espera até ~350 ms desde o início, iguala os caminhos e
  // fecha o canal lateral de tempo (SC-004) — envolve toda saída da função.
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

  // SUPABASE_URL, SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY são injetadas pela plataforma em
  // toda Edge Function, como SUPABASE_URL e a service role já documentadas em `contracts/
  // edge-functions.md` §4 — a anônima segue a mesma regra, só não está listada ali por ser óbvia.
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const pepper = Deno.env.get('LOGIN_IP_PEPPER') ?? '';

  if (supabaseUrl === undefined || serviceRoleKey === undefined || anonKey === undefined) {
    return comPisoDeTempo(respostaErro('indisponivel', 503));
  }

  let corpo: CorpoDaRequisicao;
  try {
    corpo = (await requisicao.json()) as CorpoDaRequisicao;
  } catch {
    return comPisoDeTempo(respostaErro('credenciais_invalidas', 401));
  }

  if (typeof corpo.email !== 'string' || typeof corpo.senha !== 'string' || corpo.senha === '') {
    return comPisoDeTempo(respostaErro('credenciais_invalidas', 401));
  }

  const email = corpo.email.trim().toLowerCase();
  const senha = corpo.senha;
  const ip = enderecoDoCliente(requisicao);
  const ipHash = await hashDoIp(ip, pepper);

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 1 e 2: conta falhas dos últimos 15 min por conta e por origem. Atingido o limite, nem tenta
  // autenticar — a senha correta também é recusada (R-07).
  const desde = new Date(Date.now() - JANELA_DE_CONTENCAO_MS).toISOString();

  const [porConta, porOrigem] = await Promise.all([
    admin
      .from('login_attempts')
      .select('id', { count: 'exact', head: true })
      .eq('email_normalized', email)
      .eq('succeeded', false)
      .gte('attempted_at', desde),
    admin
      .from('login_attempts')
      .select('id', { count: 'exact', head: true })
      .eq('ip_hash', ipHash)
      .eq('succeeded', false)
      .gte('attempted_at', desde),
  ]);

  const contido =
    (porConta.count ?? 0) >= LIMITE_DE_TENTATIVAS || (porOrigem.count ?? 0) >= LIMITE_DE_TENTATIVAS;

  if (contido) {
    const liberadoEmSegundos = Math.ceil(JANELA_DE_CONTENCAO_MS / 1000);
    return comPisoDeTempo(
      respostaErro(
        'contido_por_tentativas',
        429,
        { liberadoEmSegundos },
        {
          'Retry-After': String(liberadoEmSegundos),
        },
      ),
    );
  }

  // 3. Delega ao GoTrue com a chave anônima — é a mesma porta que qualquer cliente público usa.
  const publico = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: sessaoDados, error: erroDeEntrada } = await publico.auth.signInWithPassword({
    email,
    password: senha,
  });

  if (erroDeEntrada !== null || sessaoDados.session === null) {
    await admin
      .from('login_attempts')
      .insert({ email_normalized: email, ip_hash: ipHash, succeeded: false });
    return comPisoDeTempo(respostaErro('credenciais_invalidas', 401));
  }

  // 4. Sucesso no GoTrue — mas a situação da conta ainda decide.
  const { data: perfil } = await admin
    .from('profiles')
    .select('status')
    .eq('id', sessaoDados.session.user.id)
    .maybeSingle();

  if (perfil === null || perfil.status !== 'ativo') {
    // A sessão emitida não é devolvida ao cliente — nunca sai desta função (contrato §2).
    await admin
      .from('login_attempts')
      .insert({ email_normalized: email, ip_hash: ipHash, succeeded: false });
    return comPisoDeTempo(
      respostaErro('conta_indisponivel', 403, {
        situacao: perfil?.status ?? 'desativado',
      }),
    );
  }

  // 5. Sucesso e ativo: limpa as falhas da conta, grava o acerto, atualiza o último acesso.
  await Promise.all([
    admin.from('login_attempts').delete().eq('email_normalized', email).eq('succeeded', false),
    admin
      .from('login_attempts')
      .insert({ email_normalized: email, ip_hash: ipHash, succeeded: true }),
    admin
      .from('profiles')
      .update({ last_sign_in_at: new Date().toISOString() })
      .eq('id', sessaoDados.session.user.id),
  ]);

  return comPisoDeTempo(
    respostaJson(
      {
        session: {
          access_token: sessaoDados.session.access_token,
          refresh_token: sessaoDados.session.refresh_token,
          expires_in: sessaoDados.session.expires_in,
        },
      },
      200,
    ),
  );
});
