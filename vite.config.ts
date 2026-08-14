import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/**
 * Variáveis obrigatórias do front-end. A ausência de qualquer uma **falha o build** com mensagem
 * clara, em vez de gerar `dist/` quebrado em runtime (seção Deploy da constituição).
 */
const VARIAVEIS_OBRIGATORIAS = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'] as const;

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  if (command === 'build') {
    const ausentes = VARIAVEIS_OBRIGATORIAS.filter((nome) => !env[nome]);
    if (ausentes.length > 0) {
      throw new Error(
        `Build interrompido: variáveis de ambiente obrigatórias ausentes — ${ausentes.join(', ')}. ` +
          'Copie .env.example para .env e preencha os valores antes de compilar.',
      );
    }
  }

  return {
    // GitHub Pages serve a aplicação sob o caminho do repositório; localmente é a raiz.
    base: env.VITE_BASE_PATH ?? '/',
    plugins: [react(), tailwindcss()],
    server: { port: 5173 },
  };
});
