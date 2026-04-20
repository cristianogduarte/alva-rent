'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { testarConexao, pullReservasRecentes, pushDisponibilidade } from '@/lib/booking/client';

type Result<T = unknown> = { ok: true; data?: T } | { ok: false; error: string };

async function carregarCreds() {
  const supabase = createClient();
  const { data } = await supabase
    .from('booking_credentials')
    .select('*')
    .eq('ativo', true)
    .maybeSingle();
  if (!data) return null;
  const senha = data.password_secret_ref ? process.env[data.password_secret_ref] ?? null : null;
  return {
    hotel_id: data.hotel_id,
    username: data.username,
    password: senha,
    base_url: data.base_url,
    _row_id: data.id,
  };
}

export async function salvarCredenciais(form: {
  hotel_id: string;
  username: string;
  password_secret_ref: string;
  base_url?: string;
  ativo: boolean;
}): Promise<Result> {
  if (!form.hotel_id.trim()) return { ok: false, error: 'hotel_id obrigatório' };
  const supabase = createClient();

  const { data: existente } = await supabase
    .from('booking_credentials')
    .select('id')
    .limit(1)
    .maybeSingle();

  const payload = {
    hotel_id: form.hotel_id.trim(),
    username: form.username.trim() || null,
    password_secret_ref: form.password_secret_ref.trim() || null,
    base_url: form.base_url?.trim() || 'https://supply-xml.booking.com',
    ativo: form.ativo,
  };

  const { error } = existente
    ? await supabase.from('booking_credentials').update(payload).eq('id', existente.id)
    : await supabase.from('booking_credentials').insert(payload);

  if (error) return { ok: false, error: error.message };
  revalidatePath('/admin/booking');
  return { ok: true };
}

export async function testarConexaoAction(): Promise<Result<{ modo: string }>> {
  const supabase = createClient();
  const creds = await carregarCreds();
  const r = await testarConexao(creds);

  await supabase.from('booking_sync_log').insert({
    operacao: 'test_conn',
    status: r.ok ? (r.modo === 'stub' ? 'stub' : 'ok') : 'erro',
    detalhes: r.ok ? { modo: r.modo } : { error: r.error },
  });

  if (creds?._row_id) {
    await supabase
      .from('booking_credentials')
      .update({
        ultimo_teste_em: new Date().toISOString(),
        ultimo_status: r.ok ? r.modo : 'erro',
      })
      .eq('id', creds._row_id);
  }

  revalidatePath('/admin/booking');
  if (!r.ok) return { ok: false, error: r.error };
  return { ok: true, data: { modo: r.modo } };
}

export async function vincularImovel(form: {
  imovel_id: string;
  room_id: string;
  rate_plan_id?: string;
}): Promise<Result> {
  if (!form.imovel_id || !form.room_id.trim()) {
    return { ok: false, error: 'Imóvel e room_id obrigatórios' };
  }
  const supabase = createClient();
  const { error } = await supabase.from('booking_room_mapping').insert({
    imovel_id: form.imovel_id,
    room_id: form.room_id.trim(),
    rate_plan_id: form.rate_plan_id?.trim() || null,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath('/admin/booking');
  return { ok: true };
}

export async function removerVinculo(id: string): Promise<Result> {
  const supabase = createClient();
  const { error } = await supabase.from('booking_room_mapping').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/admin/booking');
  return { ok: true };
}

export async function sincronizarAgora(): Promise<Result<{ novas: number; pushes: number; modo: string }>> {
  const supabase = createClient();
  const creds = await carregarCreds();

  // Pull reservas
  const pull = await pullReservasRecentes(creds);
  await supabase.from('booking_sync_log').insert({
    operacao: 'pull_reservas',
    status: pull.ok ? (pull.modo === 'stub' ? 'stub' : 'ok') : 'erro',
    detalhes: pull.ok ? pull.data : { error: pull.error },
  });

  // Push disponibilidade por imóvel mapeado
  const { data: mapeamentos } = await supabase
    .from('booking_room_mapping')
    .select('id, imovel_id, room_id')
    .eq('sincronizar_calendario', true);

  let pushes = 0;
  for (const m of mapeamentos ?? []) {
    const push = await pushDisponibilidade(creds, m.room_id, []);
    await supabase.from('booking_sync_log').insert({
      operacao: 'push_disponibilidade',
      imovel_id: m.imovel_id,
      status: push.ok ? (push.modo === 'stub' ? 'stub' : 'ok') : 'erro',
      detalhes: push.ok ? push.data : { error: push.error },
    });
    await supabase
      .from('booking_room_mapping')
      .update({
        ultima_sync_em: new Date().toISOString(),
        ultimo_erro: push.ok ? null : push.error,
      })
      .eq('id', m.id);
    if (push.ok) pushes++;
  }

  revalidatePath('/admin/booking');
  return {
    ok: true,
    data: {
      novas: pull.ok ? (pull.data as any).novas ?? 0 : 0,
      pushes,
      modo: pull.ok ? pull.modo : 'erro',
    },
  };
}
