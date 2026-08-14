# Research: Autenticação e Controle de Acesso por Perfil

**Feature**: `001-autenticacao-controle-acesso` | **Data**: 2026-08-11 | **Fase**: 0

Entrada: `spec.md` (48 FRs, 11 SCs), `.specify/memory/constitution.md` v1.0.0, `docs/design-system.md`
v1.0.0 e a stack determinada pelo usuário (React 19 + TS + Vite, Tailwind 4, Atomic Design,
lucide-react, sem estado global, Framer Motion, Supabase).

Cada decisão abaixo registra **Decisão / Racional / Alternativas rejeitadas**. As decisões R-01 e
R-02 divergem de documentos de governança e estão espelhadas em `plan.md` → Complexity Tracking.

---

## R-01 — Tailwind 4 como camada de utilitários sobre os tokens do design system

**Decisão**: adotar Tailwind CSS 4 via `@tailwindcss/vite`, configuração CSS-first (sem
`tailwind.config.js`), em `src/styles/tokens.css`:

1. Os tokens de `docs/design-system.md` §7 continuam sendo a fonte única, declarados como hoje.
2. Um bloco `@theme` **zera os defaults do Tailwind** e redeclara apenas os tokens do design system
   nos namespaces que o Tailwind exige:

   ```css
   @import "tailwindcss";

   @theme {
     /* apaga a paleta, a escala tipográfica e o espaçamento padrão do Tailwind */
     --color-*: initial;
     --text-*: initial;
     --spacing-*: initial;
     --radius-*: initial;
     --shadow-*: initial;
     --breakpoint-*: initial;

     /* redeclara SOMENTE o que o design system define */
     --color-verde-escuro: #263822;
     --color-laranja-escuro: #A85208;
     /* … demais tokens de §2, §3, §4, §5, §6.4, §6.5 … */
   }
   ```

3. CSS próprio continua permitido e usa `var(--cor-*)`; utilitários usam os nomes gerados
   (`bg-verde-escuro`, `text-base`, `p-4`, `rounded-md`).

**Racional**: Tailwind 4 não é CSS-in-JS e não adiciona **nenhum** byte de runtime — é um plugin de
build que emite CSS estático, logo não cai na proibição do Princípio V (que veta CSS-in-JS,
bibliotecas de UI e gerenciadores de estado). Mais importante: com `--color-*: initial`, classes de
fora do design system (`bg-blue-500`, `text-4xl`) **deixam de existir** — o vocabulário visual
concorrente some, e o Princípio VI passa a depender bem menos de memória humana.

**Correção de escopo desta afirmação** (registrada em `docs/design-system.md` §7.2): zerar os
namespaces **não quebra o build**. Utilitário inexistente simplesmente não gera CSS — o elemento fica
sem estilo, o que aparece em review e no teste visual, mas não reprova a compilação. E a sintaxe de
valor arbitrário (`bg-[#C35E0A]`, `p-[13px]`) continua funcionando, assim como `style` literal em JSX.
Só `@apply` de utilitário inexistente é erro de compilação. Para virar portão de CI de verdade são
necessárias duas regras de lint: proibir `-[…]` em `className` e proibir `style` literal em JSX. Elas
entram junto com o Tailwind, não depois.

**Conflito documental — resolvido em 2026-08-11**: `docs/design-system.md` §1.4 afirmava "sem
framework de CSS". A regra de governança do Princípio VI ("divergência resolve-se alterando o design
system primeiro") exigia emendar o documento antes da primeira linha de UI. Feito: **v1.1.0**, com
§1.4 reescrito para "zero dependência visual **de runtime**", §7.1 com o mapeamento `@theme` sobre os
tokens existentes — sem renomear nenhum — e §7.2 com os limites reais da imposição.

**Alternativas rejeitadas**:
- *CSS Modules puro* (status quo do design system): cumpre a constituição sem emenda, mas o usuário
  determinou Tailwind 4 explicitamente e a determinação prevalece sobre a preferência técnica.
