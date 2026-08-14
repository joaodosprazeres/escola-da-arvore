# Design System — Gestão Escolar da Escola da Árvore

**Versão**: 1.1.0 | **Criado**: 2026-08-10 | **Última emenda**: 2026-08-11

Este documento é a **referência absoluta** de cores, tipografia e espaçamento do projeto, conforme o
Princípio VI da [constituição](../.specify/memory/constitution.md). Valor literal de cor, tamanho de
fonte ou espaçamento fora dos tokens definidos aqui é rejeitado em review.

Divergência entre código e este documento resolve-se **alterando este documento primeiro**.

---

## 1. Princípios visuais

1. **Mobile-first**: o layout base é o de 320px. Telas maiores são progressões, nunca o ponto de
   partida.
2. **Contraste antes de estética**: nenhuma combinação abaixo de WCAG AA entra no produto, mesmo que
   pareça melhor.
3. **Nada de valor mágico**: toda medida vem da escala. Se a escala não tem o valor, a escala muda.
4. **Zero dependência visual de runtime**: nada de CSS-in-JS, nada de biblioteca de componentes
   prontos, nenhuma fonte externa — só a pilha de fontes do sistema (Princípio V da constituição).
   Ferramenta de **build** que emite CSS estático é permitida e o projeto usa uma: Tailwind 4,
   configurado na seção 7.1 para conhecer **apenas** os tokens deste documento. A regra que importa
   não é "sem framework"; é que nenhum valor visual exista fora daqui.

---

## 2. Cores

### 2.1 Paleta base

| Token                | Valor     | Papel                                                    |
| -------------------- | --------- | -------------------------------------------------------- |
| `--cor-verde-escuro` | `#263822` | Superfície escura principal, cabeçalho, rodapé, menu     |
| `--cor-preto`        | `#000000` | Superfície escura de máximo contraste, texto sobre claro |
| `--cor-laranja`      | `#C35E0A` | Superfície de destaque, marca, avisos                    |
| `--cor-oliva`        | `#87852F` | Superfície de apoio, seções alternadas                   |
| `--cor-cinza-form`   | `#E3E3E3` | Fundo de formulários e blocos de entrada de dados        |
| `--cor-branco`       | `#FFFFFF` | Superfície clara padrão, texto sobre escuro              |

### 2.2 Variantes derivadas (obrigatórias para texto branco)

`--cor-laranja` e `--cor-oliva` são **meio-tom**: não alcançam 4.5:1 com texto branco. Quando o texto
branco for necessário — botões, etiquetas, chamadas — use estas variantes escurecidas:

| Token                  | Valor     | Contraste com branco | Uso                                                  |
| ---------------------- | --------- | -------------------- | ---------------------------------------------------- |
| `--cor-laranja-escuro` | `#A85208` | 5.42:1 ✓             | Botão primário, superfície laranja com texto branco  |
| `--cor-oliva-escuro`   | `#6E6C26` | 5.47:1 ✓             | Estado de sucesso, superfície oliva com texto branco |

### 2.3 Cores semânticas

| Token           | Valor     | Contraste com branco     | Uso                                                |
| --------------- | --------- | ------------------------ | -------------------------------------------------- |
| `--cor-erro`    | `#8A1F11` | 9.19:1 ✓                 | Mensagens de erro, ação destrutiva, campo inválido |
| `--cor-sucesso` | `#6E6C26` | 5.47:1 ✓                 | Confirmação de operação concluída                  |
| `--cor-aviso`   | `#C35E0A` | usar com texto **preto** | Alerta que não impede a ação                       |
| `--cor-info`    | `#263822` | 12.57:1 ✓                | Mensagem neutra do sistema                         |

Cor **nunca** é o único portador de significado: todo estado semântico acompanha ícone ou texto
(WCAG 1.4.1).

### 2.4 Matriz de contraste (medida, não estimada)

Razões calculadas pela fórmula WCAG 2.1 de luminância relativa. Mínimos: **4.5:1** texto normal,
**3:1** texto grande (≥24px, ou ≥18.7px em negrito) e componentes de interface.

