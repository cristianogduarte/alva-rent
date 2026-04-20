'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { imovelSchema } from './schema';

type Result = { ok: true } | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

function parseForm(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  return imovelSchema.safeParse(raw);
}

export async function criarImovel(_prev: Result | null, formData: FormData): Promise<Result> {
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { ok: false, error: 'Dados inválidos', fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const supabase = createClient();
  const { error } = await supabase.from('imoveis').insert(parsed.data);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/admin/imoveis');
  redirect('/admin/imoveis');
}

export async function atualizarImovel(
  id: string,
  _prev: Result | null,
  formData: FormData
): Promise<Result> {
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { ok: false, error: 'Dados inválidos', fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const supabase = createClient();
  const { error } = await supabase.from('imoveis').update(parsed.data).eq('id', id);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/admin/imoveis');
  revalidatePath(`/admin/imoveis/${id}`);
  redirect('/admin/imoveis');
}

export async function excluirImovel(id: string): Promise<Result> {
  const supabase = createClient();

  const { count } = await supabase
    .from('contratos')
    .select('id', { count: 'exact', head: true })
    .eq('imovel_id', id);

  if (count && count > 0) {
    return { ok: false, error: 'Imóvel possui contratos vinculados — exclua/encerre os contratos antes.' };
  }

  const { error } = await supabase.from('imoveis').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/admin/imoveis');
  return { ok: true };
}