- *Tailwind com defaults ativos*: dobraria o CSS gerado e abriria a porta para `bg-slate-700`,
  violando o Princípio VI justamente onde o Tailwind poderia reforçá-lo.
- *`@apply` em classes semânticas*: mantém o design system intacto mas anula o ganho de imposição e
  cria uma segunda indireção; permitido pontualmente para o anel de foco e o reset, não como padrão.

---

## R-02 — Framer Motion (pacote `motion`) restrito a componentes de apresentação

**Decisão**: usar `motion` v12 (sucessor publicado do `framer-motion`), importando de `motion/react`,
com três restrições de contenção:

1. **`LazyMotion` + `domAnimation`** na raiz e uso de `<m.div>` em vez de `<motion.div>`, reduzindo o
   bundle de ~34 kB para ~18 kB gzip.
2. **`<MotionConfig reducedMotion="user">`** na raiz — respeita `prefers-reduced-motion` em todas as
   animações declarativas, cobrindo §6.5 do design system e WCAG 2.3.3 sem CSS adicional.
3. Uso permitido **apenas** em `src/components/atoms|molecules|organisms`; durações vêm dos tokens
   (`--transicao-rapida` 120ms, `--transicao-base` 200ms). Proibido animar em `services/`, `lib/` ou
   condicionar regra de negócio a estado de animação.

**Racional**: é dependência de runtime nova e, portanto, **violação do Princípio V** — não há como
enquadrá-la como exceção técnica. A justificativa é de produto: o usuário determinou a stack. Os
usos concretos na feature são o feedback de operação demorada (FR-047), a transição de troca de visão
ativa (FR-012/SC-011) e a entrada de mensagens de erro anunciadas (FR-046) — todos alcançáveis com
CSS, mas com consistência menor entre telas.

**Alternativas rejeitadas**:
- *Transições CSS puras* (`transition`, `@keyframes`, `@starting-style`): cumprem 100% dos requisitos
  desta feature sem dependência. Rejeitadas apenas pela determinação de stack; permanecem como plano
  de saída caso a exceção expire.
- *Web Animations API direta*: sem dependência, mas exige `useEffect` imperativo e refs em cada
  componente — empurra lógica para dentro da UI, atritando com o Princípio II.

**Consequência de governança**: a constituição só admite exceção "temporária, com data de expiração".
Uma dependência permanente exige **emenda da constituição para v1.1.0** listando `tailwindcss`
(build) e `motion` (runtime) como pré-aprovadas, ou o registro de exceção com prazo. Decisão do
mantenedor; registrada em Complexity Tracking.

---

## R-03 — Estado em store externo; Context **apenas** como injeção de dependência

**Decisão**: separar as duas responsabilidades que a expressão "estado global" costuma confundir.

| Responsabilidade | Mecanismo | Muda em runtime? |
|---|---|---|
| Onde o estado da sessão mora e como notifica mudança | store externo + `useSyncExternalStore` | sim |
| Como as portas e o handle do store alcançam componentes fundos | um Context, valor criado no bootstrap | **não** |

```
AuthPort.aoMudarSessao ──▶ sessionStore (snapshot imutável, criado por fábrica)
                               │  subscribe / getSnapshot
                               ▼
     <PortasContext value={{ auth, usuarios, auditoria, sessionStore }}>   ← referência estável
                               │
                       useSession() ──▶ qualquer componente, em qualquer profundidade
```

**Regras de contenção — o que torna isto diferente de "estado no Context"**:

1. O provider **não pode** conter `useState`, `useReducer` ou qualquer valor que mude. Só recebe por
   prop o objeto montado no bootstrap e o repassa. Valor constante ⇒ **zero re-render** propagado.
2. Um único Context para a aplicação inteira (`PortasContext`), não um por porta — sem pirâmide de
   providers.
3. `createContext` é permitido **somente** em `src/services/`. Em `components/` é rejeitado em
   review; é a linha que impede o padrão de degradar para estado compartilhado.
4. `useSession()` continua lendo por `useSyncExternalStore`: o Context entrega o *store*, não o
   *snapshot*. Quem não assina não re-renderiza.