| Fundo                    | Texto branco  | Texto preto   | Texto obrigatório |
| ------------------------ | ------------- | ------------- | ----------------- |
| `#263822` verde escuro   | **12.57:1** ✓ | 1.67:1 ✗      | branco            |
| `#000000` preto          | **21:1** ✓    | —             | branco            |
| `#A85208` laranja escuro | **5.42:1** ✓  | 3.88:1 ✗      | branco            |
| `#6E6C26` oliva escuro   | **5.47:1** ✓  | 3.84:1 ✗      | branco            |
| `#8A1F11` erro           | **9.19:1** ✓  | 2.28:1 ✗      | branco            |
| `#C35E0A` laranja        | 4.26:1 ✗      | **4.93:1** ✓  | preto             |
| `#87852F` oliva          | 3.87:1 ✗      | **5.43:1** ✓  | preto             |
| `#E3E3E3` cinza form     | 1.28:1 ✗      | **16.36:1** ✓ | preto             |
| `#FFFFFF` branco         | —             | **21:1** ✓    | preto             |

### 2.5 Regra de decisão do texto

1. Fundo `#263822`, `#000000`, `#A85208`, `#6E6C26`, `#8A1F11` → texto **branco**.
2. Fundo `#C35E0A`, `#87852F`, `#E3E3E3`, `#FFFFFF` → texto **preto**.
3. Nenhuma outra combinação é permitida sem recalcular o contraste e atualizar esta tabela.

### 2.6 Proibições

- **Proibido** texto branco sobre `#C35E0A` ou `#87852F` — falha AA (4.26:1 e 3.87:1). Use as
  variantes escuras.
- **Proibido** texto preto sobre `#263822` (1.67:1) ou `#000000`.
- **Proibido** texto `#A85208` sobre `#E3E3E3` (4.22:1). Sobre `#FFFFFF` passa (5.42:1).
- **Proibido** qualquer cor fora desta seção, inclusive tons intermediários "só desta vez".

---

## 3. Tipografia

### 3.1 Família

Pilha do sistema, sem download de fonte — desempenho em rede móvel e zero dependência externa:

```css
--fonte-base-familia:
  system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
--fonte-mono: ui-monospace, SFMono-Regular, 'SF Mono', Consolas, 'Liberation Mono', monospace;
```

`--fonte-mono` é para dados tabulares: matrícula, data, percentual de frequência.

### 3.2 Escala

Base de 16px. Nunca definir tamanho em `px` no componente — sempre o token.

| Token          | rem      | px  | Uso                                                |
| -------------- | -------- | --- | -------------------------------------------------- |
| `--fonte-xs`   | 0.75rem  | 12  | Apenas metadados; proibido para conteúdo essencial |
| `--fonte-sm`   | 0.875rem | 14  | Legenda, texto auxiliar, rótulo de campo           |
| `--fonte-base` | 1rem     | 16  | Corpo de texto, entrada de formulário              |
| `--fonte-lg`   | 1.125rem | 18  | Destaque em corpo, título de cartão                |
| `--fonte-xl`   | 1.375rem | 22  | Título de seção (h3)                               |
| `--fonte-2xl`  | 1.75rem  | 28  | Título de tela (h2)                                |
| `--fonte-3xl`  | 2.25rem  | 36  | Título principal (h1), somente a partir de 768px   |

**16px é o mínimo para campos de formulário** — abaixo disso o iOS aplica zoom automático ao focar.

### 3.3 Pesos e entrelinha

| Token                   | Valor | Uso                        |
| ----------------------- | ----- | -------------------------- |
| `--peso-normal`         | 400   | Corpo                      |
| `--peso-medio`          | 600   | Rótulo, ênfase, botão      |
| `--peso-forte`          | 700   | Título                     |
| `--entrelinha-apertada` | 1.2   | Títulos                    |
| `--entrelinha-base`     | 1.5   | Corpo (mínimo WCAG 1.4.12) |
| `--entrelinha-solta`    | 1.7   | Blocos longos de leitura   |

### 3.4 Regras

- Um `h1` por tela. Hierarquia sem pular níveis (`h1 → h2 → h3`).
- Tamanho de fonte **nunca** define hierarquia sozinho: a marcação semântica é que define.
- Largura máxima de bloco de texto: `65ch`.
- Texto deve suportar ampliação até 200% sem perda de conteúdo ou função (WCAG 1.4.4).
- Proibido texto justificado (`text-align: justify`) — prejudica leitura com dislexia (WCAG 1.4.8).

