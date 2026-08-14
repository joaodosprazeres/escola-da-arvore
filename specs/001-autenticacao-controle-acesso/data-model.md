# Data Model: Autenticação e Controle de Acesso por Perfil

**Feature**: `001-autenticacao-controle-acesso` | **Data**: 2026-08-11 | **Fase**: 1

Deriva das *Key Entities* da `spec.md`. Duas representações, ligadas por adaptador:

- **Domínio** (`src/types.ts`): tipos que a UI e os casos de uso enxergam. Não conhecem Supabase.
- **Persistência** (Postgres/Supabase): tabelas, enums e políticas. Só `src/services/supabase/` traduz
  entre as duas (Princípio IV).

Convenção: identificadores de banco em `snake_case` e inglês (padrão do PostgREST); tipos de domínio
em português, como o resto do produto.

---

## 1. Enums

```sql
create type public.perfil as enum ('administrador','secretaria','coordenacao','professor');
create type public.situacao_usuario as enum ('ativo','bloqueado','desativado');
create type public.acao_auditoria as enum (
  'usuario_criado','perfil_atribuido','perfil_removido','usuario_bloqueado',
  'usuario_desbloqueado','usuario_desativado','senha_redefinida_admin','visao_ativa_alterada'
);
```

Ordem de alcance dos perfis (Assumptions da spec), usada para escolher a visão inicial:
`administrador (4) > secretaria (3) > coordenacao (2) > professor (1)`.

---

## 2. Entidades

### 2.1 `profiles` — Usuário

Espelha `auth.users` 1:1. Dados de identidade ficam no GoTrue; dados de domínio, aqui.

| Coluna | Tipo | Regras |
|---|---|---|
| `id` | `uuid` PK | FK → `auth.users(id)` `on delete restrict` — impede exclusão definitiva (FR-022) |
| `full_name` | `text not null` | 2–120 caracteres, não vazio após `trim` |
| `email` | `citext not null unique` | espelho de `auth.users.email`; unicidade **case-insensitive** (FR-019) |
| `status` | `situacao_usuario not null default 'ativo'` | criado ativo (US2 cenário 1) |
| `first_access` | `boolean not null default true` | vira `false` só ao concluir a troca obrigatória (FR-026/FR-027) |
| `active_view` | `perfil` | nulo até a primeira escolha; trigger preenche com `visao_padrao()` (FR-011) |
| `teacher_id` | `uuid unique` | FK → `teachers(id)`; obrigatório sse possui perfil `professor` (FR-018) |
| `last_sign_in_at` | `timestamptz` | escrito por `auth-login` no sucesso |
| `created_at` / `created_by` | `timestamptz not null default now()` / `uuid` | `created_by` FK → `profiles(id)`; nulo só para o administrador semeado |
| `updated_at` | `timestamptz not null default now()` | trigger `set_updated_at` |

**Invariantes** (todas em *trigger* `constraint trigger`, porque dependem de `user_roles`):
- **INV-1** — todo perfil tem ≥ 1 papel em `user_roles` (FR-008).
- **INV-2** — `professor ∈ perfis ⇒ teacher_id is not null` (FR-018). Sem o vínculo, a operação falha
  e a Edge Function traduz para a mensagem da US2 cenário 2.
- **INV-3** — `active_view` ∈ perfis atribuídos (FR-010).
- **INV-4** — existe ≥ 1 usuário `status='ativo'` com o papel `administrador` (FR-023). Verificada ao
  alterar `status` e ao remover papel; recusa bloquear, desativar ou rebaixar o último administrador.

**Transições de situação**:

```
        criar (admin)                bloquear                desbloquear
   ∅ ─────────────────▶ ativo ◀──────────────────────────────────┐
                          │  ──────────────▶ bloqueado ──────────┘
                          │ desativar              │ desativar
                          └────────────▶ desativado ◀─────────────
```

`desativado` é terminal nesta feature. Nenhuma transição apaga linha (FR-022). Toda transição grava
`audit_log` e — pela `sessao_valida()` + `usuario_ativo()` das políticas — derruba o acesso da sessão
aberta na solicitação seguinte (FR-038, SC-009, US5 cenário 2).