5. `getSnapshot` devolve **a mesma referência** enquanto nada muda (cache do último snapshot),
   evitando o loop infinito clássico do `useSyncExternalStore`.
6. Estado de servidor (lista de usuários, auditoria) **não** entra no store nem no Context: cada
   página usa `useRequisicao()` (`src/lib/useRequisicao.ts`), ~40 linhas com
   `carregando/dados/erro/recarregar` e `AbortController`. Sem cache global, sem revalidação — a
   escala é de dezenas de usuários (Assumptions da spec).
7. O store é criado por **fábrica** (`criarSessionStore(auth)`), nunca por singleton de módulo: cada
   teste monta o seu, sem vazamento entre arquivos.

**Racional**: a restrição do usuário — "sem estado global (sem Redux, Zustand, Context API)" — visa
o padrão em que um provider guarda estado com `useState` e re-renderiza toda a árvore consumidora a
cada mudança. Esse padrão continua proibido aqui. O que se preserva do Context é o papel de
**injeção de dependência**, e ele resolve um furo real do desenho anterior: os Princípios IV e VIII
exigem que todo teste de integração rode contra o fake in-memory, e o desenho por singleton de módulo
não especificava **como** o fake substituía o adaptador real. As opções eram:

- `vi.mock` das três portas em cada arquivo de teste: frágil (quebra ao renomear caminho), não
  tipado, e impede dois fakes diferentes no mesmo arquivo.
- Registry global `configurarPortas({...})`: cria dependência de ordem — um componente que renderize
  antes da chamada encontra portas indefinidas, e o erro aparece longe da causa.
- Context como DI: substituição explícita por render (`render(<PortasProvider portas={fakes}>…`),
  tipada pelo compilador, isolada por teste.

É a mesma arquitetura do `react-redux` (`<Provider>` carrega o store; `useSelector` assina via
`useSyncExternalStore`) e a recomendação oficial do Zustand para testabilidade e SSR.

**Alternativas rejeitadas**:
- *Context com `useState` no provider* (o "estado global" clássico): re-renderiza todo consumidor a
  cada troca de visão ativa ou revalidação de sessão, inclusive quem só lê o nome do usuário.
  Rejeitado — é exatamente o que a restrição do usuário mira, e com razão.
- *Store em singleton de módulo, sem Context* (desenho anterior): funciona em produção — raiz única,
  sem SSR — mas empurra a injeção do fake para module mocking e sofre da dependência de ordem acima.
- *Prop drilling puro*: com pages → templates → organisms → molecules → atoms, a sessão atravessaria
  quatro níveis em toda tela interna; qualquer mudança de forma quebraria dezenas de assinaturas.
- *Variável mutável de módulo + evento custom no `window`*: mesma ideia do store, porém sem
  integração com o agendamento concorrente do React — risco de tearing entre componentes.

**Custo aceito**: uma indireção a mais no bootstrap e a disciplina da regra 3, verificável por lint
(`no-restricted-imports` de `createContext` fora de `src/services/`).

---

## R-04 — `react-router-dom` v7 em modo declarativo, com o `Guarda` como rota de layout

**Decisão**: adotar `react-router-dom` v7 (~14 kB gzip) em **modo declarativo**, e emendar o
Princípio V para admiti-lo com fronteira explícita (constituição v1.1.0).

- `<BrowserRouter basename={import.meta.env.BASE_URL}>` no `main.tsx`.
- A tabela de rotas continua **dado** em `src/config.ts` (Princípio III): cada rota declara
  `caminho`, `pagina`, `perfisPermitidos` e `exigeTrocaDeSenha`. `config.ts` **não importa**
  `react-router-dom`; `main.tsx` traduz a tabela para o array consumido por `useRoutes()`.
- O `Guarda` vira **rota de layout** com `<Outlet />` — uma instância para toda a árvore interna, em
  vez de um wrapper repetido por página. A ordem de decisão de `contracts/rls-e-rotas.md` §B.1 não
  muda; muda apenas onde ela é montada.
