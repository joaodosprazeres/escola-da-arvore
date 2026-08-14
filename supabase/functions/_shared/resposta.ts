/**
 * CORS restrito a `ALLOWED_ORIGIN` e serialização de erro sem vazar detalhe (FR-033, FR-039).
 * Compartilhado pelas três Edge Functions — a única superfície com privilégio acima do usuário
 * autenticado (`contracts/edge-functions.md`).
 */

const CABECALHOS_CORS_BASE = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  Vary: 'Origin',
};

export function origemPermitida(): string {
  return Deno.env.get('ALLOWED_ORIGIN') ?? '';
}

/** Responde ao preflight; `null` quando a requisição não é `OPTIONS`. */
export function tratarPreflight(requisicao: Request): Response | null {
  if (requisicao.method !== 'OPTIONS') return null;

  return new Response(null, {
    status: 204,
    headers: { 'Access-Control-Allow-Origin': origemPermitida(), ...CABECALHOS_CORS_BASE },
  });
}

export function respostaJson(
  corpo: unknown,
  status: number,
  cabecalhosExtras: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': origemPermitida(),
      ...CABECALHOS_CORS_BASE,
      ...cabecalhosExtras,
    },
  });
}

/** Corpo de erro é sempre `{ codigo, … }` — nenhum texto ou detalhe de infraestrutura (FR-033). */
export function respostaErro(
  codigo: string,
  status: number,
  extra: Record<string, unknown> = {},
  cabecalhosExtras: Record<string, string> = {},
): Response {
  return respostaJson({ codigo, ...extra }, status, cabecalhosExtras);
}