### 2.2 `user_roles` — Atribuição de Perfil

| Coluna | Tipo | Regras |
|---|---|---|
| `user_id` | `uuid not null` | FK → `profiles(id)` `on delete cascade` |
| `role` | `perfil not null` | |
| `granted_by` | `uuid not null` | FK → `profiles(id)`; sempre um administrador |
| `granted_at` | `timestamptz not null default now()` | |

`primary key (user_id, role)` — impede papel duplicado; 1 a 4 linhas por usuário. Índice
`idx_user_roles_user` em `(user_id)` para as funções de RLS.

**Permissões efetivas = união das linhas** (FR-009). Não há hierarquia de herança: um coordenador que
também leciona tem duas linhas e alcança a união dos dois conjuntos (US3 cenário 8).

*Trigger* `after delete`: se o papel removido era `active_view`, reescreve `active_view` com
`visao_padrao(perfis restantes)`; se não restou papel, viola INV-1 e a operação é recusada — a
remoção do último papel só ocorre via desativação do usuário (FR-016).

### 2.3 `teachers` — Registro de Professor (dependência mínima)

Fora do escopo desta feature (cadastros base). Criada aqui apenas com o mínimo para exercitar o
vínculo obrigatório:

| Coluna | Tipo |
|---|---|
| `id` | `uuid pk default gen_random_uuid()` |
| `full_name` | `text not null` |
| `active` | `boolean not null default true` |

`class_teachers (teacher_id, class_id)` fica como **stub documentado**: `turmas_do_professor()` já
existe e devolve conjunto vazio enquanto a feature de turmas não chega — é o que produz o "painel
vazio com orientação para procurar a secretaria" do edge case, em vez de erro.

### 2.4 `audit_log` — Registro de Auditoria

| Coluna | Tipo | Regras |
|---|---|---|
| `id` | `bigint` `generated always as identity` PK | ordenação natural por inserção |
| `actor_id` | `uuid not null` | FK → `profiles(id)`, quem executou |
| `target_user_id` | `uuid not null` | FK → `profiles(id)`, quem sofreu |
| `action` | `acao_auditoria not null` | |
| `old_value` | `jsonb` | estado anterior do campo afetado |
| `new_value` | `jsonb` | estado novo |
| `created_at` | `timestamptz not null default now()` | hora do **servidor** (FR-007) |

**Imutabilidade** (FR-041) por três camadas somadas:
1. Nenhuma política de `update` ou `delete` — RLS nega por omissão.
2. `revoke update, delete on public.audit_log from authenticated, anon;`
3. *Trigger* `before update or delete` que levanta exceção — cobre inclusive conexões privilegiadas.

`old_value`/`new_value` **nunca** contêm senha, hash ou token (FR-033). Para
`senha_redefinida_admin`, ambos são `null`; o fato do evento é o registro.

Índices: `(target_user_id, created_at desc)` e `(created_at desc)` para os filtros da FR-042.

### 2.5 `login_attempts` — Tentativa de Acesso

| Coluna | Tipo | Regras |
|---|---|---|
| `id` | `bigint identity` PK | |
| `email_normalized` | `citext not null` | `lower(trim(email))`; gravado mesmo se o e-mail não existe |
| `ip_hash` | `text not null` | SHA-256 de IP + *pepper* de ambiente — contenção por origem sem guardar IP (minimização) |
| `succeeded` | `boolean not null` | |
| `attempted_at` | `timestamptz not null default now()` | |

Índices parciais em `(email_normalized, attempted_at desc) where not succeeded` e
`(ip_hash, attempted_at desc) where not succeeded`.

Regra: 5 falhas em 15 min por conta **ou** por origem acionam a janela de espera (FR-004). Sucesso
apaga as falhas daquela conta. Tabela **inacessível** a `anon` e `authenticated` — só a service role
da Edge Function escreve e lê. Expurgo diário de linhas com mais de 24h.

