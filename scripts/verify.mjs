import pg from 'pg';
const c = new pg.Client({ connectionString: process.env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
await c.connect();
const tables = ['proprietarios','imoveis','inquilinos','contratos','boletos','historico','pendencias','reguas_cobranca','usuarios_admin','audit_log'];
for (const t of tables) {
  const r = await c.query(`select count(*)::int as n from ${t}`);
  console.log(`${t.padEnd(20)} ${String(r.rows[0].n).padStart(4)} linhas`);
}
await c.end();
