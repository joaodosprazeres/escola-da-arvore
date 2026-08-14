# Contrato — Políticas RLS e Rotas da Interface

**Feature**: `001-autenticacao-controle-acesso` | **Fase**: 1

Dois contratos que precisam concordar entre si: o que o **banco** libera (autoridade) e o que a
**interface** oferece (conveniência). A UI nunca pode mostrar o que o banco negaria, e o banco nunca
pode confiar no que a UI escondeu.

---

## Parte A — Políticas RLS

### A.1 Funções auxiliares

Todas `security definer`, `stable`, `set search_path = public, auth`, com `execute` revogado de
`anon` e concedido a `authenticated`.

| Função | Retorno | Definição resumida |
|---|---|---|
| `perfis_do_usuario()` | `perfil[]` | `array_agg(role)` de `user_roles where user_id = auth.uid()` |
| `tem_perfil(p perfil)` | `boolean` | `p = any(perfis_do_usuario())` |
| `eh_administrador()` | `boolean` | `tem_perfil('administrador')` |
| `usuario_ativo()` | `boolean` | `exists(select 1 from profiles where id = auth.uid() and status = 'ativo')` |
| `sessao_valida()` | `boolean` | por `auth.jwt()->>'session_id'`: `now() - refreshed_at < 30 min AND now() - created_at < 12 h` |
| `pode_operar()` | `boolean` | `auth.uid() is not null AND usuario_ativo() AND sessao_valida()` |
| `visao_padrao(ps perfil[])` | `perfil` | maior alcance: administrador > secretaria > coordenacao > professor |
| `turmas_do_professor()` | `uuid[]` | turmas do `profiles.teacher_id`; vazio enquanto a feature de turmas não existir |

`pode_operar()` é o prefixo obrigatório de **toda** política. Ele entrega, de uma vez, FR-038
(credencial de bloqueado/desativado negada), SC-009 (efeito na solicitação seguinte) e a expiração
decidida pelo servidor (FR-007).

### A.2 Políticas por tabela

`alter table … enable row level security` em todas. Sem política = negado.

#### `profiles`

```sql
-- leitura
create policy profiles_leitura on public.profiles for select to authenticated
using (
  pode_operar() and (
    id = auth.uid()                                    -- todos leem a si mesmos
    or eh_administrador()
    or tem_perfil('secretaria')                        -- lista operacional, sem escrita
  )
);

-- escrita administrativa: nenhuma política de insert/update/delete para o cliente.
-- Criação e mudança de situação passam por admin-users (service role).

-- única escrita do próprio usuário: a visão ativa (FR-012)
create policy profiles_visao_ativa on public.profiles for update to authenticated
using (pode_operar() and id = auth.uid())
with check (
  id = auth.uid()
  and active_view = any(perfis_do_usuario())           -- só entre os perfis que possui
);
```

A coluna alvo é restringida por `revoke update on public.profiles from authenticated;` seguido de
`grant update (active_view) on public.profiles to authenticated;` — sem isso a política de update
liberaria `status` e `full_name` da própria linha.

**Cenários fechados**: US3-1 (professor lê só a própria linha), US3-3 (secretaria lê e não escreve),
FR-013 (nenhuma política consulta `active_view`).

#### `user_roles`

```sql
create policy user_roles_leitura on public.user_roles for select to authenticated
using (pode_operar() and (user_id = auth.uid() or eh_administrador() or tem_perfil('secretaria')));
```

Sem `insert`, `update` ou `delete` para o cliente: atribuir perfil é exclusividade do administrador,
via `admin-users` (FR-020). Requisição direta da Secretaria falha na ausência de política.

#### `teachers`

```sql
create policy teachers_leitura on public.teachers for select to authenticated
using (
  pode_operar() and (
    eh_administrador() or tem_perfil('secretaria') or tem_perfil('coordenacao')
    or id = (select teacher_id from profiles where id = auth.uid())
  )
);
```

#### Política-modelo para `alunos` e `turmas` (T086 — registrada para herdar, não implementada aqui)

US3-2 e US3-4 (metade positiva) falam de dados de alunos e turmas, que **não existem** em
`data-model.md` desta feature — a tabela em si pertence a quem primeiro precisar dela. O que esta
feature entrega é o contrato que essa tabela futura deve cumprir, apoiado em `turmas_do_professor()`
(hoje stub, migração 5) e na leitura ampla já provada para `teachers`:

