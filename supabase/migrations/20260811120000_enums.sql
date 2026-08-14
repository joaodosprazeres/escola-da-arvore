-- Migração 1/10 — enums do domínio e extensão citext (data-model.md §1).
-- citext existe por causa da FR-019: unicidade de e-mail é case-insensitive.

create extension if not exists citext with schema extensions;

create type public.perfil as enum ('administrador', 'secretaria', 'coordenacao', 'professor');

create type public.situacao_usuario as enum ('ativo', 'bloqueado', 'desativado');

create type public.acao_auditoria as enum (
  'usuario_criado',
  'perfil_atribuido',
  'perfil_removido',
  'usuario_bloqueado',
  'usuario_desbloqueado',
  'usuario_desativado',
  'senha_redefinida_admin',
  'visao_ativa_alterada'
);
