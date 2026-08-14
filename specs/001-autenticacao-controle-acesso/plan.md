# Implementation Plan: Autenticação e Controle de Acesso por Perfil

**Branch**: `001-autenticacao-controle-acesso` | **Date**: 2026-08-11 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-autenticacao-controle-acesso/spec.md`

## Summary

Primeira funcionalidade P1 do MVP: entrada por e-mail e senha, roteamento para o painel do perfil,
gestão de contas pelo Administrador e — o ponto central — **controle de acesso aplicado na camada de
dados**, não na interface.

A abordagem técnica que sustenta os 48 requisitos:

1. **Row Level Security como autoridade.** Toda política resolve perfis **consultando `user_roles`**,
   nunca claims do JWT. Isso entrega de graça a FR-016 (mudança de perfil vale na próxima ação) e a
   SC-009 (conta bloqueada barrada na solicitação seguinte), que claims em token não conseguem
   entregar por serem defasadas e irrevogáveis.
2. **Três Edge Functions** para o que exige privilégio acima do usuário autenticado: contenção por
   tentativas com resposta em tempo constante (`auth-login`), criação e mudança de perfis com
   auditoria transacional (`admin-users`) e recuperação de senha silenciosa (`password-recovery`).
   Nenhuma chave de serviço no bundle (FR-039).
3. **Sessão sem estado global**: o estado vive num store externo alimentado pela porta de
   autenticação e consumido por `useSyncExternalStore` (API nativa do React 19). Um único Context
   transporta **referências estáveis** — as três portas e o handle do store — e nunca estado: sem
   `useState` no provider, o valor é constante e não propaga re-render. Isso mantém a intenção da
   restrição do usuário (nenhuma cascata de re-render, nenhum estado escondido em provider) e ainda
   entrega a injeção tipada do fake exigida pelos Princípios IV e VIII, sem prop drilling pelos cinco
   níveis de Atomic Design. Ver R-03.
4. **Um único `Guarda`**, montado como rota de layout do `react-router-dom`, deriva todo
   redirecionamento de uma tabela de rotas declarada como dado em `src/config.ts`; nenhuma decisão de
   permissão espalhada por componente. Modo declarativo apenas — sem `loader`/`action`, que puxariam
   I/O para dentro do roteador (R-04).
5. **Autorização sempre em duas camadas**: a UI esconde por conveniência, o banco nega por
   autoridade. A suíte `test:rls` prova a segunda camada emitindo requisições diretas, sem passar
   pelas telas — exatamente o que a User Story 3 pede.

Detalhamento em [research.md](./research.md), [data-model.md](./data-model.md),
[contracts/](./contracts/) e [quickstart.md](./quickstart.md).

## Technical Context

**Language/Version**: TypeScript 5.9 (`strict: true`), React 19.2, Node ≥ 20.19 para build

**Primary Dependencies**:
- Runtime: `react`, `react-dom`, `@supabase/supabase-js` (restrito a `src/services/supabase/`),
  `lucide-react` (restrito a `atoms/Icone.tsx`), `react-router-dom` v7 (modo declarativo; proibido em
  `services/` e `lib/`), `motion` v12 — todos nomeados na tabela do Princípio V (constituição v1.1.0)
- Build: `vite` 7, `@vitejs/plugin-react`, `tailwindcss` 4 + `@tailwindcss/vite` (zero runtime)
- Dev/teste: `vitest`, `@testing-library/react`, `jsdom`, `axe-core`, `supabase` CLI, `eslint`,
  `prettier`

**Storage**: Supabase Postgres com RLS em todas as tabelas; Supabase Auth (GoTrue) para identidade e
sessão; Edge Functions (Deno) para operações privilegiadas

**Testing**: Vitest em quatro camadas — unitária (`lib/`, `services/` puros), integração de fluxo
(componentes reais contra o fake in-memory das portas), contrato de dados (requisições diretas contra
`supabase start` local) e acessibilidade (`axe-core` + verificação a 320px)

**Target Platform**: SPA estática servida por GitHub Pages; navegadores modernos; **referência
obrigatória de 320px**

**Project Type**: Aplicação web de página única, sem SSR e sem meta-framework, com back-end gerenciado

**Performance Goals**: entrada completa em < 15 s em rede móvel comum (SC-001); troca de visão em
≤ 2 toques (SC-011); resposta de `auth-login` com **piso fixo de ~350 ms** — desempenho aqui é
deliberadamente sacrificado para fechar o canal lateral de tempo da SC-004

**Constraints**: sem estado global — sem Redux, sem Zustand, e sem estado em Context (`useState` em
provider é proibido); Context permitido exclusivamente como injeção de dependência de valor constante,
declarado em `src/services/` (R-03); nenhum segredo no bundle;
`dist/` servível em CDN estático sem servidor de aplicação; interface inteiramente em pt-BR;
WCAG 2.1 AA

**Scale/Scope**: dezenas de usuários, centenas de alunos, sem requisito de concorrência; 13 rotas,
~30 componentes em 5 níveis de Atomic Design, 6 tabelas, 3 Edge Functions, 10 migrações

Nenhum **NEEDS CLARIFICATION** pendente: a stack veio determinada pelo usuário e as lacunas de
produto já estavam resolvidas em *Assumptions* da spec. A única incógnita de infraestrutura —
disponibilidade de *inactivity timeout* e *time-box* de sessão no plano do projeto — foi resolvida
com um projeto que **não depende do plano** (R-08: `sessao_valida()` em RLS como rede de segurança).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Gates derived from `.specify/memory/constitution.md` **v1.1.0**.

| # | Gate | Status |
|---|------|--------|
| I | TypeScript estrito: sem `any`, sem supressão nova; props em `interface` nomeada em `types.ts` | **PASS** — tipos de domínio em `data-model.md` §5; erros como união discriminada em `contracts/ports.ts`, sem `throw` de string |
| II | Nenhuma regra de negócio em componente; lógica em `src/services/` ou `src/lib/`; só componentes funcionais | **PASS** — `atoms`/`molecules` não importam de `services/`; só `pages` fazem I/O; regras de perfil, visão padrão e força de senha em funções puras |
| III | Toda customização nova exposta em `src/config.ts` (dados apenas), tipada em `types.ts` | **PASS** — tabela de rotas, itens de menu por perfil, textos pt-BR, tempos de sessão e regras de senha exibidas vivem em `config.ts` |
| IV | Acesso a dados via porta/interface; import de Supabase restrito a `src/services/supabase/`; fake in-memory previsto | **PASS** — `AuthPort`, `UsuariosPort`, `AuditoriaPort` em `contracts/ports.ts`, com 10 invariantes que o fake é obrigado a reproduzir; substituição por `PortasProvider` (injeção tipada, por render de teste), sem module mocking |
| V | Toda dependência de runtime nomeada na tabela do princípio, com fronteira de confinamento e critérios de admissão cumpridos | **PASS** — `react-router-dom` (R-04), `motion` (R-02), `lucide-react` e `@supabase/supabase-js` constam da tabela da constituição v1.1.0, cada um com fronteira imposta por `no-restricted-imports`; `tailwindcss` é build-time, não runtime |
| VI | Mobile-first funcional a 320px; cores/tipografia/espaçamento apenas via tokens de `docs/design-system.md` | **PASS** — `docs/design-system.md` v1.1.0 (2026-08-11) admite ferramenta de build e traz o mapeamento `@theme` em §7.1; utilitário fora de token deixa de existir, e as duas regras de lint de §7.2 (valor arbitrário e `style` literal) fecham as escapatórias restantes |
| VII | `aria-label` em links/controles, `alt` em imagens, contraste AA, navegação por teclado | **PASS** — regras por rota em `contracts/rls-e-rotas.md` §B.3; `axe-core` em CI; `lucide-react` isolado em `Icone.tsx` com `aria-hidden` por padrão; navegação interna sempre por `<Link>`, preservando âncora real e modificadores de teclado (R-04) |
| VIII | Testes unitários das regras + teste de integração do fluxo contra o fake | **PASS com esclarecimento** — camadas em R-11; a suíte de RLS roda contra Supabase **local e efêmero**, jamais o de produção (CT-3) |
| Env | Segredos/URLs apenas em `.env` via `import.meta.env.VITE_*`; `.env.example` atualizado | **PASS** — front-end só com `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`; service role só no ambiente das Edge Functions (`contracts/edge-functions.md` §4) |
| Deploy | `vite build` gera `dist/` servível em CDN estático / GitHub Pages sem configuração extra | **PASS** — `<BrowserRouter basename={import.meta.env.BASE_URL}>` + `404.html` gerado no pós-build para o deep link sem servidor; `base` pela env; ausência de `VITE_*` obrigatória **falha o build** |

**Re-avaliação pós-Fase 1**: nenhum gate mudou de status. O desenho da Fase 1 **reduziu** exposição em
dois pontos: `active_view` ficou fora de toda política RLS, tornando a FR-013 estrutural em vez de
verificada em review; e `login_attempts` e `password_reset_requests` ficaram sem qualquer `grant`,
inacessíveis mesmo a administradores pelo cliente.

## Project Structure

### Documentation (this feature)

```text
specs/001-autenticacao-controle-acesso/
├── plan.md              # Este arquivo
├── research.md          # Fase 0 — 14 decisões com alternativas rejeitadas
├── data-model.md        # Fase 1 — entidades, invariantes, matriz de acesso, ordem de migração
├── quickstart.md        # Fase 1 — como levantar e provar a feature
├── contracts/
│   ├── ports.ts         # portas de dados em tipos de domínio + invariantes do fake
│   ├── edge-functions.md# contratos HTTP das 3 funções privilegiadas
│   └── rls-e-rotas.md   # políticas RLS (autoridade) + tabela de rotas e guarda (interface)
├── checklists/
│   └── requirements.md  # já existente
└── tasks.md             # Fase 2 — gerado por /speckit-tasks, NÃO por este comando
```

### Source Code (repository root)

```text
src/
├── config.ts                    # rotas (dado puro, sem import de router), menu por perfil,
│                                # textos pt-BR, tempos, regras de senha exibidas
├── types.ts                     # Perfil, Usuario, UsuarioSessao, EstadoDaSessao, RegistroDeAuditoria
├── main.tsx                     # bootstrap: monta portas reais + store, PortasProvider,
│                                # BrowserRouter(basename=BASE_URL) + useRoutes(config),
│                                # LazyMotion + MotionConfig(reducedMotion="user")
├── styles/
│   └── tokens.css               # tokens do design system + @theme do Tailwind (defaults zerados)
├── components/
│   ├── atoms/                   # Botao, CampoTexto, Rotulo, Selo, Icone(lucide), Carregando
│   ├── molecules/               # CampoDeFormulario, ItemDeMenu, SeletorDeVisao, LinhaDeUsuario
│   ├── organisms/               # FormularioDeEntrada, TabelaDeUsuarios, CabecalhoApp, …
│   ├── templates/               # LayoutDeAutenticacao, LayoutInterno, Guarda (rota de layout,
│   │                            # renderiza <Outlet/> ou <Navigate/>)
│   └── pages/                   # 13 páginas da tabela de rotas
├── services/
│   ├── PortasProvider.tsx       # ÚNICO createContext do projeto; valor constante, sem estado
│   ├── auth/                    # AuthPort, criarSessionStore (fábrica), useSession
│   ├── usuarios/                # UsuariosPort e casos de uso
│   ├── auditoria/               # AuditoriaPort
│   ├── fakes/                   # implementações in-memory das 3 portas (Princípio IV)
│   └── supabase/                # ÚNICA pasta que importa @supabase/supabase-js
│       └── database.types.ts    # GERADO por `supabase gen types --local`; não editar à mão
└── lib/
    ├── destino.ts               # valida ?destino= como caminho interno; barra redirect aberto
    ├── forcaDeSenha.ts          # função pura, lista de senhas comuns por import() dinâmico
    ├── permissoes.ts            # união de perfis, visão padrão por alcance
    └── useRequisicao.ts         # carregando/dados/erro/recarregar, com AbortController

