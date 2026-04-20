'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { gerarResposta, type ContextoEstada, type MsgHistorico } from '@/lib/ai/responder';

type Result<T = unknown> = { ok: true; data?: T } | { ok: false; error: string };

export async function registrarMensagem(
  estadaId: string,
  origem: 'hospede' | 'admin' | 'ia',
  canal: 'whatsapp' | 'email' | 'airbnb' | 'booking' | 'sms' | 'manual',
  texto: string,
  autor?: string,
): Promise<Result> {
  if (!texto.trim()) return { ok: false, error: 'Mensagem vazia' };
  const supabase = createClient();
  const { error } = await supabase.from('estada_mensagens').insert({
    estada_id: estadaId,
    origem,
    canal,
    texto,
    status: origem === 'admin' ? 'enviada' : 'recebida',
    autor: autor ?? null,
    lida: origem !== 'hospede',
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath('/admin/inbox');
  return { ok: true };
}

export async function marcarLida(estadaId: string): Promise<Result> {
  const supabase = createClient();
  const { error } = await supabase
    .from('estada_mensagens')
    .update({ lida: true })
    .eq('estada_id', estadaId)
    .eq('origem', 'hospede')
    .eq('lida', false);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/admin/inbox');
  return { ok: true };
}

export async function arquivarThread(estadaId: string): Promise<Result> {
  const supabase = createClient();
  const { error } = await supabase
    .from('estada_mensagens')
    .update({ status: 'arquivada' })
    .eq('estada_id', estadaId);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/admin/inbox');
  return { ok: true };
}

export async function gerarRascunhoIA(
  estadaId: string,
): Promise<Result<{ texto: string; modo: 'real' | 'stub' }>> {
  const supabase = createClient();

  const { data: estada } = await supabase
    .from('estadas')
    .select(`
      id, codigo, data_checkin, data_checkout, canal,
      hospede:hospedes (nome),
      imovel:imoveis (
        codigo, endereco, numero, bairro, cidade, checkin_time, checkout_time,
        hospedagem:imovel_hospedagem (wifi_ssid, wifi_senha, codigo_fechadura, instrucoes_acesso, regras_casa)
      )
    `)
    .eq('id', estadaId)
    .maybeSingle();
  if (!estada) return { ok: false, error: 'Estada não encontrada' };

  const { data: msgs } = await supabase
    .from('estada_mensagens')
    .select('id, origem, texto, created_at')
    .eq('estada_id', estadaId)
    .neq('status', 'arquivada')
    .order('created_at', { ascending: true })
    .limit(30);

  const h: any = Array.isArray(estada.hospede) ? estada.hospede[0] : estada.hospede;
  const im: any = Array.isArray(estada.imovel) ? estada.imovel[0] : estada.imovel;
  const hosp: any = im && (Array.isArray(im.hospedagem) ? im.hospedagem[0] : im.hospedagem);

  const ultimaDoHospede = [...(msgs ?? [])]
    .reverse()
    .find((m: any) => m.origem === 'hospede');
  if (!ultimaDoHospede) {
    return { ok: false, error: 'Nenhuma mensagem do hóspede pra responder' };
  }

  const ctx: ContextoEstada = {
    codigo: estada.codigo,
    hospede_nome: h?.nome ?? 'Hóspede',
    imovel_codigo: im?.codigo ?? '',
    imovel_endereco: `${im?.endereco ?? ''}, ${im?.numero ?? ''} · ${im?.bairro ?? ''}`,
    data_checkin: estada.data_checkin,
    data_checkout: estada.data_checkout,
    canal: estada.canal,
    wifi_ssid: hosp?.wifi_ssid,
    wifi_senha: hosp?.wifi_senha,
    codigo_fechadura: hosp?.codigo_fechadura,
    instrucoes_acesso: hosp?.instrucoes_acesso,
    regras_casa: hosp?.regras_casa,
    checkin_time: im?.checkin_time,
    checkout_time: im?.checkout_time,
  };

  const historico: MsgHistorico[] = (msgs ?? [])
    .filter((m: any) => m.id !== ultimaDoHospede.id)
    .map((m: any) => ({ origem: m.origem, texto: m.texto, created_at: m.created_at }));

  const r = await gerarResposta(ctx, historico, (ultimaDoHospede as any).texto);
  if (!r.ok) return { ok: false, error: r.error };

  // Salva como rascunho pra admin revisar
  await supabase.from('estada_mensagens').insert({
    estada_id: estadaId,
    origem: 'ia',
    canal: 'manual',
    texto: r.texto,
    status: 'rascunho',
    lida: true,
  });

  revalidatePath('/admin/inbox');
  return { ok: true, data: { texto: r.texto, modo: r.modo } };
}

export async function aprovarRascunho(mensagemId: string): Promise<Result> {
  const supabase = createClient();
  const { error } = await supabase
    .from('estada_mensagens')
    .update({ status: 'enviada' })
    .eq('id', mensagemId)
    .eq('status', 'rascunho');
  if (error) return { ok: false, error: error.message };
  revalidatePath('/admin/inbox');
  return { ok: true };
}

export async function excluirRascunho(mensagemId: string): Promise<Result> {
  const supabase = createClient();
  const { error } = await supabase
    .from('estada_mensagens')
    .delete()
    .eq('id', mensagemId)
    .eq('status', 'rascunho');
  if (error) return { ok: false, error: error.message };
  revalidatePath('/admin/inbox');
  return { ok: true };
}
