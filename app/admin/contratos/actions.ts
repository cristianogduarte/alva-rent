'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { contratoSchema } from './schema';

type Result = { ok: true } | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

function parseForm(formData: FormData) {
  const raw: Record<string, any> = {};
  for (const [key, value] of formData.entries()) {
    if (key === 'canal_envio') {
      raw[key] = raw[key] ?? [];
      (raw[key] as string[]).push(value as string);
    } else {
      raw[key] = value;
    }
  }
  return contratoSchema.safeParse(raw);
}

export async function criarContrato(_prev: Result | null, formData: FormData): Promise<Result> {
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { ok: false, error: 'Dados inválidos', fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const supabase = createClient();
  const { data, error } = await supabase.from('contratos').insert(parsed.data).select('id, imovel_id').single();
  if (error) return { ok: false, error: error.message };

  // Marcar imóvel como alugado quando contrato for ativo
  if (parsed.data.status === 'ativo' && data?.imovel_id) {
    await supabase.from('imoveis').update({ status: 'alugado' }).eq('id', data.imovel_id);
  }

  revalidatePath('/admin/contratos');
  revalidatePath('/admin/imoveis');
  redirect('/admin/contratos');
}

export async function atualizarContrato(
  id: string,
  _prev: Result | null,
  formData: FormData
): Promise<Result> {
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { ok: false, error: 'Dados inválidos', fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const supabase = createClient();
  const { error } = await supabase.from('contratos').update(parsed.data).eq('id', id);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/admin/contratos');
  revalidatePath(`/admin/contratos/${id}`);
  redirect(`/admin/contratos/${id}`);
}

export async function excluirContrato(id: string): Promise<Result> {
  const supabase = createClient();

  const { count } = await supabase
    .from('boletos')
    .select('id', { count: 'exact', head: true })
    .eq('contrato_id', id)
    .in('status', ['pago', 'enviado', 'visualizado']);

  if (count && count > 0) {
    return {
      ok: false,
      error: 'Contrato possui boletos pagos/enviados — encerre ao invés de excluir.',
    };
  }

  const { error } = await supabase.from('contratos').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/admin/contratos');
  return { ok: true };
}
