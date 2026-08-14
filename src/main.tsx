/**
 * Bootstrap único: monta as portas reais + o store de sessão UMA vez, o Context de injeção
 * (R-03), o roteador declarativo sobre `src/config.ts` (R-04) e o `LazyMotion` com movimento
 * reduzido honrado por padrão (design system §6.5).
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, useRoutes } from 'react-router-dom';
import { LazyMotion, MotionConfig, domAnimation } from 'motion/react';
import './styles/tokens.css';
import { PortasProvider } from './services/PortasProvider';
import type { Portas } from './services/portas';
import { criarAuthAdapter } from './services/supabase/authAdapter';
import { criarUsuariosAdapter } from './services/supabase/usuariosAdapter';
import { criarAuditoriaAdapter } from './services/supabase/auditoriaAdapter';
import { criarSessionStore } from './services/auth/criarSessionStore';
import { rotasDaAplicacao } from './rotas';

const auth = criarAuthAdapter();

const portas: Portas = {
  auth,
  usuarios: criarUsuariosAdapter(),
  auditoria: criarAuditoriaAdapter(),
  sessao: criarSessionStore(auth),
};

function App() {
  return useRoutes(rotasDaAplicacao);
}

const raiz = document.getElementById('raiz');
if (raiz === null) throw new Error('Elemento #raiz não encontrado em index.html.');

createRoot(raiz).render(
  <StrictMode>
    <PortasProvider portas={portas}>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <LazyMotion features={domAnimation}>
          <MotionConfig reducedMotion="user">
            <App />
          </MotionConfig>
        </LazyMotion>
      </BrowserRouter>
    </PortasProvider>
  </StrictMode>,
);
