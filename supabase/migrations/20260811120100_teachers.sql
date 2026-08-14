-- Migração 2/10 — `teachers` (data-model.md §2.3).
-- Dependência mínima do vínculo obrigatório do perfil Professor (FR-018). O cadastro completo de
-- professores pertence a outra feature; aqui existe só o suficiente para exercitar o vínculo.

create table public.teachers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  active boolean not null default true
);

comment on table public.teachers is
  'Registro mínimo de professor. Cadastro completo pertence à feature de cadastros base.';
