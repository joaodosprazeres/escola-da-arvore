/**
 * `POST /functions/v1/admin-users` — criação e gestão de contas, exclusiva do Administrador
 * (`contracts/edge-functions.md` §2; FR-017 a FR-024, FR-026, FR-040).
 *
 * O perfil do chamador é sempre reconsultado no banco (nunca claim do JWT — R-05). `definir_perfis`,
 * `bloquear`, `desbloquear` e `desativar` gravam a mutação e a linha de `audit_log` na mesma
 * transação, dentro das funções `admin_*` de `supabase/migrations/…_admin_rpc.sql`. `criar` e
 * `reemitir_senha` passam pela Admin API do GoTrue — fora de qualquer transação SQL nossa — e por
 * isso gravam a auditoria em uma segunda chamada logo em seguida; é a única aproximação do contrato
 * de atomicidade desta função, documentada aqui e em `admin_rpc.sql`.
 */
import { createClient } from 'npm:@supabase/supabase-js@2';
import { respostaErro, respostaJson, tratarPreflight } from '../_shared/resposta.ts';

type Perfil = 'administrador' | 'secretaria' | 'coordenacao' | 'professor';

const PERFIS_VALIDOS: readonly Perfil[] = [
  'administrador',
  'secretaria',
  'coordenacao',
  'professor',
];

const CODIGOS_CONHECIDOS = new Set([
  'email_em_uso',
  'vinculo_professor_obrigatorio',
  'perfil_obrigatorio',
  'ultimo_administrador',
  'nao_autorizado',
]);

interface CorpoDaRequisicao {
  readonly acao?: unknown;
  readonly nome?: unknown;
  readonly email?: unknown;
  readonly perfis?: unknown;
  readonly professorId?: unknown;
  readonly usuarioId?: unknown;
}

function ehListaDePerfis(valor: unknown): valor is Perfil[] {
  return (
    Array.isArray(valor) &&
    valor.every(
      (item): item is Perfil => typeof item === 'string' && PERFIS_VALIDOS.includes(item as Perfil),
    )
  );
}

/** Mapeia a mensagem de exceção do Postgres para o código de domínio (`contracts/ports.ts`). */
function mapearErroDoPostgres(mensagem: string | undefined): string {
  const texto = mensagem ?? '';
  if (texto.startsWith('INV-1')) return 'perfil_obrigatorio';
  if (texto.startsWith('INV-2')) return 'vinculo_professor_obrigatorio';
  if (texto.startsWith('INV-4')) return 'ultimo_administrador';
  if (CODIGOS_CONHECIDOS.has(texto)) return texto;
  return 'indisponivel';
}

function gerarSenhaTemporaria(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return Array.from(bytes, (byte) => byte.toString(36).padStart(2, '0')).join('');
}

