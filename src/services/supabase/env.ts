/**
 * Leitura e validação das variáveis de ambiente do front-end.
 *
 * A validação de build vive em `vite.config.ts` (falha o build quando falta variável).
 * Esta aqui é a rede de segurança de runtime: falha alto e claro, em vez de emitir requisições
 * contra `undefined`.
 */

interface AmbienteSupabase {
  readonly url: string;
  readonly chaveAnonima: string;
}

function exigir(nome: string, valor: string | undefined): string {
  if (valor === undefined || valor.trim() === '') {
    throw new Error(
      `Variável de ambiente ausente: ${nome}. Copie .env.example para .env e preencha os valores.`,
    );
  }
  return valor;
}

export function lerAmbienteSupabase(): AmbienteSupabase {
  return {
    url: exigir('VITE_SUPABASE_URL', import.meta.env.VITE_SUPABASE_URL),
    chaveAnonima: exigir('VITE_SUPABASE_ANON_KEY', import.meta.env.VITE_SUPABASE_ANON_KEY),
  };
}
