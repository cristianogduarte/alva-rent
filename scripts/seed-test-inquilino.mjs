/**
 * Seed de inquilino de teste + imóvel + contrato ativo.
 * Usa APENAS supabase-js (service_role) - sem psql/SUPABASE_DB_URL.
 *
 * Uso: node scripts/seed-test-inquilino.mjs
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

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
if (!url || !secret) {
  console.error('✗ Falta NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY em .env.local');
  process.exit(1);
}

// === Dados fixos ===
const EMAIL = 'cristianogduarte@gmail.com';
const SENHA = '11cd18';
const NOME = 'Cristiano Duarte (teste)';
const CPF = '00000000191';
const CNPJ_PROP = '00000000000191';
const CODIGO_IMOVEL = 'TESTE-1';
const CODIGO_CONTRATO = 'CT-TESTE-1';

const sb = createClient(url, secret, { auth: { persistSession: false } });

// 1) Auth user
console.log(`→ Criando user ${EMAIL} no Auth...`);
let userId;
{
  const { data, error } = await sb.auth.admin.createUser({
    email: EMAIL, password: SENHA, email_confirm: true,
    user_metadata: { nome: NOME },
  });
  if (error) {
    if (String(error.message).toLowerCase().includes('already')) {
      console.log('  (já existia — buscando id)');
      const { data: list } = await sb.auth.admin.listUsers();
      const u = list.users.find((x) => x.email === EMAIL);
      if (!u) { console.error('✗ não achei user'); process.exit(1); }
      userId = u.id;
      await sb.auth.admin.updateUserById(userId, { password: SENHA, email_confirm: true });
    } else { console.error('✗ erro auth:', error.message); process.exit(1); }
  } else userId = data.user.id;
}
console.log(`✓ user_id = ${userId}`);

// Helper upsert via supabase-js
async function upsert(table, conflict, row, select = 'id') {
  const { data, error } = await sb
    .from(table)
    .upsert(row, { onConflict: conflict })
    .select(select)
    .single();
  if (error) throw new Error(`${table}: ${error.message}`);
  return data;
}

try {
  console.log('→ upsert proprietario...');
  const prop = await upsert('proprietarios', 'cpf_cnpj', {
    nome: 'ALVA ONE (teste)',
    cpf_cnpj: CNPJ_PROP,
    email: EMAIL,
    comissao_pct: 10,
  });

  console.log(`→ upsert imovel ${CODIGO_IMOVEL}...`);
  const imovel = await upsert('imoveis', 'codigo', {
    codigo: CODIGO_IMOVEL,
    tipo: 'apartamento',
    endereco: 'Rua de Teste',
    numero: '100',
    bairro: 'Centro',
    cidade: 'Cabo Frio',
    uf: 'RJ',
    proprietario_id: prop.id,
    status: 'alugado',
    modalidade: 'long_stay',
    capacidade_hospedes: 2,
  });

  console.log('→ upsert inquilino...');
  const inq = await upsert('inquilinos', 'cpf', {
    cpf: CPF,
    nome: NOME,
    email: EMAIL,
    telefone: '21999999999',
    user_id: userId,
  });

  console.log(`→ upsert contrato ${CODIGO_CONTRATO}...`);
  const hoje = new Date().toISOString().slice(0, 10);
  const fim = new Date(Date.now() + 365 * 86400 * 1000).toISOString().slice(0, 10);
  await upsert('contratos', 'codigo', {
    codigo: CODIGO_CONTRATO,
    imovel_id: imovel.id,
    inquilino_id: inq.id,
    valor_aluguel: 2500.00,
    dia_vencimento: 10,
    data_inicio: hoje,
    data_fim: fim,
    status: 'ativo',
  });

  console.log('\n✅ Seed concluído!');
  console.log('────────────────────────────────');
  console.log(`  Login:    ${EMAIL}`);
  console.log(`  Senha:    ${SENHA}`);
  console.log(`  Imóvel:   ${CODIGO_IMOVEL} (Cabo Frio/RJ)`);
  console.log(`  Contrato: ${CODIGO_CONTRATO} — R$ 2.500/mês · venc. dia 10`);
  console.log(`  URL:      http://localhost:3000/portal`);
} catch (e) {
  console.error('✗ erro:', e.message);
  process.exit(1);
}
