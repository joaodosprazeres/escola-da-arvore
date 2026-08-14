/**
 * US4-6, FR-031, FR-032 — emitir dois pedidos seguidos invalida o anterior (índice único parcial
 * de `password_reset_requests`); concluir a redefinição encerra as demais sessões do usuário.
 *
 * O envio do e-mail em si (Edge Function `password-recovery`) não roda aqui: este ambiente não tem
 * acesso de rede para os imports remotos do Deno, então a suíte prova as duas garantias de dados
 * que sustentam o contrato — o índice único e o encerramento de sessão — diretamente, sem depender
 * do Edge Runtime subir (mesma ressalva de `auth-login-tempo.test.ts`). T089.
 */
import { describe, expect, it } from 'vitest';
import { clienteAnonimo, clienteDeServico, criarUsuarioDeTeste } from './apoio/clientes';

describe('RLS — redefinição de senha, uso único', () => {
  it('um segundo pedido vivo para o mesmo usuário viola o índice único parcial', async () => {
    const conta = await criarUsuarioDeTeste(['secretaria']);
    const admin = clienteDeServico();

    const primeiro = await admin.from('password_reset_requests').insert({ user_id: conta.id });
    expect(primeiro.error).toBeNull();

    const segundoSemSuperar = await admin
      .from('password_reset_requests')
      .insert({ user_id: conta.id });
    expect(segundoSemSuperar.error).not.toBeNull();

    await admin
      .from('password_reset_requests')
      .update({ superseded_at: new Date().toISOString() })
      .eq('user_id', conta.id)
      .is('consumed_at', null)
      .is('superseded_at', null);

    const segundoDepoisDeSuperar = await admin
      .from('password_reset_requests')
      .insert({ user_id: conta.id });
    expect(segundoDepoisDeSuperar.error).toBeNull();
  }, 30_000);

  it('sign-out global encerra as demais sessões do usuário — a próxima solicitação delas é negada', async () => {
    const conta = await criarUsuarioDeTeste(['secretaria']);
    const admin = clienteDeServico();

    // Uma segunda "aba": nova entrada, nova sessão, para a mesma conta.
    const segundaAba = clienteAnonimo();
    const { error: erroDeEntrada } = await segundaAba.auth.signInWithPassword({
      email: conta.email,
      password: 'senha-de-teste-rls-123',
    });
    expect(erroDeEntrada).toBeNull();

    const antes = await segundaAba.from('profiles').select('*').eq('id', conta.id);
    expect(antes.data).toHaveLength(1);

    // `admin.auth.admin.signOut` identifica a conta pelo JWT de uma sessão dela, não pelo id —
    // usamos a primeira "aba" (`conta.cliente`) para revogar globalmente, exatamente como
    // `redefinirSenhaComLink()` faz ao concluir a redefinição (FR-032).
    const { data: sessaoDaPrimeiraAba } = await conta.cliente.auth.getSession();
    const tokenDaPrimeiraAba = sessaoDaPrimeiraAba.session?.access_token;
    if (tokenDaPrimeiraAba === undefined) throw new Error('Sessão da primeira aba indisponível.');

    const { error: erroDeRevogacao } = await admin.auth.admin.signOut(tokenDaPrimeiraAba, 'global');
    expect(erroDeRevogacao).toBeNull();

    const depois = await segundaAba.from('profiles').select('*').eq('id', conta.id);
    if (depois.error !== null) {
      expect(depois.error).not.toBeNull();
    } else {
      expect(depois.data).toHaveLength(0);
    }
  }, 30_000);
});