```sql
-- Modelo — adaptar ao nome real da tabela quando ela nascer.
create policy <tabela>_leitura on public.<tabela> for select to authenticated
using (
  pode_operar() and (
    eh_administrador()
    or tem_perfil('secretaria')
    or tem_perfil('coordenacao')                          -- toda a escola, nos dois segmentos (US3-4)
    or turma_id = any (turmas_do_professor())              -- só as turmas do vínculo (US3-2)
  )
);
```

Duas obrigações herdadas, não opcionais:

1. **Nenhuma política nova consulta `active_view`.** A união de perfis decide o alcance — o mesmo
   motivo pelo qual `uniao-de-perfis.test.ts` (T080) prova que Coordenação+Professor com a visão de
   Professor ativa continua alcançando o que a Coordenação alcança (FR-013).
2. **`turmas_do_professor()` sai do estado de stub** só quando `class_teachers` existir; até lá, todo
   professor recebe conjunto vazio e a política acima nega por ausência de correspondência, nunca por
   erro — o mesmo comportamento que sustenta o painel vazio do Professor (T083,
   `tests/rls/turmas-do-professor.test.ts`).

A feature que criar `alunos`/`turmas` referencia este bloco em vez de redesenhar o alcance por
perfil do zero.

#### `audit_log`

```sql
create policy audit_leitura on public.audit_log for select to authenticated
using (pode_operar() and eh_administrador());
```

Mais, em migração:

```sql
revoke insert, update, delete on public.audit_log from authenticated, anon;
create trigger audit_imutavel before update or delete on public.audit_log
  for each row execute function public.recusar_alteracao();
```

Três camadas somadas (ausência de política + `revoke` + trigger) fecham FR-041 e US3-5 mesmo contra
conexão privilegiada.

#### `login_attempts` e `password_reset_requests`

Nenhuma política, nenhum `grant`: inacessíveis a `anon` e a `authenticated`. Só a service role das
Edge Functions as toca.

### A.3 Testes de contrato obrigatórios

Rodam contra `supabase start` local (R-11), um cliente por perfil, **sem** passar pela interface:

| # | Credencial | Requisição | Esperado | Cobre |
|---|---|---|---|---|
| 1 | professor | `select * from profiles` | 1 linha (a própria) | US3-1, FR-035 |
| 2 | professor | `select * from alunos` de turma não vinculada | 0 linhas | US3-2, FR-036 — ⚠️ **DIFERIDO**: sem tabela de alunos, o resultado é vazio por ausência de dados, não por política. Não conta como negação provada |
| 3 | secretaria | `insert into profiles` / `insert into user_roles` | erro de política | US3-3, FR-020 |
| 4 | coordenacao | `select * from audit_log` | erro de política | US3-4 (**só a metade negativa**), FR-037. A metade positiva — coordenação lê alunos e turmas de toda a escola — depende da feature de turmas |
| 5 | qualquer não-admin | `update audit_log` / `delete from audit_log` | erro | US3-5, FR-041 |
| 6 | anônimo | `select * from profiles` | 0 linhas / erro | US3-6, FR-038 |
| 7 | usuário desativado, JWT ainda válido | qualquer `select` | 0 linhas / erro | US3-7, SC-009 |
| 8 | coordenacao+professor com `active_view='professor'` | `select` de dados de coordenação | retorna tudo que a coordenação alcança | US3-8, FR-013 |
| 9 | professor | `update profiles set status='ativo' where id = auth.uid()` | erro (coluna não concedida) | FR-020 |
| 10 | professor | `update profiles set active_view='administrador'` | erro do `with check` | FR-012 |

Meta: 100% de negação nas linhas 3–7 e 9–10 (SC-003). A linha 2 fica fora da conta enquanto diferida —
contá-la inflaria o resultado de SC-003 com um verde vazio.

---

## Parte B — Rotas da interface

Tabela declarada como **dado** em `src/config.ts` (Princípio III) — sem importar `react-router-dom` —
e traduzida em `main.tsx` para o array de `useRoutes()`. Aplicada por um único `Guarda`
(`src/components/templates/Guarda.tsx`), montado como **rota de layout** que renderiza `<Outlet />`
ou `<Navigate replace />`. Nenhum `if` de permissão espalhado por componente.

