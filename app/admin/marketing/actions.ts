'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

type Result = { ok: true } | { ok: false; error: string };

export async function anonimizarHospede(id: string): Promise<Result> {
  const supabase = createClient();
  const { error } = await supabase
    .from('hospedes')
    .update({
      nome: 'Removido (LGPD)',
      email: null,
      telefone: null,
      documento: null,
      aceita_marketing: false,
      tags: [],
      observacoes_marketing: null,
      anonimizado_em: new Date().toISOString(),
    })
    .eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/admin/marketing');
  return { ok: true };
}

export async function atualizarOptIn(id: string, aceita: boolean): Promise<Result> {
  const supabase = createClient();
  const { error } = await supabase
    .from('hospedes')
    .update({ aceita_marketing: aceita })
    .eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/admin/marketing');
  return { ok: true };
}

export async function atualizarTags(id: string, tags: string[]): Promise<Result> {
  const supabase = createClient();
  const { error } = await supabase.from('hospedes').update({ tags }).eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/admin/marketing');
  return { ok: true };
}
