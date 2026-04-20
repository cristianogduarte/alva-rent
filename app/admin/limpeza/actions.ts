'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

type Result<T = unknown> = { ok: true; data?: T } | { ok: false; error: string };

export async function criarLimpezaManual(imovelId: string, estadaId: string | null): Promise<Result> {
  const supabase = createClient();
  const checklist = [
    { item: 'Troca de roupa de cama', ok: false },
    { item: 'Troca de toalhas', ok: false },
    { item: 'Limpeza geral dos cômodos', ok: false },
    { item: 'Limpeza do banheiro', ok: false },
    { item: 'Limpeza da cozinha', ok: false },
    { item: 'Lixo retirado', ok: false },
    { item: 'Louça lavada e guardada', ok: false },
    { item: 'Amenities repostos', ok: false },
    { item: 'Vistoria de avarias', ok: false },
  ];
  const { error } = await supabase.from('limpezas').insert({
    imovel_id: imovelId,
    estada_id: estadaId,
    status: 'pendente',
    checklist_json: checklist,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath('/admin/limpeza');
  return { ok: true };
}

export async function agendarLimpeza(
  id: string,
  equipeId: string,
  agendadaPara: string,
  valor: number | null,
): Promise<Result> {
  const supabase = createClient();
  const { error } = await supabase
    .from('limpezas')
    .update({
      equipe_id: equipeId,
      agendada_para: agendadaPara,
      valor,
      status: 'agendada',
    })
    .eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/admin/limpeza');
  revalidatePath(`/admin/limpeza/${id}`);
  return { ok: true };
}

export async function cancelarLimpeza(id: string): Promise<Result> {
  const supabase = createClient();
  const { error } = await supabase
    .from('limpezas')
    .update({ status: 'cancelada' })
    .eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/admin/limpeza');
  return { ok: true };
}

// Salva equipe
export async function salvarEquipe(_prev: unknown, form: FormData): Promise<Result> {
  const supabase = createClient();
  const id = (form.get('id') as string) || null;
  const payload = {
    nome: String(form.get('nome') ?? '').trim(),
    telefone: (form.get('telefone') as string) || null,
    chave_pix: (form.get('chave_pix') as string) || null,
    valor_padrao: form.get('valor_padrao') ? Number(form.get('valor_padrao')) : null,
    ativo: form.get('ativo') === 'on',
    observacoes: (form.get('observacoes') as string) || null,
  };
  if (!payload.nome) return { ok: false, error: 'Nome obrigatório' };

  if (id) {
    const { error } = await supabase.from('equipe_limpeza').update(payload).eq('id', id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await supabase.from('equipe_limpeza').insert(payload);
    if (error) return { ok: false, error: error.message };
  }
  revalidatePath('/admin/limpeza/equipe');
  return { ok: true };
}

export async function excluirEquipe(id: string): Promise<Result> {
  const supabase = createClient();
  const { error } = await supabase.from('equipe_limpeza').update({ ativo: false }).eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/admin/limpeza/equipe');
  return { ok: true };
}

// Atualização pelo app público (rota /limpeza/[token])
export async function atualizarChecklistPublico(
  token: string,
  checklist: { item: string; ok: boolean }[],
  observacoes: string,
): Promise<Result> {
  if (!token || token.length < 16) return { ok: false, error: 'Token inválido' };
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('limpezas')
    .update({ checklist_json: checklist, observacoes })
    .eq('token_publico', token);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function iniciarLimpezaPublico(token: string): Promise<Result> {
  if (!token || token.length < 16) return { ok: false, error: 'Token inválido' };
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('limpezas')
    .update({ status: 'em_andamento', iniciada_em: new Date().toISOString() })
    .eq('token_publico', token);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function concluirLimpezaPublico(token: string): Promise<Result> {
  if (!token || token.length < 16) return { ok: false, error: 'Token inválido' };
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('limpezas')
    .update({ status: 'concluida', concluida_em: new Date().toISOString() })
    .eq('token_publico', token);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