| Caminho | Página | Acesso | Observações |
|---|---|---|---|
| `/entrar` | `EntrarPage` | anônimo | autenticado é redirecionado ao painel da visão ativa |
| `/esqueci-senha` | `EsqueciSenhaPage` | anônimo | confirmação genérica sempre (FR-030) |
| `/redefinir-senha` | `RedefinirSenhaPage` | anônimo, com token | link inválido/usado oferece novo pedido (US4-4) |
| `/trocar-senha` | `TrocarSenhaPage` | autenticado com `primeiroAcesso` | **absorve toda navegação** enquanto pendente (FR-027) |
| `/painel/administrador` | `PainelAdministradorPage` | `administrador` | |
| `/painel/secretaria` | `PainelSecretariaPage` | `secretaria` | |
| `/painel/coordenacao` | `PainelCoordenacaoPage` | `coordenacao` | |
| `/painel/professor` | `PainelProfessorPage` | `professor` | sem vínculo → painel vazio com orientação, nunca erro |
| `/usuarios` | `UsuariosPage` | `administrador` | busca por nome, e-mail, perfil e situação (FR-025) |
| `/usuarios/novo` | `NovoUsuarioPage` | `administrador` | |
| `/auditoria` | `AuditoriaPage` | `administrador` | filtros por afetado e por período (FR-042) |
| `/acesso-negado` | `AcessoNegadoPage` | autenticado | aviso claro, sem revelar conteúdo (FR-015) |
| `*` | `NaoEncontradaPage` | qualquer | |

### B.1 Ordem de decisão do `Guarda`

Ordem fixa; inverter qualquer par quebra um requisito:

1. `status === 'carregando'` → placeholder acessível (`aria-busy`), nada mais.
2. Não autenticado e rota interna → `/entrar?destino=<caminho+busca codificado>` (FR-006).
3. Autenticado com `primeiroAcesso` e rota ≠ `/trocar-senha` → `/trocar-senha` (FR-027; passo **2**
   antes deste, senão o anônimo cairia na troca de senha).
4. Rota exige perfil ausente das **permissões efetivas** → `/acesso-negado` (FR-015).
5. Autenticado em rota anônima → painel da visão ativa.
6. Caso contrário, `<Outlet />`.

Todo redirecionamento usa `<Navigate replace />` — sem `replace`, o botão Voltar devolveria o usuário
à rota da qual ele acabou de ser expulso, criando laço.

Após a autenticação, `destino` só é honrado se passar pelos passos 3 e 4; caso contrário vai ao
painel da visão ativa (FR-006, final).

**Validação obrigatória de `destino`** (`src/lib/destino.ts`, função pura, coberta por
`test:unit`): só é honrado o valor que começa com `/` **e não** com `//` ou `/\`. Qualquer outra
forma — URL absoluta, esquema `javascript:`, caminho protocolo-relativo — é descartada em silêncio e
substituída pelo painel da visão ativa. Sem essa checagem, `?destino=https://…` transforma a tela de
entrada em redirecionamento aberto, no exato momento em que o usuário acabou de digitar a senha.

### B.2 Menu

`config.ts` declara `itensDeMenu: Record<Perfil, ItemDeMenu[]>`. O menu exibe os itens da **visão
ativa** (FR-014) — nunca a união dos perfis, para que a visão signifique algo. Isso não amplia nem
reduz permissão: uma área alcançável por outro perfil do usuário continua acessível por URL direta,
porque o passo 4 do `Guarda` avalia as permissões efetivas (FR-013).

O seletor de visão só aparece quando `perfis.length > 1`, alterna em **≤ 2 toques** a partir de
qualquer tela (SC-011) e indica visivelmente a visão ativa — por texto, não só por cor
(design system §2.3).

### B.3 Acessibilidade das rotas

Aplicável a toda tela desta feature (FR-043 a FR-048, SC-006, SC-007):

- Troca de rota move o foco para o `<h1>` da nova página e anuncia o título em região
  `aria-live="polite"`. **O `react-router-dom` não faz isso**: é código nosso no `LayoutInterno`,
  verificado por teste, não comportamento herdado da biblioteca.
- Navegação interna sempre por `<Link>`/`<NavLink>`, nunca `onClick={() => navigate(...)}` — âncora
  real preserva ctrl-clique, clique do meio, "abrir em nova aba" e o preview da URL na barra de
  status. `useNavigate` só depois de ação já executada (entrada, saída, troca de senha).
- `<NavLink>` marca a rota atual com `aria-current="page"`, e o destaque visual nunca fica só na cor
  (design system §2.3).
- Um `h1` por tela, hierarquia sem pular níveis (design system §3.4).
- Erros de formulário: `aria-invalid` no campo, mensagem ligada por `aria-describedby`, resumo em
  região `aria-live` (FR-046).
- Operação demorada: botão em estado de carregamento e inerte, impedindo envio duplo (FR-047).
- 320px sem rolagem horizontal, alvo de toque ≥ 44×44px, anel de foco visível em tudo.