- **GitHub Pages**: `base` no `vite.config.ts` + script de pós-build copiando `dist/index.html` para
  `dist/404.html` (seção Deploy da constituição). Continua necessário — `basename` resolve o prefixo
  dentro da aplicação, não a ausência de servidor no deep link.

**Regras de contenção** — o que impede a dependência de invadir as fronteiras dos Princípios II e IV:

1. **Modo declarativo apenas.** `<BrowserRouter>` + `useRoutes()`. Proibidos `createBrowserRouter`,
   `loader`, `action`, `fetcher` e `defer`: I/O é responsabilidade das portas (Princípio IV), e
   `loader` moveria acesso a dados para dentro do roteador, fora da fronteira substituível.
2. **Import proibido em `src/services/` e `src/lib/`.** Regra de negócio não navega; ela devolve
   resultado e quem navega é o componente. Imposto por `no-restricted-imports`.
3. **Navegação por `<Link>`/`<NavLink>`, sempre.** `useNavigate` é permitido só em redirecionamento
   consequente de ação já executada (pós-entrada, pós-saída, pós-troca de senha) e em `<Navigate>`
   dentro do `Guarda`. Substituir um link por `onClick={() => navigate(...)}` é rejeitado em review:
   destrói abrir-em-nova-aba, o preview da URL e a semântica de âncora.
4. **`?destino=` é validado antes de honrado** (`src/lib/destino.ts`, função pura): só caminho
   interno começando com `/` e sem `//` inicial. Sem isso, `?destino=https://…` transforma a tela de
   entrada em redirecionamento aberto, com a credencial recém-usada em contexto.
5. **Foco no `<h1>` a cada troca de rota continua sendo código nosso.** O react-router não gerencia
   foco; §B.3 permanece requisito verificado por teste, não algo herdado da biblioteca.

**Racional**: a decisão anterior (roteador próprio, ~150 linhas) economizava a parte errada. O
`Guarda` — a lógica de verdade — é código nosso nos dois cenários; o que o roteador próprio
adicionava era infraestrutura indiferenciada com quatro armadilhas conhecidas:

- **Semântica de âncora**: `<a>` com `preventDefault` incondicional quebra ctrl-clique, clique do
  meio e "abrir em nova aba". Acertar exige checar `metaKey`/`ctrlKey`/`shiftKey`/`button`/`target`.
  O Princípio VII é NÃO NEGOCIÁVEL; comprar isso pronto é o argumento mais forte.
- **`history.pushState` não emite evento**: ou se aplica monkey-patch global no `history` (efeito
  colateral que vaza entre arquivos de teste), ou todo `pushState` fora do módulo dessincroniza a UI
  em silêncio. O react-router é dono do objeto `history` e fecha o buraco.
- **`basename`**: o prefixo do GitHub Pages teria de ser somado no navegar e removido no casamento,
  em dois pontos, e ainda na ida e volta do `?destino=`.
- **`useSearchParams`**: usado pelo `destino` e pelos filtros de período da auditoria (FR-042).

Os critérios de admissão do Princípio V v1.1.0 são cumpridos: resolve comportamento observável do
navegador (item 1), tem fronteira de uma linha (item 2), é infraestrutura transversal e não
conveniência pontual (item 3), tem a maior adoção do ecossistema React (item 4) e o plano de saída é
o próprio desenho anterior desta seção, preservado no histórico (item 5).

**Alternativas rejeitadas**:
- *Roteador próprio sobre History API* (decisão anterior): defensável por contagem de rotas — são 13
  —, mas custa reimplementar semântica de âncora e sincronia de histórico, exatamente onde o custo de
  errar é acessibilidade. Permanece como plano de saída.
- *`react-router` em modo data router* (`createBrowserRouter` com `loader`): a ergonomia que
  justificaria a versão completa é justamente a que o Princípio IV proíbe aqui.
- *TanStack Router*: tipagem de rota superior, mas resolve um problema que 13 rotas não têm, e traz
  passo de geração de código.
- *Roteamento por hash* (`#/usuarios`): dispensaria o `404.html`, mas polui URLs compartilhadas e
  atrapalha o `destino` pós-login.

