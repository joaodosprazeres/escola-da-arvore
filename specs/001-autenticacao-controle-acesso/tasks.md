# Tasks: Autenticação e Controle de Acesso por Perfil

**Input**: documentos de projeto em `/specs/001-autenticacao-controle-acesso/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: OBRIGATÓRIOS. O Princípio VIII exige teste unitário para toda regra em `src/services/` e
`src/lib/` e um teste de integração por fluxo de usuário contra o **fake in-memory** da porta
(Princípio IV). Tarefas de teste não são opcionais e vêm **antes** da implementação da mesma história.

**Constituição**: `.specify/memory/constitution.md` **v1.1.0**. A tabela do Princípio V nomeia
`react`, `react-dom`, `lucide-react`, `@supabase/supabase-js`, `react-router-dom` e `motion`, cada um
com fronteira de confinamento imposta por lint (T004).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos distintos, sem dependência pendente)
- **[Story]**: US1…US6, conforme `spec.md`
- Todo caminho de arquivo é relativo à raiz do repositório

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: inicializar o projeto e travar mecanicamente as fronteiras que a constituição exige.

- [X] T001 Criar o projeto Vite + React 19 + TypeScript na raiz (`package.json`, `index.html`, `vite.config.ts`, `src/main.tsx`)
- [X] T002 Instalar as dependências de runtime da tabela do Princípio V em `package.json`: `react`, `react-dom`, `react-router-dom`, `lucide-react`, `motion`, `@supabase/supabase-js`
- [X] T003 [P] Configurar `tsconfig.json` com `strict: true`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` e `noUnusedLocals`; script `typecheck` = `tsc --noEmit` (Princípio I)
- [X] T004 [P] Configurar ESLint + Prettier em `eslint.config.js` com `no-restricted-imports` impondo: `@supabase/supabase-js` só em `src/services/supabase/`, `lucide-react` só em `src/components/atoms/Icone.tsx`, `react-router-dom` proibido em `src/services/` e `src/lib/`, `createContext` só em `src/services/`, e `src/components/atoms|molecules` proibidos de importar `src/services/` (Princípios II, IV, V; R-03; R-04). Acrescentar as **duas regras que fecham o design system** (`docs/design-system.md` §7.2): proibir a sintaxe de valor arbitrário do Tailwind (`-[…]`) em `className` e proibir atributo `style` com valor literal em JSX — sem elas, `bg-[#C35E0A]` e `style={{color:'#C35E0A'}}` continuam passando (Princípio VI)
- [X] T005 [P] Configurar Vitest em `vitest.config.ts` com quatro projetos (`unit`, `integration`, `rls`, `a11y`) e criar os 7 scripts do quickstart §3 em `package.json`
- [X] T006 ✅ **Feito em 2026-08-11** — `docs/design-system.md` emendado para **v1.1.0**: §1.4 admite ferramenta de build que emite CSS estático, §7.1 traz o mapeamento `@theme` e §7.2 delimita o alcance real da imposição. Verificar apenas que o bloco `@theme` de T007 é cópia fiel de §7.1
- [X] T007 Instalar `tailwindcss` 4 + `@tailwindcss/vite` e criar `src/styles/tokens.css` com o bloco `:root` da §7 e, em seguida, o `@theme` da §7.1 de `docs/design-system.md` — literalmente, incluindo `--color-*: initial` e os demais namespaces zerados. Utilitário fora de token deixa de existir; **não** confiar nisso como portão de build (§7.2), o portão são as regras de lint de T004 (R-01, Princípio VI)
- [X] T008 [P] Criar `.env.example` com `VITE_SUPABASE_URL=` e `VITE_SUPABASE_ANON_KEY=` vazios e `src/services/supabase/env.ts` que valida a presença e **falha o build** quando ausentes; `.env` no `.gitignore` (seção Ambiente e Segredos)
- [X] T009 [P] Rodar `supabase init`; em `supabase/config.toml` fixar as versões dos serviços, habilitar Inbucket e apontar os templates de e-mail para pt-BR (R-13, R-14)
- [X] T010 [P] Configurar `base` em `vite.config.ts` a partir da variável de ambiente e script de pós-build copiando `dist/index.html` → `dist/404.html` em `scripts/pos-build.mjs` (seção Deploy; R-04)
- [X] T011 [P] Criar `.github/workflows/ci.yml`: `typecheck`, `lint`, as quatro suítes, `supabase gen types typescript --local` com **falha em diff**, e `build`
- [X] T012 [P] Criar `src/types.ts` com os tipos de domínio de `data-model.md` §5 (`Perfil`, `SituacaoUsuario`, `Usuario`, `UsuarioSessao`, `EstadoDaSessao`, `RegistroDeAuditoria`)
- [X] T013 [P] Criar `src/config.ts` como **dado puro**, sem importar `react-router-dom`: tabela de 13 rotas (`caminho`, `pagina`, `perfisPermitidos`, `exigeTrocaDeSenha`), `itensDeMenu: Record<Perfil, ItemDeMenu[]>`, textos pt-BR, tempos de sessão e regras de senha exibidas (Princípio III; `contracts/rls-e-rotas.md` §B)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: esquema com RLS ligada, portas, fakes e casca da aplicação.