### 2.6 `password_reset_requests` — Pedido de Redefinição

O token vive no GoTrue; esta tabela guarda o ciclo de vida que a FR-031 exige.

| Coluna | Tipo | Regras |
|---|---|---|
| `id` | `uuid pk default gen_random_uuid()` | |
| `user_id` | `uuid not null` | FK → `profiles(id)` |
| `requested_at` | `timestamptz not null default now()` | |
| `expires_at` | `timestamptz not null` | `requested_at + interval '1 hour'` (Assumptions) |
| `consumed_at` | `timestamptz` | preenchido ao concluir a redefinição |
| `superseded_at` | `timestamptz` | preenchido quando um pedido mais novo é emitido |

Índice único parcial `(user_id) where consumed_at is null and superseded_at is null` — garante
**um único pedido vivo** por usuário; o mais recente invalida os anteriores (FR-031, edge case
"vários pedidos seguidos"). Igualmente inacessível ao cliente.

### 2.7 Sessão

**Não é tabela do domínio.** Vive em `auth.sessions` (GoTrue) e é lida por `public.sessao_valida()`:

| Fonte | Uso |
|---|---|
| `auth.sessions.created_at` | limite absoluto de 12h |
| `auth.sessions.refreshed_at` | inatividade de 30 min |
| `auth.jwt() ->> 'session_id'` | localiza a sessão da requisição corrente |

Encerramento: saída explícita, inatividade, timebox, bloqueio, desativação (via `usuario_ativo()`) ou
redefinição de senha (GoTrue revoga os demais refresh tokens — FR-032).

---

## 3. Relações

```
auth.users 1───1 profiles 1───N user_roles
                    │
                    ├──0..1 teachers            (obrigatório se role=professor)
                    ├──N    audit_log (actor)
                    ├──N    audit_log (target)
                    └──N    password_reset_requests

login_attempts ─── sem FK (registra e-mails inexistentes de propósito)
```

---

## 4. Matriz de acesso (contrato das políticas RLS)

`L` leitura · `E` escrita · `—` negado. Todas as linhas pressupõem
`usuario_ativo() AND sessao_valida()`; falhando isso, tudo vira `—` (FR-038).

| Tabela | Administrador | Secretaria | Coordenação | Professor | Anônimo |
|---|---|---|---|---|---|
| `profiles` | L+E todos | L todos, E nenhum | L próprio | L próprio | — |
| `user_roles` | L+E todos | L todos | L próprio | L próprio | — |
| `teachers` | L+E | L | L | L próprio | — |
| `audit_log` | L (insert só via Edge Function) | — | — | — | — |
| `login_attempts` | — | — | — | — | — |
| `password_reset_requests` | — | — | — | — | — |
| `profiles.active_view` (própria linha) | E | E | E | E | — |

Observações que fecham cenários da spec:
- Professor lendo `profiles` recebe **apenas a própria linha** (US3 cenário 1).
- Secretaria **não** escreve em `profiles` nem em `user_roles`, por interface ou requisição direta
  (US3 cenário 3, FR-020).
- Coordenação lê alunos e turmas de toda a escola quando essas tabelas existirem, e **nunca**
  `audit_log` (US3 cenário 4, FR-037).
- `active_view` é a única coluna que o próprio usuário altera, com `WITH CHECK` restringindo o valor
  aos seus papéis (FR-012) — e nenhuma política a consulta (FR-013).

---

## 5. Tipos de domínio (`src/types.ts`)

