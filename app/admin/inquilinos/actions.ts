'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { inquilinoSchema } from './schema';

type Result = { ok: true } | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

function parseForm(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  return inquilinoSchema.safeParse(raw);
}

export async function criarInquilino(_prev: Result | null, formData: FormData): Promise<Result> {
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { ok: false, error: 'Dados inválidos', fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const supabase = createClient();
  const { error } = await supabase.from('inquilinos').insert(parsed.data);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/admin/inquilinos');
  redirect('/admin/inquilinos');
}

export async function atualizarInquilino(
  id: string,
  _prev: Result | null,
  formData: FormData
): Promise<Result> {
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { ok: false, error: 'Dados inválidos', fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const supabase = createClient();
  const { error } = await supabase.from('inquilinos').update(parsed.data).eq('id', id);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/admin/inquilinos');
  revalidatePath(`/admin/inquilinos/${id}`);
  redirect('/admin/inquilinos');
}

export async function excluirInquilino(id: string): Promise<Result> {
  const supabase = createClient();

  const { count } = await supabase
    .from('contratos')
    .select('id', { count: 'exact', head: true })
    .eq('inquilino_id', id);

  if (count && count > 0) {
    return { ok: false, error: 'Inquilino possui contratos vinculados — encerre/exclua os contratos antes.' };
  }

  const { error } = await supabase.from('inquilinos').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/admin/inquilinos');
  return { ok: true };
}
