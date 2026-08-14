# Contrato — Edge Functions

**Feature**: `001-autenticacao-controle-acesso` | **Fase**: 1

Três funções em `supabase/functions/`. São a **única** superfície com privilégio acima do usuário
autenticado; a *service role key* existe apenas no ambiente delas (FR-039).

Regras válidas para todas:

- `Content-Type: application/json`; corpo e resposta em JSON; textos de erro **não** vêm daqui — a
  resposta traz `codigo`, e a UI resolve o texto em pt-BR por `src/config.ts` (Princípio III).
- Autorização: valida o JWT do chamador e **reconsulta perfil e situação no banco**. Nada vindo do
  corpo da requisição é usado para decidir permissão.
- Toda mutação e a linha de `audit_log` correspondente ocorrem na **mesma transação** (FR-040).
- Nenhuma resposta, log ou registro de auditoria contém senha, hash ou token (FR-033).
- `429` sempre acompanha `Retry-After` em segundos.
- CORS restrito à origem do GitHub Pages configurada em `ALLOWED_ORIGIN`.

---

## 1. `POST /functions/v1/auth-login`

Cobre FR-002, FR-003, FR-004, FR-007 e SC-004. Chamada **sem** JWT.

**Requisição**

```json
{ "email": "professor@escola.exemplo", "senha": "…" }
```

**Respostas**

| HTTP | Corpo | Quando |
|---|---|---|
| `200` | `{ "session": { "access_token": "…", "refresh_token": "…", "expires_in": 3600 } }` | credenciais válidas e conta ativa |
| `401` | `{ "codigo": "credenciais_invalidas" }` | e-mail inexistente **ou** senha errada — indistinguíveis |
| `403` | `{ "codigo": "conta_indisponivel", "situacao": "bloqueado" \| "desativado" }` | senha certa, conta indisponível; a sessão emitida é descartada |
| `429` | `{ "codigo": "contido_por_tentativas", "liberadoEmSegundos": 840 }` | 5 falhas em 15 min por conta ou por origem |
| `503` | `{ "codigo": "indisponivel" }` | falha de infraestrutura |

**Algoritmo** (ordem obrigatória — ver R-07):

1. Normaliza o e-mail (`lower(trim())`) e calcula `ip_hash = sha256(ip + LOGIN_IP_PEPPER)`.
2. Conta falhas dos últimos 15 min por conta e por origem. Atingido o limite → `429`
   **sem tentar autenticar** (a senha correta também é recusada).
3. Delega ao GoTrue. Falha → grava `login_attempts(succeeded=false)` → `401`.
4. Sucesso → lê `profiles.status`. Diferente de `ativo` → revoga a sessão recém-criada → `403`.
5. Sucesso e ativo → limpa as falhas da conta, grava `succeeded=true`, atualiza `last_sign_in_at`.
6. **Piso de tempo**: toda resposta é liberada apenas após ~350 ms desde o início da requisição,
   igualando os caminhos e fechando o canal lateral de tempo (SC-004).

**Teste de contrato**: `401` de e-mail inexistente e `401` de senha errada devem ter corpo idêntico
byte a byte e diferença de tempo mediana abaixo de 50 ms em 50 execuções.

---

## 2. `POST /functions/v1/admin-users`

Cobre FR-017 a FR-024, FR-026 e FR-040. Exige JWT de usuário **ativo** com o perfil `administrador`;
qualquer outro chamador — inclusive Secretaria — recebe `403 { "codigo": "nao_autorizado" }`
(FR-020, US3 cenário 3).

Uma rota, discriminada por `acao`:

| `acao` | Campos | Efeito | Auditoria |
|---|---|---|---|
| `criar` | `nome`, `email`, `perfis[]`, `professorId?` | cria em `auth.users` + `profiles` com `first_access=true`, gera senha temporária e a envia por e-mail | `usuario_criado` |
| `definir_perfis` | `usuarioId`, `perfis[]` | substitui as linhas de `user_roles`; reajusta `active_view` se preciso | `perfil_atribuido` / `perfil_removido`, uma linha por diferença |
| `bloquear` | `usuarioId` | `status='bloqueado'` | `usuario_bloqueado` |
| `desbloquear` | `usuarioId` | `status='ativo'` | `usuario_desbloqueado` |
| `desativar` | `usuarioId` | `status='desativado'` | `usuario_desativado` |
| `reemitir_senha` | `usuarioId` | nova senha temporária, `first_access=true` | `senha_redefinida_admin` (valores nulos) |

**Erros**

| HTTP | `codigo` | Origem |
|---|---|---|
| `400` | `perfil_obrigatorio` | `perfis` vazio (FR-008 / INV-1) |
| `400` | `vinculo_professor_obrigatorio` | `professor ∈ perfis` sem `professorId` (FR-018 / INV-2) |
| `409` | `email_em_uso` | e-mail já existe, em qualquer caixa (FR-019) |
| `409` | `ultimo_administrador` | bloquear, desativar ou rebaixar o último administrador ativo (FR-023 / INV-4) |
| `403` | `nao_autorizado` | chamador sem perfil `administrador` ou com conta não ativa |
| `503` | `indisponivel` | falha de infraestrutura |

`200` devolve o usuário no formato de domínio `Usuario`, para que a lista seja atualizada sem nova
consulta (FR-024).

**Nota**: não existe `acao: "excluir"`. A ausência é o contrato da FR-022.

---

## 3. `POST /functions/v1/password-recovery`

Cobre FR-029, FR-030, FR-031 e FR-032. Chamada **sem** JWT.

**Requisição**: `{ "email": "…" }`

**Resposta**: **sempre** `200 { "ok": true }`, com o mesmo piso de tempo do `auth-login`. Nunca
informa se o e-mail existe, está bloqueado ou desativado (FR-030, SC-004).

**Efeito interno**, silencioso:

1. E-mail inexistente → nada acontece.
2. Usuário `bloqueado` ou `desativado` → nada é enviado (US4 cenário 5).
3. Usuário ativo → marca `superseded_at` nos pedidos vivos anteriores, insere um novo pedido com
   `expires_at = now() + 1 hora` e dispara o e-mail de recuperação com o template pt-BR.

A conclusão da redefinição usa o fluxo nativo do GoTrue; um *webhook* (ou a própria tela, via
`AuthPort.redefinirSenhaComLink`) marca `consumed_at`. O GoTrue revoga os demais refresh tokens do
usuário, encerrando as sessões abertas em outros dispositivos (FR-032).

---

## 4. Variáveis de ambiente

Somente no ambiente das Edge Functions — nunca em `VITE_*`, nunca no bundle:

| Nome | Uso |
|---|---|
| `SUPABASE_URL` | injetada pela plataforma |
| `SUPABASE_SERVICE_ROLE_KEY` | injetada pela plataforma; jamais sai da função |
| `LOGIN_IP_PEPPER` | *pepper* do hash de IP em `login_attempts` |
| `ALLOWED_ORIGIN` | origem do GitHub Pages, para o CORS |
| `APP_BASE_URL` | base dos links de recuperação e de primeiro acesso |

No front-end existem apenas `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` — ambas públicas por
natureza, inócuas porque **toda** tabela tem RLS. Ambas listadas em `.env.example` com valor fictício.
