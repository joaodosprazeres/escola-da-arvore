/**
 * Instância única de `supabase-js` (Princípio IV: esta pasta é a única que o conhece).
 *
 * `persistSession` mantém a sessão entre recargas; a expiração continua decidida pelo servidor —
 * `sessao_valida()` em RLS reprova a sessão vencida mesmo com token ainda formalmente válido
 * (R-08, FR-007).
 */
import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { lerAmbienteSupabase } from './env';
import type { Database } from './database.types';

export type ClienteSupabase = SupabaseClient<Database>;

let instancia: ClienteSupabase | null = null;

export function obterCliente(): ClienteSupabase {
  if (instancia === null) {
    const ambiente = lerAmbienteSupabase();

    instancia = createClient<Database>(ambiente.url, ambiente.chaveAnonima, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
      },
    });
  }

  return instancia;
}

/** Endereço das Edge Functions, derivado da mesma URL do projeto. */
export function urlDaFuncao(nome: string): string {
  return `${lerAmbienteSupabase().url}/functions/v1/${nome}`;
}

export function chaveAnonima(): string {
  return lerAmbienteSupabase().chaveAnonima;
}