---

## 4. Espaçamento

Escala de base 4px. Toda margem, preenchimento e distância sai daqui.

| Token     | Valor | Uso típico                                   |
| --------- | ----- | -------------------------------------------- |
| `--esp-1` | 4px   | Distância entre ícone e rótulo               |
| `--esp-2` | 8px   | Interno de elemento compacto                 |
| `--esp-3` | 12px  | Entre campos relacionados                    |
| `--esp-4` | 16px  | Preenchimento padrão, margem lateral da tela |
| `--esp-5` | 24px  | Entre grupos de campos                       |
| `--esp-6` | 32px  | Entre seções                                 |
| `--esp-7` | 48px  | Entre blocos maiores                         |
| `--esp-8` | 64px  | Respiro de topo e base de tela               |

Regra de proximidade: o espaço **dentro** de um grupo é sempre menor que o espaço **entre** grupos.

---

## 5. Breakpoints e layout

Mobile-first: o estilo base vale para 320px e só cresce por `min-width`. **`max-width` como
estratégia primária é proibido** (Princípio VI).

| Token     | Valor  | Alvo                                             |
| --------- | ------ | ------------------------------------------------ |
| — (base)  | 320px  | Celular pequeno. Referência obrigatória de teste |
| `--bp-sm` | 480px  | Celular grande                                   |
| `--bp-md` | 768px  | Tablet, retrato                                  |
| `--bp-lg` | 1024px | Tablet paisagem, notebook                        |
| `--bp-xl` | 1280px | Monitor                                          |

```css
/* Correto: base pequena, ampliar depois */
.cartao {
  padding: var(--esp-4);
}
@media (min-width: 768px) {
  .cartao {
    padding: var(--esp-6);
  }
}
```

### Regras de layout a 320px

- Margem lateral da tela: `--esp-4` (16px) de cada lado → 288px úteis.
- Largura máxima do conteúdo: `--largura-conteudo: 72rem` (1152px), centralizado.
- Uma coluna até `--bp-md`. Grade a partir daí.
- **Zero rolagem horizontal da página.** Conteúdo largo — tabela, bloco de código — rola dentro do
  próprio contêiner com `overflow-x: auto`.
- Tabela com muitas colunas vira lista de cartões abaixo de `--bp-md`.

---

## 6. Componentes

### 6.1 Botões

Alternam de cor no `:hover`, mantendo a cor do texto para preservar o contraste em ambos os estados.

| Variante           | Repouso                                 | Hover / foco    | Texto                        |
| ------------------ | --------------------------------------- | --------------- | ---------------------------- |
| Primário           | fundo `#A85208`                         | fundo `#263822` | branco (5.42:1 → 12.57:1)    |
| Secundário         | borda 2px `#263822`, fundo transparente | fundo `#263822` | `#263822` → branco           |
| Terciário          | texto `#263822`, sem fundo              | fundo `#E3E3E3` | `#263822` (12.57:1 → 9.79:1) |
| Destrutivo         | fundo `#8A1F11`                         | fundo `#000000` | branco (9.19:1 → 21:1)       |
| Sobre fundo escuro | fundo `#FFFFFF`                         | fundo `#C35E0A` | `#000000` (21:1 → 4.93:1)    |

Regras:

- **Alvo de toque mínimo de 44×44px**, sempre, inclusive botões de ícone.
- Todo elemento clicável é `<button>` ou `<a>` — nunca `<div>` com `onClick` (Princípio VII).
- Botão de ícone sem texto visível exige `aria-label`.
- Estado `:disabled` reduz opacidade para 0.6 **e** aplica `aria-disabled`; opacidade sozinha não
  comunica nada a leitor de tela.
- Hover não é o único indicador: `:focus-visible` recebe o mesmo tratamento visual mais o anel de
  foco, porque teclado não tem hover.
- Botão em operação demorada exibe estado de carregamento e fica inerte, para impedir envio duplo
  (FR-047 da spec 001).

### 6.2 Anel de foco

