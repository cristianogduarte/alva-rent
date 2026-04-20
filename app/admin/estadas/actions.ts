'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  estadaSchema,
  hospedeSchema,
  pagamentoSchema,
  gerarCodigoEstada,
} from './schema';

type Result =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

// ==========================================================
// Helpers
// ==========================================================

function parseEstadaForm(formData: FormData) {
  const raw: Record<string, any> = {};
  for (const [key, value] of formData.entries()) raw[key] = value;
  return estadaSchema.safeParse(raw);
}

async function checarOverlap(
  supabase: any,
  imovelId: string,
  checkin: string,
  checkout: string,
  excluirId?: string
): Promise<string | null> {
  // Verifica se há outra estada confirmada/checkin/checkout no mesmo imóvel
  // cujo período se sobrepõe ao novo.
  let q = supabase
    .from('estadas')
    .select('id, codigo, data_checkin, data_checkout, status')
    .eq('imovel_id', imovelId)
    .in('status', ['confirmada', 'checkin', 'checkout'])
    .lt('data_checkin', checkout)
    .gt('data_checkout', checkin);
  if (excluirId) q = q.neq('id', excluirId);

  const { data } = await q;
  if (data && data.length > 0) {
    const conflito = data[0];
    return `Conflito com estada ${conflito.codigo} (${conflito.data_checkin} → ${conflito.data_checkout})`;
  }
  return null;
}

// ==========================================================
// CRUD Estada
// ==========================================================

