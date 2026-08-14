# Specification Quality Checklist: Autenticação e Controle de Acesso por Perfil

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-08-10
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Notes

### Iteração 1 — 2026-08-10

Ajustes aplicados durante a validação:

- Nomes de tecnologia (Supabase, Row Level Security, React, Vite, `.env`, `import.meta.env`) presentes
  na descrição de entrada foram removidos do corpo da spec e reescritos como requisitos
  independentes de tecnologia — notadamente FR-030 ("aplicar as restrições de acesso no armazenamento
  de dados, de modo que requisições que contornem a interface sejam igualmente negadas") e FR-034
  (nenhuma credencial privilegiada embutida na aplicação distribuída). A referência à constituição
  ficou restrita à seção de Assumptions, como dependência de governança.
- Critérios vagos da entrada foram convertidos em métricas verificáveis (SC-001 a SC-010), sem citar
  tempos de resposta de servidor ou detalhes internos.
- Regras sem valor definido na entrada (expiração de sessão, limite de tentativas, força de senha,
  validade de link) receberam padrões explícitos registrados em Assumptions, em vez de virarem
  marcadores de clarificação.

### Iteração 2 — 2026-08-10 (clarificações resolvidas)

As 3 questões abertas foram decididas pelo responsável pelo produto e incorporadas à spec:

1. **Criação de contas — exclusiva do Administrador.** A Secretaria não cria contas nem altera
   perfis. Refletido em FR-017, FR-020, no cenário 7 da User Story 2 e no cenário 3 da User Story 3.
2. **Alcance da Coordenação — toda a escola**, nos dois segmentos, sem acesso à gestão de contas nem
   ao histórico de auditoria. Refletido em FR-037 e no cenário 4 da User Story 3.
3. **Múltiplos perfis por usuário — aceito.** A regra "exatamente um perfil" caiu. Mudanças de maior
   impacto desta iteração:
   - Permissões efetivas passam a ser a **união** dos perfis atribuídos (FR-009, FR-035).
   - Nova noção de **visão ativa**, que define painel e menu mas nunca amplia permissões
     (FR-010 a FR-014, FR-016).
   - Vínculo com registro de professor exigido sempre que o perfil Professor estiver **entre** os
     atribuídos (FR-018).
   - Proteção da última conta ativa **que possui** o perfil Administrador (FR-023).
   - Novas entidades: Atribuição de Perfil e Visão Ativa.
   - Novos casos de borda: perfil removido enquanto era a visão ativa; usuário multi-perfil sem
     preferência registrada.
   - Novo critério SC-011 (alternância em até 2 toques) e SC-010 ajustado.
   - Requisitos renumerados em decorrência das inserções: o conjunto final vai de FR-001 a FR-048.

**Situação**: todos os itens do checklist passam. A spec está pronta para `/speckit-plan`.

### Observações remanescentes (não bloqueantes)

- `docs/design-system.md`, citado na seção de Dependencies e exigido pelo Princípio VI da
  constituição, foi criado em 2026-08-10 (v1.0.0). Dependência resolvida.
- O registro de professores é dependência externa desta funcionalidade: para os testes, basta um
  conjunto mínimo de registros; o cadastro completo pertence à funcionalidade de cadastros base.
