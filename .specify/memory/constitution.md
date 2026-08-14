<!--
Sync Impact Report
==================
Version change: 1.0.0 → 1.1.0  (2026-08-11)
Bump rationale: MINOR — ampliação material do Princípio V. O teto numérico ("React, TS, Vite e uma
biblioteca de ícones. Nada mais.") foi substituído por lista fechada com fronteira de confinamento
por dependência + 5 critérios objetivos de admissão. Nenhum princípio removido ou redefinido de forma
incompatível; a proibição dura (CSS-in-JS, UI genérica, estado global, HTTP extra, datas) permanece.

Princípio V — entradas admitidas nesta emenda:
  - react-router-dom  → roteamento; proibido em src/services/ e src/lib/
  - motion            → animação de apresentação
  (@supabase/supabase-js e lucide-react já eram permitidos; agora com fronteira explícita.)

Impacto nos artefatos dependentes:
  ✅ specs/001-.../plan.md — portão V passa a PASS; CT-1 absorvido; ação de governança 2 concluída
  ✅ specs/001-.../research.md — R-04 reescrita (roteador próprio → react-router-dom)
  ✅ specs/001-.../contracts/rls-e-rotas.md — Parte B em idioma react-router
  ⚠ docs/design-system.md — §1.4 ("sem framework de CSS") continua pendente de emenda p/ v1.1.0;
     não é objeto desta emenda
  ⚠ Princípio VIII — distinção "Supabase de produção" × "instância local efêmera" segue pendente
     (PATCH recomendado, fora do escopo desta emenda)

-- histórico --
Version change: (template, não versionado) → 1.0.0
Bump rationale: Primeira ratificação. Todos os placeholders substituídos por princípios concretos.

Princípios definidos (novos):
  - I. TypeScript Estrito (NÃO NEGOCIÁVEL)
  - II. UI Sem Lógica de Negócio
  - III. Configuração Única em src/config.ts
  - IV. Fronteira de Back-end Substituível
  - V. Dependências Mínimas
  - VI. Mobile-First e Design System como Referência Absoluta
  - VII. Acessibilidade WCAG AA (NÃO NEGOCIÁVEL)
  - VIII. Testes Unitários e de Integração

Seções adicionadas:
  - Restrições Técnicas, Ambiente e Segredos
  - Deploy e Distribuição
  - Fluxo de Desenvolvimento e Portões de Qualidade

Seções removidas: nenhuma (template genérico substituído).

Templates e artefatos dependentes:
  ✅ .specify/templates/plan-template.md — Constitution Check preenchido com os 8 portões
  ✅ .specify/templates/tasks-template.md — nota de tarefas obrigatórias por princípio
  ✅ .specify/templates/spec-template.md — sem referências a princípios; nenhuma mudança necessária
  ✅ .specify/templates/checklist-template.md — genérico; nenhuma mudança necessária
  ✅ docs/design-system.md — criado em 2026-08-10 (v1.0.0), referenciado pelo Princípio VI
  ⚠ README.md — pendente: descrever stack, comandos e link para esta constituição

Follow-up TODOs:
  - (nenhum bloqueante)
-->

# Constituição — Gestão Escolar da Escola da Árvore

## Core Principles

### I. TypeScript Estrito (NÃO NEGOCIÁVEL)

`strict: true` no `tsconfig.json` é obrigatório e não pode ser afrouxado por feature, arquivo ou
build. Regras:

- Proibido `any` implícito ou explícito. Use `unknown` + narrowing, generics ou tipos de união.
- Proibido `@ts-ignore`, `@ts-expect-error` e `as unknown as` sem comentário adjacente explicando
  a causa e um link para a issue de remoção.
- Toda `prop` de componente é tipada por uma `interface` **nomeada** declarada em um `types.ts`
  (`src/types.ts` ou `types.ts` do módulo). Props inline anônimas são rejeitadas em review.
- `tsc --noEmit` deve passar sem erros antes de qualquer merge.

**Racional**: tipos são o contrato executável entre config, camada de dados e UI. Um único `any`
quebra a cadeia de verificação que substitui a documentação neste projeto.

### II. UI Sem Lógica de Negócio

Componentes são funcionais apenas — `class components` são proibidos. Um componente de UI recebe
dados prontos e emite eventos; ele não decide regras.

- Proibido dentro de componentes: cálculo de regra de negócio, chamadas diretas a SDK/HTTP,
  montagem de queries, formatação de domínio, validação de domínio.
- Esse trabalho vive em `src/services/` (casos de uso) e `src/lib/` (utilitários puros).
- Um componente pode conter: estado de interação (aberto/fechado, foco), binding de eventos e
  renderização derivada das props.

**Racional**: separar decisão de renderização torna a regra testável sem DOM e mantém a UI
descartável quando o design mudar.

### III. Configuração Única em `src/config.ts`

Toda personalização do usuário/instituição fica em `src/config.ts`. Nenhum outro arquivo pode ser
editado para customizar a aplicação (textos, cores de marca, itens de menu, links, contatos,
seções, feature flags de conteúdo).

- `src/config.ts` contém **dados**, nunca lógica, JSX ou imports de componentes.
- Cada campo de config é tipado por uma interface em `types.ts`.
- Se uma customização exigir editar um componente, isso é um defeito: o campo faltante deve ser
  adicionado a `config.ts` + `types.ts`.
- Segredos e endpoints **não** entram em `config.ts` — ver seção de ambiente.

**Racional**: fluxo obrigatório `config` (dados) → `types` (contratos) → `components` (UI). Uma
pessoa não-desenvolvedora deve conseguir personalizar a página lendo um único arquivo.

### IV. Fronteira de Back-end Substituível

O back-end é Supabase, mas nenhum código fora da camada de dados pode saber disso.

- `src/services/` define interfaces de repositório/porta em TypeScript (ex.: `StudentRepository`),
  expressas em tipos de domínio próprios do projeto.
- `src/services/supabase/` é a única pasta autorizada a importar `@supabase/supabase-js` e a única
  que conhece nomes de tabela, colunas ou formato de resposta do Supabase.
- Componentes, hooks e `config.ts` importam apenas as interfaces — nunca o client concreto.
- Toda porta precisa de uma implementação fake/in-memory usada pelos testes; a existência do fake
  é a prova de que a troca de back-end é possível.

**Racional**: a instituição pode migrar de provedor; o custo dessa migração deve ficar contido em
uma pasta.

### V. Dependências Mínimas

Toda dependência de runtime é **nomeada aqui e confinada a uma fronteira**. O que não está na lista
não entra sem emenda a este arquivo.

| Dependência | Papel | Fronteira de confinamento |
|---|---|---|
| `react`, `react-dom` | base | — |
| `lucide-react` | ícones (uma única biblioteca) | `src/components/atoms/Icone.tsx` |
| `@supabase/supabase-js` | adaptador do Princípio IV | `src/services/supabase/` |
| `react-router-dom` | roteamento e semântica de link | camada de componentes e `main.tsx`; **proibido** em `src/services/` e `src/lib/` |
| `motion` | animação de apresentação | componentes de apresentação; nunca carrega regra de negócio |

`typescript`, `vite` e o plugin de build de CSS são ferramentas de build, não runtime.

**Critérios de admissão** — uma dependência nova só é admissível se cumprir **todos**:

1. Resolve um problema que a plataforma não resolve, ou que o código próprio só resolveria
   reimplementando comportamento observável do navegador (semântica de âncora, foco, histórico).
2. Tem fronteira de confinamento declarável em uma linha e imponível por lint.
3. Peso e superfície proporcionais ao uso: aceita-se dezenas de kB por infraestrutura transversal,
   não por conveniência pontual.
4. Manutenção ativa e adoção larga — o risco de abandono é o principal custo, não o bundle.
5. Existe plano de saída: qual alternativa nativa assume o papel se a dependência for removida.

Admissão exige justificativa escrita no PR com a alternativa nativa avaliada, aprovação explícita do
mantenedor e **emenda desta tabela no mesmo PR**. Ferramentas de dev (test runner, linter, formatter,
tipos) não contam como runtime, mas seguem a mesma regra de justificativa.

**Proibido, sem exceção**: framework de CSS-in-JS, biblioteca de UI genérica, gerenciador de estado
global, cliente HTTP extra, biblioteca de datas — resolva com plataforma ou código próprio.

**Racional**: cada dependência é superfície de segurança, peso de bundle e risco de abandono em um
projeto mantido por poucas pessoas. Uma lista fechada com critérios explícitos protege isso melhor do
que um teto numérico, que empurra para reimplementar comportamento de navegador — mais caro e mais
propenso a falha de acessibilidade do que a dependência que se queria evitar.

### VI. Mobile-First e Design System como Referência Absoluta

- Todo componente deve funcionar e permanecer legível em **320px** de largura, sem scroll
  horizontal na página.
- CSS é escrito mobile-first: estilo base para telas pequenas, `@media (min-width: …)` para
  ampliar. `max-width` como estratégia primária é proibido.
- `docs/design-system.md` é a fonte única de cores, tipografia, espaçamento e breakpoints. Valores
  literais de cor, tamanho de fonte ou espaçamento fora dos tokens definidos ali são rejeitados.
- Divergência entre código e o design system resolve-se alterando o design system primeiro.

**Racional**: a maior parte do público acessa por celular; um único valor mágico fora do sistema
inicia a divergência visual que ninguém consegue reverter depois.

### VII. Acessibilidade WCAG AA (NÃO NEGOCIÁVEL)

- Todo link e todo controle interativo sem texto visível autoexplicativo tem `aria-label`.
- Toda `<img>` tem `alt`; imagens decorativas usam `alt=""` mais `aria-hidden="true"`.
- Contraste de texto e de elementos de interface atende WCAG 2.1 nível AA (4.5:1 para texto
  normal, 3:1 para texto grande e componentes).
- Navegação completa por teclado, com foco visível; ordem de foco segue a ordem visual.
- Todo elemento clicável é `<button>` ou `<a>` — nunca `<div>` com `onClick`.

**Racional**: é uma aplicação escolar usada por famílias com necessidades variadas; acessibilidade
é requisito funcional, não polimento.

### VIII. Testes Unitários e de Integração

- Toda regra de negócio em `src/services/` e `src/lib/` tem teste unitário cobrindo o caminho
  feliz e ao menos um caminho de erro.
- Todo fluxo de usuário completo tem teste de integração que renderiza os componentes reais contra
  a implementação fake da porta (Princípio IV) — nunca contra o Supabase real.
- Correção de bug começa por um teste que falha reproduzindo o bug.
- Suíte verde é pré-requisito de merge; testes desabilitados (`skip`, `only`) bloqueiam o merge.

**Racional**: sem testes, os Princípios I–IV viram convenção verbal e degradam no primeiro prazo
apertado.

## Restrições Técnicas, Ambiente e Segredos

- Stack fixa: React 19 + TypeScript + Vite. Sem SSR, sem meta-framework.
- Estrutura de origem obrigatória:
  - `src/config.ts` — personalização (dados)
  - `src/types.ts` — contratos compartilhados
  - `src/components/` — UI
  - `src/services/` — casos de uso e portas de dados
  - `src/services/supabase/` — adaptador concreto
  - `src/lib/` — utilitários puros
- Toda informação de ambiente — URLs de back-end, chaves de API, tokens, endpoints de serviços
  externos — fica em `.env`, lida exclusivamente via `import.meta.env.VITE_*`.
- `.env` nunca é versionado. `.env.example` é versionado, contém todas as chaves com valores
  vazios ou fictícios e é atualizado no mesmo PR que introduz uma variável nova.
- Segredos que não podem ser públicos (service role key, credenciais administrativas) **não podem
  existir** no front-end: qualquer variável embutida por `vite build` é pública. Operações
  privilegiadas exigem back-end/Edge Function e Row Level Security no Supabase.
- Nenhuma credencial, URL de projeto ou token literal pode aparecer em código-fonte, testes ou
  commits.

## Deploy e Distribuição

- O resultado de `vite build` deve funcionar em qualquer CDN estático servindo `dist/` como
  arquivos, sem servidor de aplicação, sem reescrita de rota obrigatória e sem configuração extra.
- GitHub Pages é o alvo principal: `base` do Vite configurado para o caminho do repositório e
  todos os assets referenciados por caminho relativo à base.
- Se houver roteamento client-side, o build gera o fallback estático necessário (`404.html`) para
  que deep links funcionem no Pages.
- O build não pode depender de variáveis de ambiente ausentes: falta de `VITE_*` obrigatória falha
  o build com mensagem clara, nunca gera artefato quebrado em runtime.

## Fluxo de Desenvolvimento e Portões de Qualidade

Todo PR só entra se, nesta ordem:

1. `tsc --noEmit` passa sem erro e sem supressão nova (Princípio I).
2. Lint e formatter passam.
3. Suíte de testes verde, sem testes ignorados (Princípio VIII).
4. `vite build` conclui e `dist/` é servível estaticamente (seção de Deploy).
5. Review humano confirma: nenhuma regra de negócio dentro de componente (II), nenhuma
   customização fora de `config.ts` (III), nenhum import de Supabase fora do adaptador (IV),
   nenhuma dependência nova sem justificativa (V), tokens do design system respeitados (VI),
   `aria-label`/`alt`/contraste verificados (VII).
6. Nenhum segredo ou URL de ambiente adicionado ao código versionado.

Verificação manual mínima antes de marcar uma feature como pronta: abrir a tela a 320px e navegá-la
apenas por teclado.

## Governance

Esta constituição prevalece sobre qualquer outra prática, preferência pessoal ou conveniência de
prazo. Em conflito entre um princípio e uma sugestão de ferramenta, IA ou biblioteca, o princípio
vence.

- **Emendas**: alteração exige PR dedicado que modifique este arquivo, contendo motivação, impacto
  nos artefatos dependentes (`.specify/templates/*`, README, design system) e plano de migração do
  código existente quando a mudança for incompatível.
- **Versionamento** (semântico):
  - MAJOR — remoção ou redefinição incompatível de princípio ou regra de governança.
  - MINOR — novo princípio, nova seção ou ampliação material de orientação.
  - PATCH — esclarecimento, correção de texto, ajuste não semântico.
- **Conformidade**: todo plano gerado por `/speckit-plan` executa o Constitution Check contra os
  princípios I–VIII; violações vão para a tabela de Complexity Tracking com justificativa e
  alternativa mais simples rejeitada. Violação sem justificativa registrada bloqueia o merge.
- **Exceções**: são temporárias, registradas no PR com data de expiração e issue de remoção.
  Exceção sem prazo não existe.
- **Revisão periódica**: a cada release ou a cada 3 meses, o que vier primeiro, o mantenedor
  revisa se os princípios ainda refletem a prática real; divergência resolve-se emendando a
  constituição ou corrigindo o código, nunca ignorando o texto.

**Version**: 1.1.0 | **Ratified**: 2026-08-10 | **Last Amended**: 2026-08-11