```ts
export type Perfil = 'administrador' | 'secretaria' | 'coordenacao' | 'professor';
export type SituacaoUsuario = 'ativo' | 'bloqueado' | 'desativado';

export interface UsuarioSessao {
  readonly id: string;
  readonly nome: string;
  readonly email: string;
  readonly perfis: readonly Perfil[];   // permissões efetivas = união
  readonly visaoAtiva: Perfil;          // só painel e menu
  readonly primeiroAcesso: boolean;
  readonly situacao: SituacaoUsuario;
}

export interface Usuario extends UsuarioSessao {
  readonly professorId: string | null;
  readonly ultimoAcessoEm: string | null;  // ISO 8601, hora do servidor
  readonly criadoEm: string;
}

export interface RegistroDeAuditoria {
  readonly id: string;
  readonly autor: { readonly id: string; readonly nome: string };
  readonly afetado: { readonly id: string; readonly nome: string };
  readonly acao: AcaoDeAuditoria;
  readonly valorAnterior: string | null;
  readonly valorNovo: string | null;
  readonly ocorridoEm: string;
}

export type EstadoDaSessao =
  | { readonly status: 'carregando' }
  | { readonly status: 'anonimo' }
  | { readonly status: 'autenticado'; readonly usuario: UsuarioSessao };
```

Notas de tipagem (Princípio I): sem `any`; erros de porta são união discriminada
(`ResultadoDeEntrada`, em `contracts/ports.ts`), nunca `throw` de string; tudo `readonly` porque o
snapshot do `sessionStore` precisa ser imutável para o `useSyncExternalStore` (R-03).

---

## 6. Ordem de migração

Arquivos criados por `supabase migration new <nome>`, que prefixa com carimbo de tempo
(`20260811143022_enums.sql`) e ordena lexicograficamente. A numeração abaixo é a **ordem lógica de
dependência**, não o nome do arquivo:

| # | Migração | Conteúdo |
|---|---|---|
| 1 | `enums` | enums de perfil, situação e ação; extensão `citext` |
| 2 | `teachers` | dependência mínima do vínculo obrigatório |
| 3 | `profiles` | tabela, `updated_at`, gatilho de espelho de `auth.users` |
| 4 | `user_roles` | tabela, índices, trigger de reajuste de `active_view` |
| 5 | `funcoes_rls` | `perfis_do_usuario`, `tem_perfil`, `eh_administrador`, `usuario_ativo`, `sessao_valida`, `pode_operar`, `turmas_do_professor`, `visao_padrao` |
| 6 | `invariantes` | INV-1 a INV-4 como *constraint triggers* |
| 7 | `audit_log` | tabela, índices, imutabilidade tripla |
| 8 | `login_attempts` | sem `grant` ao cliente |
| 9 | `password_reset_requests` | sem `grant` ao cliente; índice único parcial do pedido vivo |
| 10 | `politicas_rls` | `enable row level security` em **todas** as tabelas e as políticas da §4 |

`enable row level security` sem política nenhuma = tudo negado: a migração 10 é o único momento em
que a porta abre, e abre por perfil.

### 6.1 Administrador inicial — `supabase/seed.sql`, não migração

O seed **não é migração**. `supabase/seed.sql` roda automaticamente a cada `supabase db reset` e
existe só para dev e teste: cria o administrador de desenvolvimento e os poucos registros de
`teachers` que os roteiros do quickstart exercitam.

Em produção, o primeiro administrador é criado por **execução única** de script com a service role
(mesma rotina da Edge Function `admin-users`), fora do repositório. Migração não serve: teria que
carregar credencial no momento do `db push`, e ficaria replicada em todo ambiente que aplicasse a
cadeia.

### 6.2 Regras de operação

- **Nunca editar migração já aplicada.** O CLI registra checksum em `supabase_migrations`; alterar o
  arquivo quebra o `db push`. Correção é sempre migração nova para frente.
- `supabase db reset` é o comando do dia a dia: dropa, replica as 10 migrações do zero e roda o seed.
  É a única forma de provar que a cadeia funciona em banco vazio — que é o cenário do deploy.
- Mudança feita pelo Studio local vira arquivo com `supabase db diff -f <nome>`; nada de schema vive
  só no banco.
- Tipos do Postgres são **gerados**, não escritos à mão:
  `supabase gen types typescript --local > src/services/supabase/database.types.ts`. Roda no CI e
  falha se houver diff — impede schema e TypeScript divergirem em silêncio (Princípio I). Esses tipos
  ficam confinados a `src/services/supabase/`; o adaptador traduz para os tipos de domínio da §5
  (Princípio IV).
