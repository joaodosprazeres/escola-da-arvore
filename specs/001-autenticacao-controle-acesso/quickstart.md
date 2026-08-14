# Quickstart — Validação da feature 001

**Feature**: Autenticação e Controle de Acesso por Perfil | **Fase**: 1

Como levantar o ambiente e **provar** que a feature funciona. Não contém código de implementação:
contratos estão em [`contracts/`](./contracts/), o modelo em [`data-model.md`](./data-model.md) e as
decisões em [`research.md`](./research.md).

---

## 1. Pré-requisitos

| Item | Versão | Observação |
|---|---|---|
| Node.js | ≥ 20.19 | exigido pelo Vite 7 |
| Supabase CLI | ≥ 2.x | instância local com Postgres e Edge Runtime |
| Docker | em execução | usado pelo `supabase start` |
| Navegador | Chromium ou Firefox recente | verificação manual a 320px |

Nenhum projeto Supabase remoto é necessário para validar. Todo teste roda **local e efêmero**
(R-11); jamais aponte a suíte para o projeto de produção.

---

## 2. Preparar o ambiente

```bash
npm install
cp .env.example .env            # preencher com os valores impressos no passo seguinte
supabase start                  # sobe Postgres + Auth + Edge Runtime; imprime URL e anon key
supabase db reset               # aplica as 10 migrations e roda supabase/seed.sql
```

`supabase db reset` executa as migrações na ordem de `data-model.md` §6. O seed cria **um**
administrador com `first_access = true`; a senha vem de variável de ambiente do CLI, nunca de um
literal versionado.

`.env` (front-end) contém apenas `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` — públicas por
natureza e inócuas porque toda tabela tem RLS. Segredos das Edge Functions
(`SUPABASE_SERVICE_ROLE_KEY`, `LOGIN_IP_PEPPER`, `ALLOWED_ORIGIN`, `APP_BASE_URL`) ficam em
`supabase/functions/.env`, também fora do versionamento.

```bash
supabase functions serve        # auth-login, admin-users, password-recovery
npm run dev                     # aplicação em http://localhost:5173
```

**Falha esperada e desejável**: `npm run build` sem `VITE_SUPABASE_URL` deve **quebrar o build** com
mensagem clara, nunca gerar `dist/` quebrado em runtime (seção Deploy da constituição).

---

## 3. Suítes automatizadas

```bash
npm run typecheck      # tsc --noEmit — zero erro, zero supressão nova (Princípio I)
npm run lint
npm run test:unit      # lib/ e services/ puros
npm run test:integration  # componentes reais contra o fake in-memory das portas
npm run test:rls       # requisições diretas ao Supabase local, por perfil
npm run test:a11y      # axe-core sobre as telas da feature
npm run build          # dist/ servível estaticamente, com 404.html gerado
```

Portão de merge: todas verdes, nenhum teste `skip`/`only` (Princípio VIII).

### 3.1 O que cada suíte prova

| Suíte | Prova | Requisitos |
|---|---|---|
| `test:unit` | força de senha, visão padrão por alcance, validação de `destino` (redirect aberto), matriz de permissões | FR-011, FR-028, FR-009, FR-006 |
| `test:integration` | os 6 fluxos do §4 contra o fake, incluindo as 10 invariantes de [`contracts/ports.ts`](./contracts/ports.ts) | US1, US2, US4, US5 |

O fake entra por **injeção explícita**, não por module mocking: cada teste renderiza dentro de
`<PortasProvider portas={fakes}>`, monta o seu próprio store por fábrica e, por isso, não vaza estado
para o teste seguinte (R-03). A rota entra pelo mesmo caminho: `<MemoryRouter initialEntries={[…]}>`,
sem tocar no `history` real e sem estado compartilhado entre arquivos (R-04).

| `test:rls` | as 10 linhas da tabela de contrato em [`contracts/rls-e-rotas.md`](./contracts/rls-e-rotas.md) §A.3 | US3, SC-003 |
| `test:a11y` | contraste, rótulo acessível, `alt`, foco, 320px | FR-043…FR-046, SC-006, SC-007 |

---

## 4. Roteiros manuais de aceitação

Cada roteiro é independente e corresponde a uma User Story. Executar na ordem apresentada na primeira
validação completa (o roteiro A depende de contas criadas no B, exceto pelo administrador do seed).

### A. Entrar e chegar ao painel do perfil (US1)

1. Abrir `/painel/usuarios` sem sessão → cai em `/entrar?destino=…`.
2. Entrar com o administrador do seed → como é primeiro acesso, cai em `/trocar-senha`.
3. Tentar navegar a `/usuarios` antes de trocar → volta para `/trocar-senha` (FR-027).
4. Definir senha de 7 caracteres → recusada, **com a lista do que falta** (FR-028).
5. Definir senha válida → segue para `/painel/administrador`, e o `destino` original só é honrado se
   o perfil permitir.
5b. Abrir `/entrar?destino=https://example.com` e concluir a entrada → **fica na aplicação**, no
   painel da visão ativa; o destino externo é descartado (proteção contra redirecionamento aberto,
   R-04).
6. Sair pelo menu → qualquer URL interna volta a `/entrar` (FR-005).
7. Entrar com senha errada e depois com e-mail inexistente → **mesma mensagem, mesmo tempo**
   perceptível (FR-002, SC-004).