---

## R-05 — Autorização na camada de dados: RLS lendo tabelas, nunca claims do JWT

**Decisão**: toda política RLS resolve perfis por **consulta a `user_roles`**, através de funções
`SECURITY DEFINER` e `STABLE`, e não por claims embutidas no token:

```sql
public.perfis_do_usuario()  -- returns role[]  (lê user_roles do auth.uid())
public.tem_perfil(role)     -- boolean
public.eh_administrador()   -- boolean
public.usuario_ativo()      -- profiles.status = 'ativo'
public.turmas_do_professor()-- uuid[] via profiles.teacher_id
public.sessao_valida()      -- inatividade 30min + timebox 12h (ver R-08)
```

Todo `USING`/`WITH CHECK` começa por `public.usuario_ativo() AND public.sessao_valida()`.

**Racional**: FR-016 exige que mudança de perfil valha **na próxima ação, sem novo login**. Claim em
JWT só muda no refresh do token (até 1h de defasagem) e não pode ser revogada; leitura de tabela é
avaliada a cada requisição, o que entrega FR-016, FR-038 e SC-009 (conta bloqueada rejeitada na
solicitação seguinte) pela própria mecânica, sem código de invalidação.

**Alternativas rejeitadas**:
- *Custom Access Token Hook com `roles` no JWT*: mais rápido (zero joins), mas defasado por design e
  incapaz de cortar acesso de usuário recém-bloqueado — quebra FR-038 e SC-009.
- *Checagem só na Edge Function*: deixaria a leitura direta ao PostgREST aberta, exatamente o ataque
  descrito na User Story 3.

**Custo aceito**: `SECURITY DEFINER` + `STABLE` faz o Postgres cachear o resultado por statement;
índice em `user_roles(user_id)` e em `profiles(id)` mantém o custo irrelevante na escala da spec.

---

## R-06 — Operações privilegiadas em Edge Functions; nenhuma chave de serviço no front-end

**Decisão**: três Edge Functions (Deno, `supabase/functions/`), todas usando a *service role key* que
existe **apenas** no ambiente do servidor (FR-039):

| Função | Cobre | Por que não dá para fazer no cliente |
|---|---|---|
| `auth-login` | FR-002, FR-003, FR-004, SC-004 | contenção por tentativas precisa contar antes de autenticar e responder em tempo constante |
| `admin-users` | FR-017…FR-024, FR-026, FR-040 | criar usuário no GoTrue e emitir senha temporária exige service role |
| `password-recovery` | FR-029, FR-030, FR-031, FR-005 | precisa decidir *silenciosamente* não enviar a e-mail inexistente/bloqueado |

Regras comuns: validam o JWT do chamador, reconferem o perfil **no banco** (nunca confiam no corpo da
requisição), escrevem a trilha de auditoria na mesma transação da mutação e devolvem mensagens
genéricas em pt-BR vindas de `config.ts`.

**Racional**: é literalmente o que a seção "Restrições Técnicas, Ambiente e Segredos" da constituição
determina. RLS protege leitura e escrita direta; Edge Function protege as operações que exigem
privilégio acima do usuário autenticado.

**Alternativas rejeitadas**:
- *`security definer` RPCs no Postgres para criar usuário*: não dá — criar identidade no GoTrue exige
  a Admin API, fora do alcance do SQL.
- *Painel administrativo separado com back-end próprio*: infraestrutura desproporcional para dezenas
  de usuários e contraria "publicação como conteúdo estático".

---

## R-07 — Contenção por tentativas e resposta indistinguível

**Decisão**: `auth-login` executa, nesta ordem:

1. Lê `login_attempts` por `email_normalizado` **e** por `ip_hash` na janela de 15 min.
2. Se conta ou origem já somam 5 falhas → responde `429` com `retry_after_segundos`, **sem** tentar
   autenticar (FR-004; a senha correta também é recusada, edge case da spec).
3. Caso contrário, delega ao GoTrue. Falha → grava tentativa e responde `401` com **a mesma** string
   genérica para e-mail inexistente e senha errada (FR-002).