Deno.serve(async (requisicao) => {
  const preflight = tratarPreflight(requisicao);
  if (preflight !== null) return preflight;

  if (requisicao.method !== 'POST') {
    return respostaErro('indisponivel', 503);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (supabaseUrl === undefined || serviceRoleKey === undefined) {
    return respostaErro('indisponivel', 503);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Autorização: valida o JWT do chamador e reconsulta perfil e situação no banco — nada do corpo
  // da requisição decide permissão (R-05).
  const cabecalhoAutorizacao = requisicao.headers.get('Authorization') ?? '';
  const jwt = cabecalhoAutorizacao.replace(/^Bearer\s+/i, '');

  if (jwt === '') {
    return respostaErro('nao_autorizado', 403);
  }

  const { data: dadosDoChamador, error: erroDoChamador } = await admin.auth.getUser(jwt);
  if (erroDoChamador !== null || dadosDoChamador.user === null) {
    return respostaErro('nao_autorizado', 403);
  }

  const autorId = dadosDoChamador.user.id;

  const { data: perfilDoAutor } = await admin
    .from('profiles')
    .select('status, user_roles!user_roles_user_id_fkey(role)')
    .eq('id', autorId)
    .maybeSingle<{ status: string; user_roles: { role: Perfil }[] }>();

  const ehAdministradorAtivo =
    perfilDoAutor !== null &&
    perfilDoAutor !== undefined &&
    perfilDoAutor.status === 'ativo' &&
    (perfilDoAutor.user_roles ?? []).some((papel) => papel.role === 'administrador');

  if (!ehAdministradorAtivo) {
    return respostaErro('nao_autorizado', 403);
  }

  let corpo: CorpoDaRequisicao;
  try {
    corpo = (await requisicao.json()) as CorpoDaRequisicao;
  } catch {
    return respostaErro('indisponivel', 503);
  }

  try {
    switch (corpo.acao) {
      case 'criar': {
        if (typeof corpo.nome !== 'string' || corpo.nome.trim() === '') {
          return respostaErro('indisponivel', 400);
        }
        if (typeof corpo.email !== 'string' || corpo.email.trim() === '') {
          return respostaErro('indisponivel', 400);
        }
        if (!ehListaDePerfis(corpo.perfis) || corpo.perfis.length === 0) {
          return respostaErro('perfil_obrigatorio', 400);
        }
        const professorId = typeof corpo.professorId === 'string' ? corpo.professorId : null;
        if (corpo.perfis.includes('professor') && professorId === null) {
          return respostaErro('vinculo_professor_obrigatorio', 400);
        }

        const email = corpo.email.trim().toLowerCase();
        const senhaTemporaria = gerarSenhaTemporaria();

        const { data: criado, error: erroDeCriacao } = await admin.auth.admin.createUser({
          email,
          password: senhaTemporaria,
          email_confirm: true,
          user_metadata: {
            full_name: corpo.nome.trim(),
            perfis: corpo.perfis,
            teacher_id: professorId,
            created_by: autorId,
            first_access: true,
          },
        });

        if (erroDeCriacao !== null || criado.user === null) {
          const mensagem = (erroDeCriacao?.message ?? '').toLowerCase();
          if (
            mensagem.includes('already') ||
            mensagem.includes('registered') ||
            mensagem.includes('existe')
          ) {
            return respostaErro('email_em_uso', 409);
          }
          return respostaErro('indisponivel', 503);
        }

        // GoTrue já disparou o gatilho `espelhar_usuario_de_auth` (perfil + papéis, mesma
        // transação do INSERT em `auth.users`). Resta registrar a auditoria — segunda chamada,
        // documentada no cabeçalho deste arquivo.
        const { data: registrado, error: erroDeAuditoria } = await admin.rpc(
          'admin_registrar_usuario_criado',
          { p_usuario_id: criado.user.id, p_autor: autorId },
        );

        if (erroDeAuditoria !== null) {
          return respostaErro(mapearErroDoPostgres(erroDeAuditoria.message), 503);
        }

        // A entrega da senha temporária ao usuário é a mensagem de recuperação de senha padrão do
        // GoTrue — o mesmo caminho já auditável e testado de `password-recovery` (§3), disparada
        // aqui pela chamada pública para não expor a senha gerada em nenhum lugar (FR-033).
        const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
        const appBaseUrl = Deno.env.get('APP_BASE_URL');
        if (anonKey !== undefined) {
          const publico = createClient(supabaseUrl, anonKey, {
            auth: { autoRefreshToken: false, persistSession: false },
          });
          await publico.auth.resetPasswordForEmail(email, {
            redirectTo: appBaseUrl === undefined ? undefined : `${appBaseUrl}/redefinir-senha`,
          });
        }

        return respostaJson(registrado, 200);
      }

      case 'definir_perfis': {
        if (typeof corpo.usuarioId !== 'string' || !ehListaDePerfis(corpo.perfis)) {
          return respostaErro('indisponivel', 400);
        }

        const { data, error } = await admin.rpc('admin_definir_perfis', {
          p_usuario_id: corpo.usuarioId,
          p_perfis: corpo.perfis,
          p_autor: autorId,
        });

        if (error !== null) {
          const codigo = mapearErroDoPostgres(error.message);
          const status = codigo === 'ultimo_administrador' || codigo === 'email_em_uso' ? 409 : 400;
          return respostaErro(codigo, codigo === 'indisponivel' ? 503 : status);
        }

        return respostaJson(data, 200);
      }

      case 'bloquear':
      case 'desbloquear':
      case 'desativar': {
        if (typeof corpo.usuarioId !== 'string') {
          return respostaErro('indisponivel', 400);
        }

        const situacao =
          corpo.acao === 'bloquear'
            ? 'bloqueado'
            : corpo.acao === 'desbloquear'
              ? 'ativo'
              : 'desativado';
        const acaoDeAuditoria =
          corpo.acao === 'bloquear'
            ? 'usuario_bloqueado'
            : corpo.acao === 'desbloquear'
              ? 'usuario_desbloqueado'
              : 'usuario_desativado';

        const { data, error } = await admin.rpc('admin_mudar_situacao', {
          p_usuario_id: corpo.usuarioId,
          p_situacao: situacao,
          p_acao: acaoDeAuditoria,
          p_autor: autorId,
        });

        if (error !== null) {
          const codigo = mapearErroDoPostgres(error.message);
          return respostaErro(
            codigo,
            codigo === 'ultimo_administrador' ? 409 : codigo === 'indisponivel' ? 503 : 400,
          );
        }

        return respostaJson(data, 200);
      }

      case 'reemitir_senha': {
        if (typeof corpo.usuarioId !== 'string') {
          return respostaErro('indisponivel', 400);
        }

        const senhaTemporaria = gerarSenhaTemporaria();
        const { error: erroDeSenha } = await admin.auth.admin.updateUserById(corpo.usuarioId, {
          password: senhaTemporaria,
        });

        if (erroDeSenha !== null) {
          return respostaErro('indisponivel', 503);
        }

        const { data, error } = await admin.rpc('admin_registrar_senha_reemitida', {
          p_usuario_id: corpo.usuarioId,
          p_autor: autorId,
        });

        if (error !== null) {
          return respostaErro(mapearErroDoPostgres(error.message), 503);
        }

        const { data: perfilAlvo } = await admin
          .from('profiles')
          .select('email')
          .eq('id', corpo.usuarioId)
          .maybeSingle<{ email: string }>();

        const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
        const appBaseUrl = Deno.env.get('APP_BASE_URL');
        if (anonKey !== undefined && perfilAlvo !== null && perfilAlvo !== undefined) {
          const publico = createClient(supabaseUrl, anonKey, {
            auth: { autoRefreshToken: false, persistSession: false },
          });
          await publico.auth.resetPasswordForEmail(perfilAlvo.email, {
            redirectTo: appBaseUrl === undefined ? undefined : `${appBaseUrl}/redefinir-senha`,
          });
        }

        return respostaJson(data, 200);
      }

      default:
        return respostaErro('indisponivel', 400);
    }
  } catch {
    return respostaErro('indisponivel', 503);
  }
});