Visível em todo elemento interativo, sem exceção:

```css
:focus-visible {
  outline: 3px solid var(--cor-foco);
  outline-offset: 2px;
}
```

- Sobre fundo claro: `--cor-foco: #000000`.
- Sobre fundo escuro: `--cor-foco: #FFFFFF`.
- **Proibido** `outline: none` sem substituto de contraste igual ou maior.

### 6.3 Formulários

Fundo `#E3E3E3`, texto preto.

| Elemento          | Especificação                                                                              |
| ----------------- | ------------------------------------------------------------------------------------------ |
| Rótulo            | `--fonte-sm`, `--peso-medio`, preto, **sempre visível** — placeholder não substitui rótulo |
| Campo             | fundo `#FFFFFF`, borda 1px `#263822`, raio `--raio-sm`, texto `--fonte-base` (16px)        |
| Campo em foco     | borda 2px `#263822` + anel de foco                                                         |
| Campo inválido    | borda 2px `#8A1F11` + ícone + mensagem em texto; `aria-invalid="true"`                     |
| Mensagem de erro  | `--cor-erro` sobre `#FFFFFF` (9.19:1), ligada ao campo por `aria-describedby`              |
| Campo obrigatório | marcado no rótulo em texto, não apenas por asterisco colorido                              |
| Altura mínima     | 44px                                                                                       |

Erros são anunciados a leitor de tela via região `aria-live="polite"` (FR-046 da spec 001).

### 6.4 Superfícies

| Token            | Valor                          | Uso                    |
| ---------------- | ------------------------------ | ---------------------- |
| `--raio-sm`      | 4px                            | Campo, etiqueta        |
| `--raio-md`      | 8px                            | Cartão, painel         |
| `--borda-fina`   | 1px                            | Separador, campo       |
| `--borda-grossa` | 2px                            | Foco, estado ativo     |
| `--sombra-1`     | `0 1px 2px rgb(0 0 0 / 0.12)`  | Cartão                 |
| `--sombra-2`     | `0 4px 12px rgb(0 0 0 / 0.16)` | Menu suspenso, diálogo |

Sombra é decoração: nunca é o único sinal de agrupamento ou de estado.

### 6.5 Movimento

```css
--transicao-rapida: 120ms ease-out; /* hover, foco */
--transicao-base: 200ms ease-out; /* abrir e fechar */
```

Respeitar preferência do sistema é obrigatório:

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 7. Tokens em CSS

Origem única da verdade. Copiar para `src/styles/tokens.css` e importar uma vez na raiz da aplicação.

```css
:root {
  /* Cores — base */
  --cor-verde-escuro: #263822;
  --cor-preto: #000000;
  --cor-laranja: #c35e0a;
  --cor-oliva: #87852f;
  --cor-cinza-form: #e3e3e3;
  --cor-branco: #ffffff;

  /* Cores — variantes para texto branco */
  --cor-laranja-escuro: #a85208;
  --cor-oliva-escuro: #6e6c26;

  /* Cores — semânticas */
  --cor-erro: #8a1f11;
  --cor-sucesso: #6e6c26;
  --cor-aviso: #c35e0a;
  --cor-info: #263822;

  /* Cores — texto */
  --cor-texto-escuro: #000000;
  --cor-texto-claro: #ffffff;
  --cor-foco: #000000;

  /* Tipografia */
  --fonte-base-familia:
    system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  --fonte-mono: ui-monospace, SFMono-Regular, 'SF Mono', Consolas, 'Liberation Mono', monospace;
  --fonte-xs: 0.75rem;
  --fonte-sm: 0.875rem;
  --fonte-base: 1rem;
  --fonte-lg: 1.125rem;
  --fonte-xl: 1.375rem;
  --fonte-2xl: 1.75rem;
  --fonte-3xl: 2.25rem;
  --peso-normal: 400;
  --peso-medio: 600;
  --peso-forte: 700;
  --entrelinha-apertada: 1.2;
  --entrelinha-base: 1.5;
  --entrelinha-solta: 1.7;

  /* Espaçamento */
  --esp-1: 4px;
  --esp-2: 8px;
  --esp-3: 12px;
  --esp-4: 16px;
  --esp-5: 24px;
  --esp-6: 32px;
  --esp-7: 48px;
  --esp-8: 64px;

  /* Layout */
  --largura-conteudo: 72rem;
  --alvo-toque-min: 44px;

  /* Superfícies */
  --raio-sm: 4px;
  --raio-md: 8px;
  --borda-fina: 1px;
  --borda-grossa: 2px;
  --sombra-1: 0 1px 2px rgb(0 0 0 / 0.12);
  --sombra-2: 0 4px 12px rgb(0 0 0 / 0.16);

  /* Movimento */
  --transicao-rapida: 120ms ease-out;
  --transicao-base: 200ms ease-out;
}

/* Contexto de fundo escuro: inverte texto e anel de foco */
.sobre-escuro {
  color: var(--cor-texto-claro);
  --cor-foco: var(--cor-branco);
}
```

