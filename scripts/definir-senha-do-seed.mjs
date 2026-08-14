/**
 * Define a senha das contas do seed a partir do ambiente — desenvolvimento local apenas.
 *
 * O seed cria as contas com senha aleatória justamente para que nenhuma credencial exista no
 * repositório. Este script, rodado depois do `supabase db reset`, aplica a senha que a pessoa
 * desenvolvedora escolheu em `SENHA_ADMIN_SEED`.
 *
 * Nunca aponte para um projeto hospedado: usa a service role key, que só existe local (R-14).
 */
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321';
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
const senha = process.env.SENHA_ADMIN_SEED;

if (!serviceRole) {
  console.error(
    'SUPABASE_SERVICE_ROLE_KEY ausente. Rode `supabase status -o env` e exporte a variável.',
  );
  process.exit(1);
}

if (!senha || senha.length < 8) {
  console.error('SENHA_ADMIN_SEED ausente ou com menos de 8 caracteres.');
  process.exit(1);
}

if (!/^https?:\/\/(127\.0\.0\.1|localhost)/.test(url)) {
  console.error(`Recusado: ${url} não é uma instância local. Este script é só para dev (R-14).`);
  process.exit(1);
}

const admin = createClient(url, serviceRole, { auth: { persistSession: false } });

const contas = ['44444444-4444-4444-8444-444444444444', '55555555-5555-4555-8555-555555555555'];

for (const id of contas) {
  const { error } = await admin.auth.admin.updateUserById(id, { password: senha });
  if (error) {
    console.error(`Falha ao definir a senha de ${id}: ${error.message}`);
    process.exit(1);
  }
  console.log(`Senha definida para a conta de seed ${id}`);
}
