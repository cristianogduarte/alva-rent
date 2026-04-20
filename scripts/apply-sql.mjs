/**
 * Aplica um arquivo SQL no Postgres do Supabase.
 * Uso: node scripts/apply-sql.mjs <caminho-do-sql>
 *
 * Variáveis de ambiente necessárias:
 *   SUPABASE_DB_URL   postgresql://postgres:SENHA@db.PROJECT.supabase.co:5432/postgres
 *
 * Script temporário de bootstrap. NÃO commitar a senha.
 */
import { readFileSync } from 'node:fs';
import pg from 'pg';

const sqlPath = process.argv[2];
if (!sqlPath) {
  console.error('Uso: node scripts/apply-sql.mjs <arquivo.sql>');
  process.exit(1);
}

const connectionString = process.env.SUPABASE_DB_URL;
if (!connectionString) {
  console.error('Defina SUPABASE_DB_URL antes de rodar.');
  process.exit(1);
}

const sql = readFileSync(sqlPath, 'utf8');

const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

try {
  console.log(`→ Conectando ao Supabase...`);
  await client.connect();
  console.log(`→ Aplicando ${sqlPath} (${sql.length} bytes)...`);
  await client.query(sql);
  console.log(`✓ Sucesso.`);
} catch (err) {
  console.error(`✗ Erro: ${err.message}`);
  if (err.position) console.error(`  Posição: ${err.position}`);
  if (err.detail) console.error(`  Detalhe: ${err.detail}`);
  process.exitCode = 1;
} finally {
  await client.end();
}
