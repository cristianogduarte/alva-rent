'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

type Result<T = unknown> = { ok: true; data?: T } | { ok: false; error: string };

export async function criarManutencao(form: {
  imovel_id: string;
  estada_id?: string | null;
  tipo: 'preventiva' | 'corretiva' | 'vistoria' | 'reparo';
  prioridade: 'baixa' | 'media' | 'alta' | 'urgente';
  titulo: string;
  descricao?: string;
  agendada_para?: string | null;
  fornecedor_id?: string | null;
  origem?: 'admin' | 'hospede' | 'vistoria' | 'preventiva';
}): Promise<Result<{ id: string }>> {
  if (!form.imovel_id || !form.titulo.trim()) {
    return { ok: false, error: 'Imóvel e título obrigatórios' };
  }
  const supabase = createClient();
  const { data, error } = await supabase
    .from('manutencoes')
    .insert({
      imovel_id: form.imovel_id,
      estada_id: form.estada_id || null,
      fornecedor_id: form.fornecedor_id || null,
      tipo: form.tipo,
      prioridade: form.prioridade,
      titulo: form.titulo.trim(),
      descricao: form.descricao?.trim() || null,
      origem: form.origem ?? 'admin',
      status: form.agendada_para ? 'agendada' : 'aberta',
      agendada_para: form.agendada_para || null,
    })
    .select('id')
    .single();
  if (error) return { ok: false, error: error.message };
  revalidatePath('/admin/manutencao');
  return { ok: true, data: { id: data.id } };
}

export async function atualizarStatus(
  id: string,
  status: 'aberta' | 'agendada' | 'em_andamento' | 'resolvida' | 'cancelada',
  extras?: { custo?: number | null; observacoes_resolucao?: string | null; fornecedor_id?: string | null },
): Promise<Result> {
  const supabase = createClient();
  const payload: Record<string, unknown> = { status };
  if (extras?.custo !== undefined) payload.custo = extras.custo;
  if (extras?.observacoes_resolucao !== undefined) payload.observacoes_resolucao = extras.observacoes_resolucao;
  if (extras?.fornecedor_id !== undefined) payload.fornecedor_id = extras.fornecedor_id;
  const { error } = await supabase.from('manutencoes').update(payload).eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/admin/manutencao');
  revalidatePath(`/admin/manutencao/${id}`);
  return { ok: true };
}

export async function excluirManutencao(id: string): Promise<Result> {
  const supabase = createClient();
  const { error } = await supabase.from('manutencoes').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/admin/manutencao');
  return { ok: true };
}

export async function salvarFornecedor(form: {
  id?: string;
  nome: string;
  especialidade?: string;
  telefone?: string;
  email?: string;
  pix?: string;
  observacoes?: string;
  ativo?: boolean;
}): Promise<Result> {
  if (!form.nome.trim()) return { ok: false, error: 'Nome obrigatório' };
  const supabase = createClient();
  const payload = {
    nome: form.nome.trim(),
    especialidade: form.especialidade?.trim() || null,
    telefone: form.telefone?.trim() || null,
    email: form.email?.trim() || null,
    pix: form.pix?.trim() || null,
    observacoes: form.observacoes?.trim() || null,
    ativo: form.ativo ?? true,
  };
  const { error } = form.id
    ? await supabase.from('fornecedores_manutencao').update(payload).eq('id', form.id)
    : await supabase.from('fornecedores_manutencao').insert(payload);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/admin/manutencao/fornecedores');
  return { ok: true };
}

export async function excluirFornecedor(id: string): Promise<Result> {
  const supabase = createClient();
  const { error } = await supabase.from('fornecedores_manutencao').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/admin/manutencao/fornecedores');
  return { ok: true };
}
