# escola-da-arvore

Web app de gestão escolar.

## Stack

- **Front-end**: React 19 + TypeScript (`strict`), Vite 7, `react-router-dom` v7 (modo declarativo),
  `motion`, `lucide-react` (restrito a `src/components/atoms/Icone.tsx`).
- **Estilo**: Tailwind CSS 4 (`@tailwindcss/vite`), zero runtime — tokens em
  [`docs/design-system.md`](docs/design-system.md).
- **Dados**: Supabase (Postgres com Row Level Security em todas as tabelas, Auth/GoTrue, Edge
  Functions em Deno) — único ponto de import de `@supabase/supabase-js` é `src/services/supabase/`.
- **Testes**: Vitest em quatro suítes (`unit`, `integration` contra um fake in-memory das portas de
  dados, `rls` contra `supabase start` local, `a11y` com `axe-core`).

Arquitetura, princípios de governança e fronteiras impostas por lint estão descritos na
[constituição do projeto](.specify/memory/constitution.md).

## Começando

```bash
npm install
supabase start                  # Postgres, Auth, Studio, Inbucket locais
supabase db reset               # aplica migrações + seed.sql
SENHA_ADMIN_SEED='...' npm run db:reset   # define a senha das contas de seed (dev local)
```

`.env` (na raiz) precisa de `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` — veja `.env.example`. O
build falha de propósito sem essas variáveis (`src/services/supabase/env.ts`).

```bash
npm run dev                     # aplicação em http://localhost:5173
supabase functions serve        # auth-login, admin-users, password-recovery
```

## Comandos

```bash
npm run typecheck        # tsc --noEmit
npm run lint             # eslint + prettier --check
npm run format           # prettier --write

npm run test:unit        # src/lib/ e src/services/ puros
npm run test:integration # componentes reais contra o fake in-memory das portas
npm run test:rls         # requisições diretas ao Supabase local, por perfil (nunca produção)
npm run test:a11y        # axe-core sobre as telas

npm run build             # tsc --noEmit + vite build + 404.html (deep link em hospedagem estática)
npm run preview
npm run types:gen         # regenera src/services/supabase/database.types.ts a partir do schema local
```

Detalhes de cada feature — spec, plano técnico, contratos e roteiros de verificação manual — ficam
em `specs/<feature>/`.