4. Sucesso → verifica `profiles.status`; `bloqueado`/`desativado` responde `403` com a orientação de
   procurar a secretaria (FR-003) e **descarta a sessão emitida**.
5. Toda resposta é liberada em um **piso fixo de tempo** (`await` até ~350 ms desde o início),
   eliminando o canal lateral de tempo exigido por SC-004.

Rotação: limpeza de `login_attempts` com mais de 24h por `pg_cron` diário.

**Racional**: o piso de tempo é a única forma barata de igualar o caminho "usuário não existe"
(rápido) ao caminho "hash de senha verificado" (~100–250 ms de bcrypt) — sem ele, SC-004 falha por
medição, mesmo com textos idênticos.

**Alternativas rejeitadas**:
- *Rate limit nativo do Supabase Auth*: existe, mas é por IP e global, não por conta, e não permite
  informar "quando poderá tentar de novo" (exigência explícita da FR-004).
- *Contagem no cliente* (localStorage): contornável abrindo aba anônima; não é controle.

---

## R-08 — Expiração de sessão: 30 min de inatividade e 12h absolutas, decididas pelo servidor

**Decisão**: dois níveis, com o servidor sempre decidindo (FR-007):

1. **Configuração do Supabase Auth**: `jwt_expiry = 3600`, rotação de refresh token ativada,
   *inactivity timeout* 30 min e *time-box* 12h quando o plano do projeto os oferecer.
2. **Rede de segurança independente do plano**: `public.sessao_valida()`, `SECURITY DEFINER`, lê
   `auth.sessions` pelo `session_id` presente no JWT e devolve falso se
   `now() - refreshed_at > 30 min` **ou** `now() - created_at > 12h`. Está em todas as políticas RLS,
   então uma sessão vencida deixa de ler dados mesmo com token ainda válido.
3. **Cliente**: temporizador de inatividade apenas para **experiência** — encerra a sessão e leva à
   tela de entrada com aviso de expiração (cenário 7 da US1). Nunca é a fonte da verdade; o relógio
   adiantado do dispositivo não amplia acesso porque o banco reprova.

**Alternativas rejeitadas**:
- *Só o temporizador do cliente*: contornável e explicitamente vetado pelo edge case "relógio do
  dispositivo adiantado ou atrasado".
- *Só a configuração do GoTrue*: depende do plano do projeto; a feature não pode ficar refém disso.

---

## R-09 — Força de senha verificada nos dois lados

**Decisão**: mínimo de 8 caracteres e recusa de senhas notoriamente comuns (Assumptions da spec).

- **Cliente** (`src/lib/forcaDeSenha.ts`, função pura): valida comprimento e confronta uma lista
  embutida das ~1.000 senhas mais vazadas (≈12 kB, carregada por `import()` dinâmico só na tela de
  troca). Devolve **lista de regras não atendidas** em pt-BR, porque FR-028 exige explicar o que
  falta.
- **Servidor**: política de senha do Supabase Auth (comprimento mínimo) e, quando disponível,
  proteção contra senhas vazadas via HIBP. `admin-users` reaplica a mesma função pura ao gerar e ao
  aceitar senha.

**Racional**: validação de cliente é usabilidade; validação de servidor é o controle. FR-028 pede a
explicação detalhada, que a mensagem do GoTrue não fornece.

**Alternativas rejeitadas**:
- *`zxcvbn`*: ~400 kB, dependência nova, veto do Princípio V para ganho marginal nesta escala.
- *Regra de composição (maiúscula + número + símbolo)*: contraindicada pelo NIST SP 800-63B e não
  pedida pela spec.

---

## R-10 — Troca de visão ativa não é troca de permissão

**Decisão**: `profiles.active_view` guarda a visão preferida (FR-012). A alternância é um `UPDATE` em
uma coluna que o próprio usuário pode alterar — com `WITH CHECK` garantindo que o valor esteja entre
os perfis realmente atribuídos a ele. **Nenhuma** política RLS consulta `active_view`.

