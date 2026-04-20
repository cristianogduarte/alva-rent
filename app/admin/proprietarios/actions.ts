'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { proprietarioSchema } from './schema';

type Result = { ok: true } | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

function parseForm(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  return proprietarioSchema.safeParse(raw);
}

export async function criarProprietario(
  _prev: Result | null,
  formData: FormData
): Promise<Result> {
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return {
      ok: false,
      error: 'Dados inválidos',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }
  const supabase = createClient();
  const { error } = await supabase.from('proprietarios').insert(parsed.data);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/admin/proprietarios');
  redirect('/admin/proprietarios');
}

export async function atualizarProprietario(
  id: string,
  _prev: Result | null,
  formData: FormData
): Promise<Result> {
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return {
      ok: false,
      error: 'Dados inválidos',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }
  const supabase = createClient();
  const { error } = await supabase.from('proprietarios').update(parsed.data).eq('id', id);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/admin/proprietarios');
  revalidatePath(`/admin/proprietarios/${id}`);
  redirect(`/admin/proprietarios/${id}`);
}

export async function excluirProprietario(id: string): Promise<Result> {
  const supabase = createClient();

  const { count } = await supabase
    .from('imoveis')
    .select('id', { count: 'exact', head: true })
    .eq('proprietario_id', id);

  if (count && count > 0) {
    return {
      ok: false,
      error: `Proprietário possui ${count} imóvel(is) vinculado(s) — desvincule ou exclua os imóveis antes.`,
    };
  }

  const { error } = await supabase.from('proprietarios').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/admin/proprietarios');
  return { ok: true };
}
