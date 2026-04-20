/**
 * Bootstrap do usuário admin.
 * 1) Cria user em auth.users via Admin API (com service_role)
 * 2) Insere em usuarios_admin com permissões de admin
 *
 * Uso: node scripts/bootstrap-admin.mjs <email> <senha>
 */
import { createClient } from '@supabase/supabase-js';
import pg from 'pg';
import { readFileSync } from 'node:fs';

// Carrega .env.local manualmente (sem dependência extra)
const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter((l) => l.trim() && !l.trim().startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')];
    })
);

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const secret = env.SUPABASE_SERVICE_ROLE_KEY;
const dbUrl = process.env.SUPABASE_DB_URL;

if (!url || !secret) {
  console.error('✗ NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausentes no .env.local');
  process.exit(1);
}

const email = process.argv[2];
const password = process.argv[3];
const nome = process.argv[4] ?? 'Cristiano';
if (!email || !password) {
  console.error('Uso: node scripts/bootstrap-admin.mjs <email> <senha> [nome]');
  process.exit(1);
}

const supabase = createClient(url, secret, { auth: { persistSession: false } });

console.log(`→ Criando user ${email} no Auth...`);
const { data, error } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { nome },
});

let userId;
if (error) {
  if (error.message?.toLowerCase().includes('already')) {
    console.log(`  (user já existia — buscando id)`);
    const { data: list } = await supabase.auth.admin.listUsers();
    const u = list.users.find((x) => x.email === email);
    if (!u) {
      console.error('✗ Não consegui localizar o user existente.');
      process.exit(1);
    }
    userId = u.id;
  } else {
    console.error('✗ Erro ao criar user:', error.message);
    process.exit(1);
  }
} else {
  userId = data.user.id;
}
console.log(`✓ User id: ${userId}`);

console.log(`→ Gravando em usuarios_admin...`);
const client = new pg.Client({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false },
});
await client.connect();
await client.query(
  `insert into usuarios_admin (user_id, nome, cargo, permissoes, ativo)
   values ($1, $2, 'Administrador', '{visualizar,editar,admin}', true)
   on conflict (user_id) do update set nome = excluded.nome, ativo = true`,
  [userId, nome]
);
await client.end();

console.log(`✓ Admin registrado. Faça login em /login com:`);
console.log(`  email:  ${email}`);
console.log(`  senha:  ${password}`);