**Racional**: FR-013 e o cenário 8 da US3 exigem que a visão mude apenas painel e menu. Deixar
`active_view` fora de toda política torna essa garantia estrutural — não há política a esquecer.
Perfil removido enquanto era a visão ativa: um *trigger* em `user_roles` reajusta `active_view` para
o perfil de maior alcance restante, e a próxima ação do usuário já cai no painel novo com aviso
(FR-016).

**Ordem de alcance** (das Assumptions): `administrador > secretaria > coordenacao > professor`,
implementada como função `public.visao_padrao(role[])` — uma única definição usada pelo trigger, pela
Edge Function e, espelhada, por `config.ts` para a UI.

---

## R-11 — Estratégia de testes em três camadas

**Decisão**:

| Camada | Ferramenta | Alvo | Constituição |
|---|---|---|---|
| Unitária | Vitest | `src/lib/` e `src/services/` puros: força de senha, casamento de rota, visão padrão, matriz de permissões | Princípio VIII |
| Integração de fluxo | Vitest + @testing-library/react + jsdom | componentes reais contra o **fake in-memory** das portas; nenhum Supabase | Princípios IV e VIII |
| Contrato de dados (RLS) | Vitest + `supabase-js` contra `supabase start` local | US3 inteira: requisições diretas com credencial de cada perfil | ver nota |
| Acessibilidade | `axe-core` sobre o render das telas + verificação a 320px | SC-006, SC-007 | Princípio VII |

**Nota de constituição**: o Princípio VIII diz "nunca contra o Supabase real". A User Story 3 só pode
ser provada emitindo requisições diretas ao armazenamento — para isso existe a terceira camada,
rodando contra uma instância **local e efêmera** do Supabase CLI, jamais contra o projeto de produção.
Isso é um esclarecimento (PATCH) do Princípio VIII, não uma exceção; anotado no plano.

**Alternativas rejeitadas**:
- *pgTAP dentro do banco*: prova a política mas não prova o caminho real do cliente pelo PostgREST,
  que é onde a US3 mora.
- *Testes de RLS contra o projeto remoto de staging*: lentos, com estado compartilhado e credenciais
  de longa duração no CI.

---

## R-12 — Atomic Design dentro da estrutura obrigatória da constituição

**Decisão**: os cinco níveis vivem sob `src/components/`, que a constituição já exige, evitando criar
uma raiz nova:

```
src/components/atoms/       Botao, CampoTexto, Rotulo, Selo, Icone, TextoAuxiliar, Carregando
src/components/molecules/   CampoDeFormulario, ItemDeMenu, SeletorDeVisao, LinhaDeUsuario, FiltroDeUsuarios
src/components/organisms/   FormularioDeEntrada, FormularioDeTrocaDeSenha, CabecalhoApp, MenuDePerfil, TabelaDeUsuarios, FormularioDeUsuario, ListaDeAuditoria
src/components/templates/   LayoutDeAutenticacao, LayoutInterno, Guarda
src/components/pages/       EntrarPage, TrocarSenhaPage, EsqueciSenhaPage, RedefinirSenhaPage, PainelAdministradorPage, PainelSecretariaPage, PainelCoordenacaoPage, PainelProfessorPage, UsuariosPage, NovoUsuarioPage, AuditoriaPage, AcessoNegadoPage
```

Regras de fronteira que tornam a hierarquia verificável em review:
- `atoms` e `molecules` **não** importam de `services/` — recebem tudo por prop.
- Apenas `pages` chamam `services/`; templates e abaixo permanecem puros de I/O (Princípio II).
- `lucide-react` é importado somente dentro de `atoms/Icone.tsx`, com `aria-hidden="true"` por padrão
  e `aria-label` obrigatório quando o ícone é o único conteúdo de um controle (Princípio VII).
- Todas as props em `interface` nomeada, no `types.ts` do módulo (Princípio I).

---

## R-13 — Envio de e-mail em pt-BR

**Decisão**: SMTP próprio da escola configurado no Supabase Auth (o SMTP embutido tem limite de ~2
mensagens/hora e não serve nem para o piloto). Templates de convite, recuperação e senha temporária
reescritos em português do Brasil (FR-048), com `redirectTo` apontando para a `base` do GitHub Pages e
o domínio incluído na allowlist de redirect do projeto.