supabase/
├── config.toml                  # supabase init; versões fixadas p/ evitar deriva com o hospedado
├── migrations/                  # 10 arquivos com carimbo de tempo, ordem lógica em data-model.md §6
├── seed.sql                     # SÓ dev/teste: admin local + teachers dos roteiros. Não é migração
└── functions/
    ├── auth-login/
    ├── admin-users/
    └── password-recovery/

tests/
├── unit/
├── integration/                 # componentes reais × fakes
├── rls/                         # requisições diretas × supabase local
└── a11y/
```

**Structure Decision**: mantida a estrutura obrigatória da constituição (`config.ts`, `types.ts`,
`components/`, `services/`, `services/supabase/`, `lib/`), com os cinco níveis de Atomic Design
**dentro** de `src/components/` — inclusive `pages/`, para não criar uma raiz nova fora da lista
obrigatória. As fronteiras que tornam a hierarquia verificável em review estão em R-12. `supabase/` e
`tests/` ficam na raiz por serem artefatos de infraestrutura e de verificação, não código de origem.

`src/services/PortasProvider.tsx` é o **único** arquivo do projeto autorizado a chamar
`createContext`, restrição imposta por `no-restricted-imports` fora de `src/services/` — é o que
impede a injeção de dependência de degradar para estado compartilhado em provider (R-03).

A mesma regra de lint carrega as fronteiras da tabela do Princípio V: `@supabase/supabase-js` só em
`src/services/supabase/`, `lucide-react` só em `atoms/Icone.tsx`, e `react-router-dom` **proibido em
`src/services/` e `src/lib/`** — regra de negócio devolve resultado, quem navega é o componente
(R-04). `src/config.ts` permanece dado puro: declara as rotas sem importar o roteador, e é `main.tsx`
que traduz a tabela para `useRoutes()`.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| **CT-3** — suíte de RLS executa contra Supabase real (local), onde o Princípio VIII diz "nunca contra o Supabase real" | A User Story 3 inteira só é demonstrável emitindo requisições diretas ao armazenamento com a credencial de cada perfil; contra o fake, o teste provaria apenas o fake | Fake in-memory continua sendo o alvo de **toda** a suíte de integração de fluxo. pgTAP dentro do banco prova a política mas não o caminho real do cliente pelo PostgREST, que é onde a US3 mora. A instância é local e efêmera (`supabase start`), jamais a de produção — trata-se de esclarecimento (PATCH) do Princípio VIII, não de exceção |

Duas violações saíram desta tabela em 2026-08-11. **CT-1** (`motion`) dissolveu-se com a emenda do
Princípio V, que o admite nominalmente com fronteira em componentes de apresentação e plano de saída
para transições CSS puras (R-02); `react-router-dom` entrou pela mesma emenda e por isso nunca chegou
a aparecer aqui. **CT-2** (`tailwindcss` × design system §1.4) dissolveu-se com a emenda do design
system para v1.1.0. Restou **CT-3**, e nenhuma ação bloqueia a implementação.

### Ações de governança

1. ✅ **Concluída em 2026-08-11** — `.specify/memory/constitution.md` emendada para **v1.1.0**: o
   Princípio V trocou o teto numérico por lista fechada com fronteira de confinamento por dependência
   e cinco critérios objetivos de admissão. Admitidos `react-router-dom` (R-04) e `motion` (R-02);
   `lucide-react` e `@supabase/supabase-js` ganharam fronteira explícita. Bump MINOR: ampliação
   material, sem remoção nem redefinição incompatível. Racional em R-04.
2. ✅ **Concluída em 2026-08-11** — `docs/design-system.md` emendado para **v1.1.0**: §1.4 reescrito
   para "zero dependência visual **de runtime**"; §7.1 acrescentada com o mapeamento `@theme` sobre os
   tokens da §7, **sem renomear nenhum** (por isso MINOR e não MAJOR); §7.2 acrescentada delimitando
   o que o `@theme` garante e o que exige lint. A primeira tarefa de UI deixou de estar bloqueada.
3. **Recomendado (PATCH)** — acrescentar ao Princípio VIII a distinção entre "Supabase de produção"
   (proibido em teste) e "instância local efêmera do CLI" (necessária para provar RLS), oficializando
   CT-3. Deliberadamente fora da emenda v1.1.0, que se limitou ao Princípio V. **Não bloqueia nada**:
   CT-3 já está justificado nesta tabela, e o texto da constituição admite violação justificada.