export async function criarEstada(
  _prev: Result | null,
  formData: FormData
): Promise<Result> {
  const parsed = parseEstadaForm(formData);
  if (!parsed.success) {
    return {
      ok: false,
      error: 'Dados inválidos',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = createClient();
  const d = parsed.data;

  // 1. Checar overlap (só se for confirmada+)
  if (['confirmada', 'checkin', 'checkout'].includes(d.status)) {
    const conflito = await checarOverlap(
      supabase,
      d.imovel_id,
      d.data_checkin,
      d.data_checkout
    );
    if (conflito) return { ok: false, error: conflito };
  }

  // 2. Criar hóspede inline se necessário
  let hospedeId: string | null = d.hospede_id;
  if (!hospedeId && d.hospede_novo_nome) {
    const hospedeParsed = hospedeSchema.safeParse({
      nome: d.hospede_novo_nome,
      email: d.hospede_novo_email,
      telefone: d.hospede_novo_telefone,
      documento: d.hospede_novo_documento,
      origem: d.canal,
    });
    if (!hospedeParsed.success) {
      return { ok: false, error: 'Dados do hóspede inválidos' };
    }
    const { data: novoHospede, error: eh } = await supabase
      .from('hospedes')
      .insert(hospedeParsed.data)
      .select('id')
      .single();
    if (eh) return { ok: false, error: `Erro ao criar hóspede: ${eh.message}` };
    hospedeId = novoHospede.id;
  }

  // 3. Gerar código se vazio
  let codigo = d.codigo?.trim();
  if (!codigo) {
    const { data: imovel } = await supabase
      .from('imoveis')
      .select('codigo')
      .eq('id', d.imovel_id)
      .single();
    codigo = gerarCodigoEstada(imovel?.codigo ?? 'XX', d.data_checkin);
  }

  // 4. Inserir estada
  const { data: estada, error } = await supabase
    .from('estadas')
    .insert({
      codigo,
      imovel_id: d.imovel_id,
      hospede_id: hospedeId,
      data_checkin: d.data_checkin,
      data_checkout: d.data_checkout,
      numero_hospedes: d.numero_hospedes,
      valor_diaria: d.valor_diaria,
      valor_total: d.valor_total,
      taxa_limpeza: d.taxa_limpeza,
      taxa_plataforma: d.taxa_plataforma,
      canal: d.canal,
      canal_reserva_id: d.canal_reserva_id,
      status: d.status,
      taxa_administracao_pct: d.taxa_administracao_pct,
      observacoes: d.observacoes,
    })
    .select('id')
    .single();

  if (error) return { ok: false, error: error.message };

  revalidatePath('/admin/estadas');
  revalidatePath('/admin/calendario');
  redirect(`/admin/estadas/${estada.id}`);
}

export async function atualizarEstada(
  id: string,
  _prev: Result | null,
  formData: FormData
): Promise<Result> {
  const parsed = parseEstadaForm(formData);
  if (!parsed.success) {
    return {
      ok: false,
      error: 'Dados inválidos',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = createClient();
  const d = parsed.data;

  if (['confirmada', 'checkin', 'checkout'].includes(d.status)) {
    const conflito = await checarOverlap(
      supabase,
      d.imovel_id,
      d.data_checkin,
      d.data_checkout,
      id
    );
    if (conflito) return { ok: false, error: conflito };
  }

  // Hóspede inline (mesma lógica do criar)
  let hospedeId: string | null = d.hospede_id;
  if (!hospedeId && d.hospede_novo_nome) {
    const hospedeParsed = hospedeSchema.safeParse({
      nome: d.hospede_novo_nome,
      email: d.hospede_novo_email,
      telefone: d.hospede_novo_telefone,
      documento: d.hospede_novo_documento,
      origem: d.canal,
    });
    if (hospedeParsed.success) {
      const { data: novo } = await supabase
        .from('hospedes')
        .insert(hospedeParsed.data)
        .select('id')
        .single();
      hospedeId = novo?.id ?? null;
    }
  }

  const { error } = await supabase
    .from('estadas')
    .update({
      imovel_id: d.imovel_id,
      hospede_id: hospedeId,
      data_checkin: d.data_checkin,
      data_checkout: d.data_checkout,
      numero_hospedes: d.numero_hospedes,
      valor_diaria: d.valor_diaria,
      valor_total: d.valor_total,
      taxa_limpeza: d.taxa_limpeza,
      taxa_plataforma: d.taxa_plataforma,
      canal: d.canal,
      canal_reserva_id: d.canal_reserva_id,
      status: d.status,
      taxa_administracao_pct: d.taxa_administracao_pct,
      observacoes: d.observacoes,
    })
    .eq('id', id);

  if (error) return { ok: false, error: error.message };

  revalidatePath('/admin/estadas');
  revalidatePath(`/admin/estadas/${id}`);
  revalidatePath('/admin/calendario');
  redirect(`/admin/estadas/${id}`);
}

export async function excluirEstada(id: string): Promise<Result> {
  const supabase = createClient();

  const { count } = await supabase
    .from('estada_pagamentos')
    .select('id', { count: 'exact', head: true })
    .eq('estada_id', id)
    .eq('status', 'pago');

  if (count && count > 0) {
    return {
      ok: false,
      error: 'Estada tem pagamentos registrados — cancele ao invés de excluir.',
    };
  }

  const { error } = await supabase.from('estadas').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/admin/estadas');
  revalidatePath('/admin/calendario');
  redirect('/admin/estadas');
}

// ==========================================================
// Pagamentos
// ==========================================================

export async function criarPagamento(
  estadaId: string,
  _prev: Result | null,
  formData: FormData
): Promise<Result> {
  const raw: Record<string, any> = {};
  for (const [k, v] of formData.entries()) raw[k] = v;
  const parsed = pagamentoSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: 'Dados inválidos',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = createClient();
  const { error } = await supabase.from('estada_pagamentos').insert({
    estada_id: estadaId,
    ...parsed.data,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/admin/estadas/${estadaId}`);
  return { ok: true };
}

export async function marcarPagamentoPago(
  pagamentoId: string,
  estadaId: string
): Promise<Result> {
  const supabase = createClient();
  const { error } = await supabase
    .from('estada_pagamentos')
    .update({
      status: 'pago',
      data_pagamento: new Date().toISOString().slice(0, 10),
    })
    .eq('id', pagamentoId);

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/admin/estadas/${estadaId}`);
  return { ok: true };
}