**Alternativas rejeitadas**: provedor de e-mail transacional chamado direto da Edge Function — mais
uma integração e mais um segredo, sem ganho, já que o GoTrue precisa do SMTP configurado de qualquer
forma para os fluxos nativos.

---

## R-14 — Supabase local pelo CLI em desenvolvimento; hospedado só em staging e produção

**Decisão**: três ambientes, com o desenvolvimento e **toda** a automação rodando contra instância
local do Supabase CLI:

| Ambiente | Uso | Comando |
|---|---|---|
| local | dev diário, `test:integration`, `test:rls`, `test:a11y`, CI | `supabase start`, `supabase db reset` |
| staging (hospedado) | valida o que só existe na plataforma: SMTP real, proteção de senha vazada, configuração de sessão, deploy do Pages | `supabase db push --linked` |
| produção (hospedado) | — | `db push` no merge |

**Racional**: não é preferência de conforto — o remoto **não consegue** rodar os testes que a spec
exige.

1. A User Story 3 exige estado destrutivo repetível: 5 falhas de senha para acionar a contenção
   (FR-004), bloqueio de conta, tentativa de rebaixar o último administrador (FR-023). Num projeto
   hospedado compartilhado, dois desenvolvedores se derrubam, o CI não paraleliza e a suíte passa a
   depender da ordem de execução. `supabase db reset` devolve estado conhecido em segundos.
2. Migração só se prova **do zero**. Contra o remoto só se aplica para frente, então a cadeia nunca é
   exercitada em banco vazio — que é exatamente o cenário do deploy.
3. FR-029/FR-030 exigem exercitar recuperação de senha repetidamente; o SMTP embutido do hospedado
   limita ~2 mensagens/hora. Local, o Inbucket (`localhost:54324`) captura tudo sem limite.
4. Trabalhar contra o remoto exige a *service role key* na máquina de desenvolvimento, com risco de
   commit acidental. As chaves locais são demo públicas e inócuas.
5. Projeto gratuito hospedado pausa após 7 dias sem uso.

**Custos aceitos e mitigação**:
- Docker em execução (~2–4 GB). No WSL2 o repositório precisa estar no sistema de arquivos nativo
  (`/home/...`), não em `/mnt/c`, sob pena de I/O lento.
- **Deriva de versão** entre imagem local e plataforma: versões fixadas em `supabase/config.toml` e
  `db push` para staging desde cedo, não só na véspera do lançamento.
- Recursos ausentes do ambiente local — proteção contra senha vazada (HIBP), *inactivity timeout* e
  *time-box* de sessão nas configurações de Auth, SMTP customizado. O desenho já não depende deles:
  R-08 mantém `sessao_valida()` em RLS como rede de segurança e R-09 valida senha comum por lista
  local. Confirmação obrigatória em staging antes da produção.

**Alternativas rejeitadas**:
- *Projeto hospedado de desenvolvimento compartilhado*: estado mutável comum, impossível de resetar
  sem atrapalhar outra pessoa, e nenhuma das cinco razões acima é contornável.
- *Um projeto hospedado por desenvolvedor*: resolve a concorrência, mas continua sem `db reset` de
  ciclo curto, sem provar a cadeia do zero, com limite de e-mail e com service role espalhada por
  máquina.

---

## Pendências residuais

Nenhuma bloqueia a Fase 1. Duas decisões de governança dependem do mantenedor e estão em Complexity
Tracking do `plan.md`:

1. Emendar `docs/design-system.md` → v1.1.0 (mapeamento `@theme`, §1.4 reescrita). **Bloqueia a
   primeira tarefa de UI.**
2. Emendar `.specify/memory/constitution.md` → v1.1.0 (Princípio V passa a listar `tailwindcss` como
   build-time pré-aprovado e `motion` como runtime pré-aprovado) **ou** registrar exceção com data de
   expiração. **Bloqueia o merge**, não o início da implementação.
