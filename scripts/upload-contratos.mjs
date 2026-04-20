/**
 * Faz upload dos arquivos de contrato reais no bucket 'contratos'
 * e cria os registros em contrato_arquivos.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter((l) => l.trim() && !l.trim().startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')];
    })
);

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const base = 'C:/Users/crist/OneDrive/Documentos/mykeyimoveis/contratos/contrato de aluguel';

const uploads = [
  // codigo_contrato, arquivo_local, categoria, nome_visivel
  { codigo: 'CTR-JN-106', file: `${base}/CONTRATO DE LOCAÇÃO residencial Coite.docx`, categoria: 'contrato', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
  { codigo: 'CTR-JN-107', file: `${base}/kitniet 2.docx`,                               categoria: 'contrato', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
  // 101 = AYG (valor vai mudar, mas subo o arquivo atual)
  { codigo: 'CTR-JN-101', file: `${base}/CONTRATO DE LOCAÇÃO DE IMÓVEL RESIDENCIAL AYG.docx`, categoria: 'contrato', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
];

const { data: contratos } = await sb.from('contratos').select('id, codigo');
const byCodigo = Object.fromEntries(contratos.map((c) => [c.codigo, c.id]));

for (const u of uploads) {
  const contratoId = byCodigo[u.codigo];
  if (!contratoId) { console.error(`✗ ${u.codigo} não encontrado`); continue; }

  const bytes = readFileSync(u.file);
  const nome = basename(u.file);
  const ts = Date.now();
  const slug = nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]+/g, '_');
  const storagePath = `${contratoId}/${ts}_${slug}`;

  const { error: upErr } = await sb.storage.from('contratos').upload(storagePath, bytes, {
    contentType: u.mime, upsert: false,
  });
  if (upErr) { console.error(`✗ upload ${u.codigo}: ${upErr.message}`); continue; }

  const { error: dbErr } = await sb.from('contrato_arquivos').insert({
    contrato_id: contratoId,
    categoria: u.categoria,
    nome,
    storage_path: storagePath,
    mime: u.mime,
    tamanho: bytes.length,
  });
  if (dbErr) { console.error(`✗ db ${u.codigo}: ${dbErr.message}`); continue; }

  console.log(`✓ ${u.codigo} ← ${nome} (${(bytes.length/1024).toFixed(1)} KB)`);
}
