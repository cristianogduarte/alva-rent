'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

const CATEGORIAS = ['contrato', 'aditivo', 'vistoria', 'comprovante', 'rg_cpf', 'outro'] as const;
type Categoria = (typeof CATEGORIAS)[number];

function slugify(name: string) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/_{2,}/g, '_')
    .slice(0, 120);
}

export async function uploadArquivo(contratoId: string, formData: FormData) {
  const supabase = createClient();
  const file = formData.get('file') as File | null;
  const categoriaRaw = (formData.get('categoria') ?? 'contrato') as string;
  const categoria: Categoria = (CATEGORIAS as readonly string[]).includes(categoriaRaw)
    ? (categoriaRaw as Categoria)
    : 'contrato';

  if (!file || file.size === 0) return { ok: false, error: 'Arquivo vazio.' };
  if (file.size > 50 * 1024 * 1024) return { ok: false, error: 'Arquivo maior que 50MB.' };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Não autenticado.' };

  const ts = Date.now();
  const storagePath = `${contratoId}/${ts}_${slugify(file.name)}`;

  const { error: upErr } = await supabase.storage
    .from('contratos')
    .upload(storagePath, file, {
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    });
  if (upErr) return { ok: false, error: `Upload falhou: ${upErr.message}` };

  const { error: dbErr } = await supabase.from('contrato_arquivos').insert({
    contrato_id: contratoId,
    categoria,
    nome: file.name,
    storage_path: storagePath,
    mime: file.type || null,
    tamanho: file.size,
    uploaded_by: user.id,
  });
  if (dbErr) {
    await supabase.storage.from('contratos').remove([storagePath]);
    return { ok: false, error: `Registro falhou: ${dbErr.message}` };
  }

  revalidatePath(`/admin/contratos/${contratoId}`);
  return { ok: true };
}

export async function excluirArquivo(contratoId: string, arquivoId: string) {
  const supabase = createClient();
  const { data: arq } = await supabase
    .from('contrato_arquivos')
    .select('storage_path')
    .eq('id', arquivoId)
    .maybeSingle();
  if (!arq) return { ok: false, error: 'Arquivo não encontrado.' };

  await supabase.storage.from('contratos').remove([arq.storage_path]);
  const { error } = await supabase.from('contrato_arquivos').delete().eq('id', arquivoId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/admin/contratos/${contratoId}`);
  return { ok: true };
}

export async function getSignedUrl(storagePath: string) {
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from('contratos')
    .createSignedUrl(storagePath, 60 * 10); // 10 min
  if (error || !data) return { ok: false, error: error?.message ?? 'falhou' };
  return { ok: true, url: data.signedUrl };
}