8. Errar a senha 5 vezes → 6ª tentativa recusada com o prazo informado, **mesmo com a senha correta**
   (FR-004).

### B. Cadastrar usuário e definir perfis (US2)

1. Como administrador, `/usuarios/novo`: criar com nome, e-mail e perfil `secretaria` → aparece na
   lista como ativo, em primeiro acesso.
2. Criar com perfil `professor` sem escolher o registro de professor → bloqueado, com explicação do
   vínculo obrigatório (FR-018).
3. Repetir um e-mail já usado, trocando a caixa (`Maria@…` vs `maria@…`) → recusado (FR-019).
4. Criar usuário com `coordenacao` + `professor` → aceito com vínculo, e esse usuário passa a ver o
   seletor de visão.
5. Entrar como o novo usuário com a senha temporária recebida → troca obrigatória, depois painel.
6. Entrar como secretaria → `/usuarios` não aparece no menu e o acesso direto cai em
   `/acesso-negado` (FR-020).

### C. Restrição na camada de dados (US3)

Cobertura automatizada em `npm run test:rls`. Verificação manual complementar, sem passar pela
interface:

```bash
# token de um professor, obtido pelo fluxo de entrada local
curl -s "$SUPABASE_URL/rest/v1/profiles?select=*" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TOKEN_PROFESSOR"
# esperado: array com exatamente 1 objeto (a própria linha)

curl -s -X PATCH "$SUPABASE_URL/rest/v1/audit_log?id=eq.1" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TOKEN_ADMIN" \
  -H "Content-Type: application/json" -d '{"action":"usuario_criado"}'
# esperado: erro — o log é somente leitura para todos, inclusive administrador
```

Com o usuário `coordenacao+professor` e a visão ativa em `professor`, repetir uma consulta de
coordenação: deve retornar tudo que a coordenação alcança (FR-013, US3-8).

### D. Recuperar senha (US4)

1. `/esqueci-senha` com e-mail cadastrado → confirmação genérica; a mensagem chega ao Inbucket local
   (`http://localhost:54324`).
2. Repetir com e-mail inexistente → **mesma** confirmação, nenhuma mensagem enviada.
3. Pedir duas vezes seguidas → só o link mais recente funciona (FR-031).
4. Concluir a redefinição → as demais sessões daquele usuário param de valer (FR-032). Verificar com
   uma segunda aba autenticada.
5. Reabrir o link já usado → recusado, com oferta de novo pedido.

### E. Bloquear, desbloquear, desativar (US5)

1. Bloquear um usuário com sessão aberta → na próxima ação **dele**, a sessão cai e ele não entra de
   novo (SC-009).
2. Desbloquear → volta a entrar com a mesma senha.
3. Desativar → continua na lista com o estado, e o histórico dele permanece íntegro (FR-022).
4. Com apenas um administrador ativo, tentar bloquear, desativar ou rebaixar a si mesmo → recusado
   com explicação (FR-023).

### F. Histórico de auditoria (US6)

1. Após executar B e E, abrir `/auditoria` → uma linha por ação, com autor, afetado, tipo, valor
   anterior, valor novo e data/hora.
2. Filtrar por usuário afetado e por período → só os registros correspondentes.
3. Nenhum registro contém senha, hash ou token (FR-033).
4. Entrar como coordenação e acessar `/auditoria` → negado.

---

## 5. Verificação manual obrigatória antes de marcar como pronta

Exigida pela constituição (Fluxo de Desenvolvimento) e por SC-006/SC-007:

- [ ] Cada tela da feature aberta a **320px**, sem rolagem horizontal da página.
- [ ] Cada tela percorrida **apenas por teclado**, com foco visível e ordem igual à ordem visual.
- [ ] Todo alvo de toque com no mínimo 44×44px, inclusive botões de ícone.
- [ ] Nenhum estado comunicado apenas por cor — sempre com ícone ou texto.
- [ ] Todo item de menu abre em nova aba com ctrl/cmd-clique e com clique do meio, e mostra a URL na
      barra de status ao passar o cursor (âncora real; R-04).
- [ ] Após cada troca de rota, o foco está no `<h1>` da página nova — não no `<body>`.
- [ ] Sistema em "reduzir movimento": animações do Framer Motion desaparecem (`reducedMotion="user"`).
- [ ] Fonte ampliada a 200%: layout íntegro, nada cortado.
- [ ] Nenhuma cor, tamanho de fonte ou espaçamento fora dos tokens do design system.
- [ ] Interface inteiramente em português do Brasil (FR-048).

---

## 6. Resultado esperado

Ao final, com as seis User Stories validadas:

| Critério | Como se verifica |
|---|---|
| SC-003 — 100% das tentativas por perfil não autorizado negadas | `npm run test:rls` verde nas 10 linhas |
| SC-004 — respostas indistinguíveis | teste de contrato de tempo do `auth-login` |
| SC-005 — 100% das ações administrativas auditadas e imutáveis | roteiro F |
| SC-006 / SC-007 — 320px, teclado, axe sem falhas | `npm run test:a11y` + checklist §5 |
| SC-009 — bloqueio efetivo na solicitação seguinte | roteiro E, passo 1 |
| SC-010 / SC-011 — painel direto e troca de visão em ≤ 2 toques | roteiros A e B |