**⚠️ CRÍTICO**: nenhuma história começa antes desta fase. As políticas RLS (T023) entram aqui, e não
na US3, porque `enable row level security` é linha de base de segurança — adiar significaria expor um
estado intermediário em que o cliente anônimo lê tudo pelo PostgREST. A US3 **prova e refina** essas
políticas; não é ela que as introduz.

### Esquema e migrações (ordem lógica de `data-model.md` §6)

- [X] T014 Migração `enums` via `supabase migration new enums`: enums `perfil`, `situacao_usuario`, `acao_auditoria` e extensão `citext`
- [X] T015 Migração `teachers`: tabela mínima do vínculo obrigatório (`id`, `nome`)
- [X] T016 Migração `profiles`: tabela, `updated_at`, gatilho de espelho de `auth.users`, `email` em `citext` único (FR-019)
- [X] T017 Migração `user_roles`: tabela, índices e trigger de reajuste de `active_view` quando o perfil da visão é removido (FR-016)
- [X] T018 Migração `funcoes_rls`: `perfis_do_usuario`, `tem_perfil`, `eh_administrador`, `usuario_ativo`, `sessao_valida`, `pode_operar`, `turmas_do_professor`, `visao_padrao` — todas `SECURITY DEFINER`, `STABLE`, `set search_path = public` (`contracts/rls-e-rotas.md` §A.1; R-05)
- [X] T019 Migração `invariantes`: INV-1 a INV-4 como *constraint triggers* — ao menos um perfil por usuário, vínculo obrigatório do Professor, último administrador ativo protegido (FR-008, FR-018, FR-023)
- [X] T020 Migração `audit_log`: tabela, índices e imutabilidade tripla (sem política de `update`/`delete`, revogação de `grant`, trigger que aborta escrita) (FR-041)
- [X] T021 [P] Migração `login_attempts`: tabela sem nenhum `grant` ao cliente (R-07)
- [X] T022 [P] Migração `password_reset_requests`: tabela sem `grant` ao cliente e índice único parcial do pedido vivo (FR-031)
- [X] T023 Migração `politicas_rls`: `enable row level security` em **todas** as tabelas e as políticas por tabela de `contracts/rls-e-rotas.md` §A.2, com `(select auth.uid())` para caching de InitPlan (FR-034 a FR-038)
- [X] T024 Criar `supabase/seed.sql` (só dev e teste): registros de `teachers`, um administrador com `first_access = false` para os testes da US1 e um usuário em primeiro acesso para os da US2; senha vinda de variável de ambiente do CLI, **nunca** literal versionado (`data-model.md` §6.1)
- [X] T025 Adicionar script `types:gen` = `supabase gen types typescript --local > src/services/supabase/database.types.ts` e gerar o arquivo; confinado a `src/services/supabase/` (`data-model.md` §6.2)

### Portas, fakes e adaptadores (Princípio IV)

- [X] T026 [P] Criar `src/services/auth/types.ts` a partir de `contracts/ports.ts`: `Resultado`, `ErroDeEntrada`, `ErroDeSenha`, `AuthPort`, `SessionStore` — sem qualquer menção a Supabase
- [X] T027 [P] Criar `src/services/usuarios/types.ts`: `NovoUsuario`, `FiltroDeUsuarios`, `ErroDeGestao`, `UsuariosPort`
- [X] T028 [P] Criar `src/services/auditoria/types.ts`: `FiltroDeAuditoria`, `AuditoriaPort` (somente leitura, sem método de escrita, por contrato — FR-041)
- [X] T029 Criar `src/services/portas.ts` com a interface `Portas` (`auth`, `usuarios`, `auditoria`, `sessao`) de `contracts/ports.ts`
- [X] T030 Escrever `tests/integration/invariantes-do-fake.test.ts` cobrindo as **10 invariantes** de `contracts/ports.ts`, parametrizado para rodar contra qualquer implementação das portas — **deve falhar** antes de T031–T033
- [X] T031 [P] Implementar `src/services/fakes/authFake.ts` até T030 passar na parte de autenticação
- [X] T032 [P] Implementar `src/services/fakes/usuariosFake.ts` até T030 passar na parte de gestão
- [X] T033 [P] Implementar `src/services/fakes/auditoriaFake.ts`
- [X] T034 Implementar `src/services/supabase/cliente.ts`: instância única de `supabase-js` lendo `env.ts`, com `persistSession` e detecção de expiração pelo tempo do servidor (FR-007)
- [X] T035 Implementar `src/services/supabase/authAdapter.ts` — esqueleto de `AuthPort` com `obterEstado`, `aoMudarSessao`, `sair`, `definirVisaoAtiva`; `entrar` e as operações de senha entram nas fases US1 e US4
- [X] T036 [P] Implementar `src/services/supabase/usuariosAdapter.ts` — esqueleto de `UsuariosPort` com `listar` e `listarProfessoresDisponiveis`
- [X] T037 [P] Implementar `src/services/supabase/auditoriaAdapter.ts` — esqueleto de `AuditoriaPort`

### Estado, injeção e roteamento (R-03, R-04)