Os `--cor-*`, `--fonte-*`, `--esp-*` e afins acima continuam sendo a **origem única**. A seção 7.1 não
os substitui nem os renomeia: apenas os expõe ao Tailwind.

### 7.1 Camada Tailwind — mapeamento `@theme`

Vai no mesmo `src/styles/tokens.css`, **depois** do bloco `:root` da seção 7.

O bloco começa zerando os namespaces de fábrica. Sem isso, `bg-slate-700`, `text-3xl` do Tailwind e
`p-[13px]` continuariam existindo em paralelo à escala deste documento — dois vocabulários visuais
concorrentes, que é exatamente o que o Princípio VI existe para impedir.

```css
@import 'tailwindcss';

@theme {
  /* 1. Apaga tudo que o Tailwind traz de fábrica */
  --color-*: initial;
  --font-*: initial;
  --text-*: initial;
  --font-weight-*: initial;
  --leading-*: initial;
  --tracking-*: initial;
  --spacing: initial;
  --spacing-*: initial;
  --radius-*: initial;
  --shadow-*: initial;
  --container-*: initial;
  --breakpoint-*: initial;
  --animate-*: initial;

  /* 2. Publica os tokens da seção 7, sem renomear a origem */
  --color-verde-escuro: var(--cor-verde-escuro);
  --color-preto: var(--cor-preto);
  --color-laranja: var(--cor-laranja);
  --color-laranja-escuro: var(--cor-laranja-escuro);
  --color-oliva: var(--cor-oliva);
  --color-oliva-escuro: var(--cor-oliva-escuro);
  --color-cinza-form: var(--cor-cinza-form);
  --color-branco: var(--cor-branco);
  --color-erro: var(--cor-erro);
  --color-sucesso: var(--cor-sucesso);
  --color-aviso: var(--cor-aviso);
  --color-info: var(--cor-info);
  --color-texto-escuro: var(--cor-texto-escuro);
  --color-texto-claro: var(--cor-texto-claro);
  --color-foco: var(--cor-foco);

  --font-base: var(--fonte-base-familia);
  --font-mono: var(--fonte-mono);

  --text-xs: var(--fonte-xs);
  --text-sm: var(--fonte-sm);
  --text-base: var(--fonte-base);
  --text-lg: var(--fonte-lg);
  --text-xl: var(--fonte-xl);
  --text-2xl: var(--fonte-2xl);
  --text-3xl: var(--fonte-3xl);

  --font-weight-normal: var(--peso-normal);
  --font-weight-medio: var(--peso-medio);
  --font-weight-forte: var(--peso-forte);

  --leading-apertada: var(--entrelinha-apertada);
  --leading-base: var(--entrelinha-base);
  --leading-solta: var(--entrelinha-solta);

  --spacing-1: var(--esp-1);
  --spacing-2: var(--esp-2);
  --spacing-3: var(--esp-3);
  --spacing-4: var(--esp-4);
  --spacing-5: var(--esp-5);
  --spacing-6: var(--esp-6);
  --spacing-7: var(--esp-7);
  --spacing-8: var(--esp-8);
  --spacing-alvo-toque: var(--alvo-toque-min);

  --radius-sm: var(--raio-sm);
  --radius-md: var(--raio-md);
  --shadow-1: var(--sombra-1);
  --shadow-2: var(--sombra-2);
  --container-conteudo: var(--largura-conteudo);

  /* 3. Breakpoints: literais obrigatórios — @media não aceita var() */
  --breakpoint-sm: 480px;
  --breakpoint-md: 768px;
  --breakpoint-lg: 1024px;
  --breakpoint-xl: 1280px;
}
```

Consequências práticas:

- `bg-verde-escuro`, `text-2xl`, `p-4`, `min-h-alvo-toque`, `max-w-conteudo` e `md:` passam a existir
- `bg-slate-700`, `text-4xl`, `p-9`, `rounded-full` **deixam de existir** — não há token por trás
- as consultas de mídia literais da seção 7 saem do CSS escrito à mão e viram os prefixos `sm:`…`xl:`
- `--transicao-rapida`, `--transicao-base`, `--borda-fina` e `--borda-grossa` **não** entram no
  `@theme`: continuam usados como `var()` no CSS de componente, porque o Tailwind não tem namespace
  correspondente

### 7.2 O que o `@theme` garante — e o que não garante

Distinção que precisa ficar registrada, porque o contrário já foi afirmado em artefatos de plano:

| Escapatória                    | O que acontece                                      | O que barra                                                       |
| ------------------------------ | --------------------------------------------------- | ----------------------------------------------------------------- |
| `bg-slate-700`                 | classe **não gera CSS**; o elemento fica sem estilo | falha visível em review e no teste visual, **não** quebra o build |
| `bg-[#C35E0A]`, `p-[13px]`     | valor arbitrário **funciona**                       | regra de lint proibindo a sintaxe `-[…]` em `className`           |
| `style={{ color: '#C35E0A' }}` | funciona                                            | regra de lint proibindo `style` literal em JSX                    |
| `@apply bg-slate-700`          | **erro de compilação do CSS**                       | o próprio Tailwind                                                |

Ou seja: zerar os namespaces elimina o vocabulário concorrente, mas **não** é, sozinho, um portão de
CI. O portão exige as duas regras de lint da tabela acima. Sem elas a imposição continua sendo humana,
como era antes do Tailwind.

---

## 8. Checklist de revisão visual

Todo PR que toca a interface passa por:

- [ ] Nenhuma cor, tamanho de fonte ou espaçamento literal fora dos tokens
- [ ] Nenhum valor arbitrário do Tailwind (`bg-[#…]`, `p-[13px]`) nem `style` literal em JSX (7.2)
- [ ] Combinação de fundo e texto consta na matriz da seção 2.4
- [ ] Tela testada a 320px, sem rolagem horizontal
- [ ] Todo alvo de toque com no mínimo 44×44px
- [ ] Anel de foco visível em todos os elementos interativos
- [ ] Navegação completa por teclado, com ordem de foco igual à ordem visual
- [ ] `aria-label` em links e controles sem texto visível; `alt` em toda imagem
- [ ] Nenhum significado transmitido apenas por cor
- [ ] `prefers-reduced-motion` respeitado
- [ ] Layout íntegro com fonte ampliada a 200%

---

## 9. Governança

Este documento segue o mesmo versionamento semântico da constituição:

- **MAJOR** — remoção de token ou mudança que quebra telas existentes.
- **MINOR** — novo token, nova variante, novo componente.
- **PATCH** — correção de texto, esclarecimento, ajuste de documentação.

Alterar cor obriga a **recalcular e atualizar a matriz de contraste da seção 2.4** no mesmo PR.
Contraste declarado sem cálculo não é aceito.

### Histórico

**v1.1.0 — 2026-08-11.** Reescrita do princípio 1.4: "zero dependência visual" passa a ser "zero
dependência visual **de runtime**", admitindo ferramenta de build que emite CSS estático. Acrescentadas
as seções 7.1 (mapeamento `@theme` do Tailwind 4 sobre os tokens da seção 7) e 7.2 (limites reais da
imposição). Um item novo na checklist da seção 8.

MINOR e não MAJOR: **nenhum token foi removido nem renomeado**. Os `--cor-*`, `--fonte-*` e `--esp-*`
da seção 7 continuam sendo a origem; o `@theme` apenas os publica sob os namespaces que o Tailwind
entende. Nenhuma tela existente muda, porque nenhuma existe ainda.