- [X] T038 Implementar `src/services/auth/criarSessionStore.ts`: **fábrica** (nunca singleton de módulo) alimentada por `AuthPort.aoMudarSessao`, com `getSnapshot` devolvendo a mesma referência enquanto nada muda; e `src/services/auth/useSession.ts` sobre `useSyncExternalStore`
- [X] T039 Implementar `src/services/PortasProvider.tsx` — **único** `createContext` do projeto; recebe `portas` por prop, sem `useState`/`useReducer`, valor constante; expõe `usePortas()` (R-03)
- [X] T040 [P] Implementar `src/lib/permissoes.ts` (união de perfis, visão padrão pelo maior alcance, casamento rota × permissões efetivas) e `tests/unit/permissoes.test.ts` (FR-009, FR-011, FR-013)
- [X] T041 [P] Implementar `src/lib/destino.ts` (só caminho interno começando com `/`, rejeitando `//`, `/\` e esquemas) e `tests/unit/destino.test.ts` cobrindo redirecionamento aberto (FR-006; R-04 regra 4)
- [X] T042 [P] Implementar `src/lib/useRequisicao.ts` com `carregando/dados/erro/recarregar` e `AbortController`, sem cache global (R-03 regra 6), e `tests/unit/useRequisicao.test.ts`: aborta na desmontagem, **não** atualiza estado depois do abort, `recarregar` descarta o resultado anterior, e erro não deixa `carregando` preso em `true` (Princípio VIII)

### Casca de interface

- [X] T043 [P] Implementar os atoms em `src/components/atoms/`: `Botao`, `CampoTexto`, `Rotulo`, `Selo`, `Carregando` — mobile-first a 320px, alvo ≥ 44×44px, apenas tokens do design system (Princípios VI, VII) — depende de T007
- [X] T044 [P] Implementar `src/components/atoms/Icone.tsx` como **único** ponto de import de `lucide-react`, com `aria-hidden` por padrão e rótulo obrigatório quando o ícone for o único conteúdo de um controle (FR-045)
- [X] T045 Implementar `src/components/templates/LayoutDeAutenticacao.tsx` e `LayoutInterno.tsx`, incluindo o **foco no `<h1>` a cada troca de rota** e a região `aria-live="polite"` do título — comportamento próprio, não herdado do roteador (`contracts/rls-e-rotas.md` §B.3; R-04 regra 5)
- [X] T046 Implementar `src/components/templates/Guarda.tsx` como **rota de layout** (`<Outlet />` ou `<Navigate replace />`), com a ordem de decisão de 6 passos de `contracts/rls-e-rotas.md` §B.1, e `tests/integration/guarda.test.tsx` cobrindo os 6 passos e a inversão de cada par adjacente; montar `src/main.tsx` com `PortasProvider` + `<BrowserRouter basename={import.meta.env.BASE_URL}>` + `useRoutes(config)` + `LazyMotion(domAnimation)` + `<MotionConfig reducedMotion="user">`, e criar os stubs das 13 páginas em `src/components/pages/`. O passo 5 cobre também FR-016: quando `visaoAtiva` deixou de constar em `perfis`, redirecionar ao painel do perfil de maior alcance restante **com aviso visível da mudança**; quando não resta perfil algum, encerrar a sessão. `tests/integration/guarda.test.tsx` cobre os dois casos

**Checkpoint**: esquema com RLS ligada, portas com fake verificado, roteamento guardado. Histórias podem começar.

---

## Phase 3: User Story 1 — Entrar no sistema e chegar ao painel do meu perfil (P1) 🎯 MVP

**Goal**: autenticar por e-mail e senha e chegar ao painel da visão ativa, com menu correspondente,
alternância de visão e saída efetiva.

**Independent Test**: com os usuários de `supabase/seed.sql`, entrar com credencial válida e
inválida, conferir destino, menu e efeito da saída — sem que nenhuma outra história exista.

### Tests for User Story 1 ⚠️

> Escrever primeiro; garantir que falham antes de implementar.

- [X] T047 [P] [US1] `tests/integration/entrada-e-painel.test.tsx`: rota interna sem sessão → `/entrar?destino=…`; credencial válida → painel da visão ativa com menu limitado; sair → toda URL interna volta a `/entrar` (US1-1, US1-2, US1-6, US1-8; FR-005, FR-006, FR-011, FR-014)
- [X] T048 [P] [US1] `tests/integration/entrada-negada.test.tsx`: senha errada e e-mail inexistente produzem **exatamente** o mesmo código e o mesmo texto; conta bloqueada/desativada com senha correta orienta a procurar a secretaria (US1-3, US1-4, US1-5; FR-002, FR-003)
- [X] T049 [P] [US1] `tests/integration/visao-ativa.test.tsx`: usuário multi-perfil entra direto no painel preferido sem tela intermediária; alterna em ≤ 2 acionamentos; a escolha persiste no acesso seguinte; a alternância **não** muda permissões (US1-9, US1-10; FR-010, FR-012, FR-013; SC-010, SC-011)
- [X] T050 [P] [US1] `tests/integration/sessao-expirada.test.tsx`: sessão expirada por inatividade → `/entrar` com aviso; saída em uma aba encerra a outra na ação seguinte (US1-7; FR-005, FR-007; Edge Cases)
- [ ] T051 [US1] `tests/rls/auth-login-tempo.test.ts`: contra o Supabase local, medir que e-mail inexistente e senha errada devolvem o mesmo código e tempos dentro da mesma faixa, com piso de ~350 ms (SC-004; R-07)

### Implementation for User Story 1

- [X] T052 [US1] Implementar `supabase/functions/auth-login/index.ts` conforme `contracts/edge-functions.md`: código único `credenciais_invalidas`, contenção de 5 falhas em 15 min por conta **e** por origem com `LOGIN_IP_PEPPER`, piso fixo de tempo de resposta, gravação em `login_attempts` (FR-002, FR-003, FR-004; SC-004)
- [X] T053 [US1] Implementar `supabase/functions/_shared/resposta.ts` com CORS restrito a `ALLOWED_ORIGIN` e serialização de erro sem vazar detalhe (FR-033, FR-039)
- [X] T054 [US1] Completar `src/services/supabase/authAdapter.ts`: `entrar()` chamando `auth-login`, traduzindo a resposta para `Resultado<UsuarioSessao, ErroDeEntrada>`; `definirVisaoAtiva()` persistindo `active_view` (FR-012)
- [X] T055 [US1] Implementar `src/components/organisms/FormularioDeEntrada.tsx`: rótulos associados, `aria-invalid` + `aria-describedby` nos erros, botão inerte durante o envio, sem envio duplicado (FR-046, FR-047)
- [X] T056 [US1] Implementar `src/components/pages/EntrarPage.tsx`, honrando `destino` só depois de `src/lib/destino.ts` validar e de o perfil permitir (FR-006)
- [X] T057 [P] [US1] Implementar as quatro páginas de painel em `src/components/pages/`: `PainelAdministradorPage`, `PainelSecretariaPage`, `PainelCoordenacaoPage`, `PainelProfessorPage` — a de Professor sem vínculo mostra painel vazio com orientação, nunca erro (Edge Cases)
- [X] T058 [US1] Implementar `src/components/organisms/CabecalhoApp.tsx` com o menu derivado de `itensDeMenu[visaoAtiva]` e a ação de sair (FR-014, FR-005)
- [X] T059 [US1] Implementar `src/components/molecules/SeletorDeVisao.tsx`: aparece só com `perfis.length > 1`, alterna em ≤ 2 acionamentos de qualquer tela, indica a visão ativa **por texto**, não só por cor (FR-012; SC-011; design system §2.3)
- [X] T060 [P] [US1] Implementar `src/components/pages/AcessoNegadoPage.tsx` e `NaoEncontradaPage.tsx` — aviso claro, sem revelar conteúdo da área (FR-015)
- [X] T061 [US1] Ajustar a expiração de sessão: `supabase/config.toml` com inatividade de 30 min e limite absoluto de 12 h, e reação do adaptador ao evento de expiração; `sessao_valida()` continua como rede de segurança em RLS, independente do plano (R-08; FR-005, FR-007)
- [X] T062 [P] [US1] `tests/a11y/us1.test.tsx` com `axe-core` sobre entrada, painéis, acesso negado e não encontrada; verificar contraste, rótulo acessível e ordem de foco (FR-043 a FR-046; SC-006, SC-007)

**Checkpoint**: US1 funciona e é demonstrável sozinha. MVP.

---

## Phase 4: User Story 2 — Administrador cadastra usuário e define perfis (P1)

**Goal**: criação de contas exclusiva do Administrador, com vínculo obrigatório de Professor, senha
temporária e troca obrigatória no primeiro acesso.

**Independent Test**: criar um usuário de cada perfil, conferir a senha temporária, a obrigatoriedade
da troca e o bloqueio de navegação enquanto ela não ocorre.

### Tests for User Story 2 ⚠️

- [X] T063 [P] [US2] `tests/unit/forcaDeSenha.test.ts`: mínimo de 8 caracteres, regras de composição e **lista do que falta** como saída estruturada (FR-028)
- [X] T064 [P] [US2] `tests/integration/cadastro-de-usuario.test.tsx`: criação com nome, e-mail e perfil aparece na lista como ativo em primeiro acesso; perfil Professor sem vínculo é recusado com explicação; e-mail repetido em qualquer caixa é recusado; Coordenação + Professor é aceito e habilita o seletor de visão; alterar os perfis de um usuário **com sessão aberta** passa a valer na ação seguinte dele, sem nova entrada (US2-1, US2-2, US2-3, US2-8; FR-016, FR-017, FR-018, FR-019, FR-024; Edge Cases)
- [X] T065 [P] [US2] `tests/integration/primeiro-acesso.test.tsx`: entrada com senha temporária cai em `/trocar-senha`; qualquer outra rota devolve para lá; senha fraca é recusada com a lista do que falta; após concluir, segue ao painel e o acesso seguinte entra direto (US2-4, US2-5, US2-6; FR-026, FR-027, FR-028)
- [X] T066 [P] [US2] `tests/integration/gestao-restrita-ao-admin.test.tsx`: para Secretaria, `/usuarios` não aparece no menu e o acesso direto cai em `/acesso-negado` (US2-7; FR-020)

### Implementation for User Story 2

- [X] T067 [US2] Implementar `src/lib/forcaDeSenha.ts` como função pura, com a lista de senhas comuns carregada por `import()` dinâmico (R-09)
- [X] T068 [US2] Implementar `supabase/functions/admin-users/index.ts` conforme `contracts/edge-functions.md`: `criar`, `definirPerfis` e `reemitirSenhaTemporaria`, cada um verificando o perfil do chamador no servidor e gravando `audit_log` **na mesma transação** (FR-017, FR-020, FR-040)
- [X] T069 [US2] Completar `src/services/supabase/usuariosAdapter.ts`: `criar`, `definirPerfis`, `reemitirSenhaTemporaria` e `listarProfessoresDisponiveis`, traduzindo os erros para `ErroDeGestao`
- [X] T070 [US2] Completar `authAdapter.trocarSenha()` zerando `first_access`, e implementar `src/components/pages/TrocarSenhaPage.tsx` — a absorção de navegação já vem do passo 3 do `Guarda` (T046) (FR-027)
- [X] T071 [US2] Implementar `src/components/organisms/FormularioDeUsuario.tsx`: seleção múltipla de perfis e campo de vínculo de professor que só aparece — e só é exigido — quando `professor` está entre os perfis (FR-018)
- [X] T072 [US2] Implementar `src/components/pages/NovoUsuarioPage.tsx` com confirmação de criação e retorno à lista atualizada (FR-024)
- [X] T073 [US2] Implementar `src/components/organisms/TabelaDeUsuarios.tsx` e `src/components/molecules/LinhaDeUsuario.tsx` com busca por nome, e-mail, perfil e situação, utilizável com dezenas de contas (FR-025)
- [X] T074 [US2] Implementar `src/components/pages/UsuariosPage.tsx` sobre `useRequisicao()` (FR-024, FR-025)
- [X] T075 [P] [US2] Implementar `src/components/molecules/MedidorDeSenha.tsx` exibindo **o que falta**, nunca só "fraca/forte", e reutilizado por `TrocarSenhaPage` e `RedefinirSenhaPage` (FR-028)
- [X] T076 [US2] Ajustar `itensDeMenu` em `src/config.ts` para que `/usuarios` só exista na visão `administrador`, mantendo o passo 4 do `Guarda` como autoridade (FR-014, FR-020)
- [ ] T077 [US2] Revisão de 320px, teclado e alvo de toque nas telas de US2 (FR-043, FR-044)
- [X] T078 [P] [US2] `tests/a11y/us2.test.tsx` com `axe-core` sobre lista de usuários, novo usuário e troca de senha (SC-006, SC-007)

**Checkpoint**: US1 e US2 funcionam de forma independente.

---

## Phase 5: User Story 3 — Dados restritos ao que cada perfil precisa ver (P1)

**Goal**: provar que a restrição vive no armazenamento e resiste a requisição que não passa pelas
telas. As políticas já existem desde T023; esta fase é a que as **verifica e corrige**.

**Independent Test**: `npm run test:rls` sozinho, emitindo requisições diretas ao Supabase local com
a credencial de cada perfil. Nenhuma tela envolvida.

### Tests for User Story 3 ⚠️

- [X] T079 [P] [US3] `tests/rls/perfis.test.ts`: as 10 linhas da tabela de contrato de `contracts/rls-e-rotas.md` §A.3, incluindo Professor que pede a lista completa de usuários e recebe só a própria linha, e Secretaria que tenta criar usuário ou alterar perfil por requisição direta e é recusada (US3-1, US3-3; FR-034, FR-035; SC-003)
- [X] T080 [P] [US3] `tests/rls/uniao-de-perfis.test.ts`: usuário Coordenação + Professor com a visão de Professor ativa continua alcançando o que a Coordenação alcança — `active_view` não é consultada por política nenhuma (US3-8; FR-013)
- [X] T081 [P] [US3] `tests/rls/sem-credencial.test.ts`: requisição sem credencial não retorna nada; usuário desativado com sessão ainda não expirada é negado na solicitação seguinte (US3-6, US3-7; FR-038; SC-009)
- [X] T082 [P] [US3] `tests/rls/auditoria-imutavel.test.ts`: `update` e `delete` em `audit_log` são recusados para todos os perfis, inclusive Administrador (US3-5; FR-041)

### Implementation for User Story 3

- [X] T083 [US3] Cobrir `turmas_do_professor()` (migração T018) com `tests/rls/turmas-do-professor.test.ts` **pelo que é provável hoje**: a função existe, devolve conjunto vazio para todo professor enquanto `class_teachers` não existir, e o painel do Professor mostra a orientação de painel vazio em vez de erro. O teste **não** prova delimitação de alcance — `data-model.md` §2.3 declara a função como stub. Registrar em comentário no topo do arquivo que FR-036 só fica coberto quando a feature de turmas chegar
- [X] T084 [US3] Corrigir, por migração **nova para frente**, toda política reprovada por T079–T083; nunca editar migração já aplicada (`data-model.md` §6.2)
- [X] T085 [US3] Executar a verificação manual do roteiro C de `quickstart.md` (requisições `curl` diretas ao PostgREST com token de Professor e de Administrador) e registrar o resultado no PR (SC-003)
- [X] T086 [US3] Documentar em `contracts/rls-e-rotas.md` §A.2 a **política-modelo** para as tabelas de alunos e turmas, apoiada em `turmas_do_professor()` e na leitura ampla da Coordenação. As tabelas em si pertencem a outra feature; sem este registro, US3-2 e US3-4 ficam sem contrato herdável (FR-036, FR-037)

**Checkpoint**: as três histórias P1 estão completas e verificáveis.

---

## Phase 6: User Story 4 — Recuperar a senha esquecida (P2)

**Goal**: recuperação autônoma por link temporário e de uso único, sem revelar quais e-mails existem.

**Independent Test**: solicitar recuperação para e-mail cadastrado e para não cadastrado e concluir a
redefinição pelo link recebido no Inbucket local.

### Tests for User Story 4 ⚠️

- [X] T087 [P] [US4] `tests/integration/recuperacao.test.tsx`: e-mail cadastrado e não cadastrado produzem a **mesma** confirmação; conta bloqueada ou desativada também; nenhuma mensagem é enviada nos dois últimos casos (US4-1, US4-2, US4-5; FR-030)
- [X] T088 [P] [US4] `tests/integration/redefinicao.test.tsx`: link válido + senha forte redefine e permite entrar; link já usado ou expirado é recusado com oferta de novo pedido (US4-3, US4-4; FR-029, FR-031)
- [X] T089 [P] [US4] `tests/rls/redefinicao-uso-unico.test.ts`: emitir dois pedidos seguidos invalida o anterior (índice único parcial de T022); concluir a redefinição encerra as demais sessões do usuário (US4-6; FR-031, FR-032)

### Implementation for User Story 4

- [X] T090 [US4] Implementar `supabase/functions/password-recovery/index.ts` conforme `contracts/edge-functions.md`: resposta sempre idêntica, envio condicionado à existência e à situação da conta, invalidação do pedido anterior (FR-029, FR-030, FR-031)
- [X] T091 [P] [US4] Criar os templates de e-mail em pt-BR em `supabase/templates/` e referenciá-los em `supabase/config.toml` (R-13; FR-048)
- [X] T092 [US4] Completar `src/services/supabase/authAdapter.ts` com `solicitarRecuperacao()` — que **sempre** resolve com sucesso — e `redefinirSenhaComLink()` (FR-030, FR-031)
- [X] T093 [US4] Implementar `src/components/pages/EsqueciSenhaPage.tsx` com confirmação genérica única (FR-030)
- [X] T094 [US4] Implementar `src/components/pages/RedefinirSenhaPage.tsx` reutilizando `MedidorDeSenha` (T075); link inválido oferece solicitar novo (US4-4)
- [X] T095 [US4] Encerrar as demais sessões do usuário na conclusão da redefinição e refletir o estado `anonimo` nas outras abas na ação seguinte (FR-032; Edge Cases)
- [ ] T096 [US4] Revisão de 320px, teclado e alvo de toque nas telas de US4 (FR-043, FR-044)
- [X] T097 [P] [US4] `tests/a11y/us4.test.tsx` com `axe-core` sobre esqueci-senha e redefinir-senha (SC-006, SC-007)

**Checkpoint**: US4 funciona sem tocar em US1, US2 ou US3.

---

## Phase 7: User Story 5 — Bloquear, desbloquear e desativar contas (P2)

**Goal**: suspender e restabelecer acesso, desativar sem apagar, e nunca ficar sem Administrador.

**Independent Test**: bloquear um usuário, verificar que não entra, desbloquear, verificar que volta
a entrar com a mesma senha.

### Tests for User Story 5 ⚠️

- [X] T098 [P] [US5] `tests/integration/bloqueio.test.tsx`: bloqueio pede confirmação e reflete na lista; desbloqueio devolve o acesso com a mesma senha (US5-1, US5-3; FR-021)
- [X] T099 [P] [US5] `tests/integration/desativacao.test.tsx`: usuário desativado continua visível com o estado e o histórico dele permanece íntegro; não existe exclusão definitiva (US5-4; FR-022)
- [X] T100 [P] [US5] `tests/integration/ultimo-administrador.test.tsx`: bloquear, desativar ou rebaixar o último Administrador ativo é recusado com explicação, inclusive contra si mesmo (US5-5; FR-023, INV-3)
- [X] T101 [P] [US5] `tests/rls/sessao-de-bloqueado.test.ts`: usuário bloqueado com sessão aberta é negado **na solicitação seguinte**, sem esperar expiração (US5-2; SC-009)

### Implementation for User Story 5

- [X] T102 [US5] Estender `supabase/functions/admin-users/index.ts` com `bloquear`, `desbloquear` e `desativar`, cada um verificando o perfil do chamador, respeitando INV-3 e gravando `audit_log` na mesma transação (FR-021, FR-022, FR-023, FR-040)
- [X] T103 [US5] Completar `src/services/supabase/usuariosAdapter.ts` com `bloquear`, `desbloquear` e `desativar`
- [X] T104 [US5] Implementar `src/components/organisms/AcoesDeUsuario.tsx` com confirmação explícita antes de cada ação destrutiva e mensagem específica para `ultimo_administrador` (US5-1, US5-5)
- [X] T105 [P] [US5] Implementar o estado de situação em `src/components/atoms/Selo.tsx` comunicando ativo/bloqueado/desativado por **ícone e texto**, nunca só por cor (design system §2.3; FR-045)
- [X] T106 [US5] Exibir na tela de entrada o prazo da contenção por tentativas sucessivas, sem confirmar se a senha estava correta (US5-6; FR-004; Edge Cases)
- [X] T107 [P] [US5] `tests/a11y/us5.test.tsx` com `axe-core` sobre a lista com ações e os diálogos de confirmação (SC-006, SC-007)

**Checkpoint**: US1 a US5 funcionam de forma independente.

---

## Phase 8: User Story 6 — Consultar o histórico de ações administrativas (P3)

**Goal**: histórico completo, filtrável, imutável e restrito ao Administrador.

**Independent Test**: executar uma sequência de ações administrativas e conferir que cada uma aparece
com autor, alvo, tipo, valor anterior, valor novo e momento.

### Tests for User Story 6 ⚠️

- [X] T108 [P] [US6] `tests/integration/auditoria.test.tsx`: as **seis** ações de FR-040 — criação, alteração de perfil, bloqueio, desbloqueio, desativação e redefinição administrativa de senha — produzem **uma linha cada**, com autor, afetado, tipo, valor anterior, valor novo e momento; filtros por usuário afetado e por período retornam só o correspondente (US6-1, US6-2; FR-040, FR-042; SC-005)
- [X] T109 [P] [US6] `tests/rls/auditoria-acesso.test.ts`: não-Administrador tem a consulta negada (US6-4; FR-042) — complementa T082, que cobre a imutabilidade (US6-3)
- [X] T110 [P] [US6] `tests/unit/auditoria-sem-segredo.test.ts`: nenhum registro produzido pelas rotinas de auditoria contém senha, hash ou token em texto legível (FR-033)

### Implementation for User Story 6

- [X] T111 [US6] Completar `src/services/supabase/auditoriaAdapter.ts` com `listar()` paginado e filtros por afetado e período (FR-042)
- [X] T112 [US6] Implementar `src/components/organisms/TabelaDeAuditoria.tsx` legível a 320px — sem rolagem horizontal da página; a tabela rola dentro do próprio contêiner (FR-043)
- [X] T113 [US6] Implementar `src/components/pages/AuditoriaPage.tsx` com os filtros sobre `useRequisicao()` (FR-042)
- [X] T114 [US6] Adicionar `/auditoria` a `itensDeMenu.administrador` em `src/config.ts` (FR-014)
- [X] T115 [P] [US6] `tests/a11y/us6.test.tsx` com `axe-core` sobre o histórico e seus filtros (SC-006, SC-007)

**Checkpoint**: as seis histórias estão completas.

---

## Phase 9: Polish & Cross-Cutting Concerns

- [X] T116 [P] Escrever o `README.md` com stack, comandos e link para a constituição — pendência registrada no Sync Impact Report de `.specify/memory/constitution.md`
- [ ] T117 Executar a checklist manual de `quickstart.md` §5: 320px sem rolagem horizontal, percurso só por teclado, alvo ≥ 44×44px, nenhum estado só por cor, âncora real no menu (ctrl-clique e clique do meio), foco no `<h1>` após cada troca de rota
- [ ] T118 Verificar `prefers-reduced-motion`: com "reduzir movimento" ligado no sistema, as animações do `motion` desaparecem via `<MotionConfig reducedMotion="user">` (design system §6.5)
- [ ] T119 Verificar fonte ampliada a 200% em todas as telas da feature: layout íntegro, nada cortado (FR-043)
- [X] T120 Rodar `npm run build` e servir `dist/` estaticamente confirmando deep link por `404.html` e `base` correto; confirmar que a ausência de `VITE_SUPABASE_URL` **falha o build** (seção Deploy)
- [X] T121 Auditoria de segredos: nenhuma credencial, URL de projeto ou token literal em `src/`, `tests/` ou histórico de commits; `SUPABASE_SERVICE_ROLE_KEY`, `LOGIN_IP_PEPPER`, `ALLOWED_ORIGIN` e `APP_BASE_URL` só no ambiente das Edge Functions; `.env.example` atualizado no mesmo PR que introduziu cada variável (FR-039; seção Ambiente e Segredos)
- [X] T122 [P] Verificar que `eslint.config.js` (T004) realmente reprova cada fronteira, escrevendo um caso de violação para cada e conferindo que o lint falha: import de `supabase-js` fora de `src/services/supabase/`, de `lucide-react` fora de `Icone.tsx`, de `react-router-dom` em `src/services/` ou `src/lib/`, `createContext` fora de `src/services/`, `className` com valor arbitrário e `style` literal em JSX
- [ ] T123 [P] Verificar o peso do bundle e confirmar que `LazyMotion` + `domAnimation` mantém o custo do `motion` na faixa de ~18 kB gzip (CT-1 dissolvido; R-02)
- [ ] T124 Executar os roteiros manuais A a F de `quickstart.md` §4 de ponta a ponta contra `supabase start` local
- [ ] T125 Preencher a tabela de verificação de `quickstart.md` §6 (SC-003 a SC-011) com os resultados e anexar ao PR
- [ ] T126 Confirmar que todas as suítes estão verdes e que não existe teste `skip` ou `only` no repositório (Princípio VIII; portão de merge)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Fase 1)**: sem dependências. Nenhuma tarefa da fase bloqueia outra além de T006 → T007, e T006 já está concluída.
- **Foundational (Fase 2)**: depende da Fase 1 — **bloqueia todas as histórias**.
- **US1, US2, US3 (P1)**: independentes entre si depois da Fase 2.
- **US4 (P2)**: independente depois da Fase 2.
- **US5 (P2)**: **testável** de forma independente, **implementável** não — T102 estende a Edge Function `admin-users` criada em T068 (US2), e T106 exibe o prazo da contenção produzida por `auth-login` (T052, US1). Sequenciar depois de US1 e US2.
- **US6 (P3)**: independente depois da Fase 2. Mais demonstrável depois de US2 e US5, que produzem registros reais, mas não depende delas: os fakes geram os registros.
- **Polish (Fase 9)**: depende das histórias desejadas estarem completas.

### Dependências internas relevantes

- T014 → T015 → T016 → T017 → T018 → T019 → T020 → T023 (ordem lógica de migração; T021 e T022 são paralelas entre si)
- T023 → T024 → T025
- T030 (suíte de invariantes) **antes** de T031, T032, T033
- T026–T029 → T035, T036, T037
- T038 → T039 → T046
- T007 → T043, T044 → T045 → T046
- T046 → toda página de qualquer história
- T052 → T054 → T056
- T068 → T069 → T072; T068 → T102 → T103; T052 → T106
- T075 → T094
- T082 cobre US6-3; T109 cobre US6-4

### Within Each User Story

- Testes escritos e **falhando** antes da implementação
- Migração e função de banco antes do adaptador
- Adaptador antes da página
- Página antes da revisão de acessibilidade da história

### Parallel Opportunities

- Fase 1: T003, T004, T005, T008, T009, T010, T011, T012, T013 em paralelo
- Fase 2: T021 ‖ T022; T026 ‖ T027 ‖ T028; T031 ‖ T032 ‖ T033; T036 ‖ T037; T040 ‖ T041 ‖ T042; T043 ‖ T044
- Todos os testes marcados [P] dentro de uma história rodam juntos
- Com equipe: depois da Fase 2, US1, US2 e US3 podem correr em três frentes; US3 é a mais isolada, porque não toca em componente nenhum

---

## Parallel Example: User Story 1

```bash
# Todos os testes da US1 de uma vez (devem falhar antes da implementação):
Task: "tests/integration/entrada-e-painel.test.tsx"      # T047
Task: "tests/integration/entrada-negada.test.tsx"        # T048
Task: "tests/integration/visao-ativa.test.tsx"           # T049
Task: "tests/integration/sessao-expirada.test.tsx"       # T050

# Depois de T052–T056, as páginas independentes juntas:
Task: "4 páginas de painel em src/components/pages/"     # T057
Task: "AcessoNegadoPage e NaoEncontradaPage"             # T060
```

---

## Implementation Strategy

### MVP primeiro (US1)

1. Fase 1 completa — atenção a **T006**, que é decisão do mantenedor e bloqueia a UI
2. Fase 2 completa — inclui RLS ligada, sem estado intermediário exposto
3. Fase 3 completa
4. **PARAR E VALIDAR**: roteiro A de `quickstart.md` + `npm run test:integration` + `npm run test:a11y`
5. Demonstrável: acesso controlado ao sistema com os usuários do seed

### Entrega incremental

1. Setup + Foundational → base pronta
2. + US1 → validar → demo (**MVP**)
3. + US2 → a escola passa a poder criar as próprias contas
4. + US3 → a garantia de dados passa a ser provada, não afirmada
5. + US4 → a secretaria para de redefinir senha à mão
6. + US5 → operação segura ao longo do ano letivo
7. + US6 → responsabilização

### Equipe em paralelo

Depois da Fase 2: pessoa A em US1, pessoa B em US2, pessoa C em US3. US3 não toca em componente
nenhum, então não conflita com as outras duas em arquivo algum.

---

## Notes

- `[P]` = arquivos distintos, sem dependência pendente
- Verificar que o teste falha antes de implementar; commit por tarefa ou grupo lógico
- **Nenhuma ação de governança bloqueia a implementação.** Constituição em v1.1.0 e design system em
  v1.1.0, ambos emendados em 2026-08-11. O que resta (CT-3, esclarecimento do Princípio VIII) é
  recomendação, não impedimento
- **A imposição dos tokens não vem do build**, vem do lint de T004. Zerar os namespaces do Tailwind
  remove o vocabulário concorrente, mas valor arbitrário e `style` literal continuam passando sem as
  duas regras (`docs/design-system.md` §7.2)
- **Lacuna herdada, registrada em T086**: US3-2 e US3-4 falam de dados de alunos e turmas, que não
  existem no `data-model.md` desta feature. O que cabe aqui é a função `turmas_do_professor()` e a
  política-modelo documentada; as tabelas pertencem à feature que as criar
- Migração já aplicada **nunca** é editada — correção é sempre migração nova para frente
  (`data-model.md` §6.2)
- Toda suíte de RLS roda contra `supabase start` **local e efêmero**, jamais o projeto de produção
  (CT-3; R-14)
