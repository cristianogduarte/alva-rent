'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { parseEmailReserva, type ReservaExtraida } from '@/lib/email/parse-reservation';

type Result =
  | { ok: true; preview: ReservaExtraida; matchedEstadaId: string | null; matchedImovelId: string | null }
  | { ok: false; error: string };

/**
 * Parse sem aplicar — retorna preview + tenta casar com estada existente
 * via (canal, canal_reserva_id).
 */
export async function analisarEmail(
  _prev: Result | null,
  formData: FormData
): Promise<Result> {
  const raw = String(formData.get('email_text') ?? '').trim();
  if (raw.length < 30) return { ok: false, error: 'Cole o corpo do email completo' };

  const preview = parseEmailReserva(raw);

  let matchedEstadaId: string | null = null;
  let matchedImovelId: string | null = null;

  if (preview.canal_reserva_id && preview.canal !== 'desconhecido') {
    const supabase = createClient();
    const { data: estada } = await supabase
      .from('estadas')
      .select('id, imovel_id')
      .eq('canal', preview.canal)
      .eq('canal_reserva_id', preview.canal_reserva_id)
      .maybeSingle();
    if (estada) {
      matchedEstadaId = estada.id;
      matchedImovelId = estada.imovel_id;
    }
  }

  return { ok: true, preview, matchedEstadaId, matchedImovelId };
}

type ApplyResult = { ok: true; estadaId: string } | { ok: false; error: string };

/**
 * Aplica os dados extraídos:
 * - Se casou com estada existente (do iCal): cria/atualiza hóspede e vincula + preenche valor.
 * - Se NÃO casou mas admin selecionou um imóvel: cria uma estada nova com esses dados.
 */
export async function aplicarEmail(
  _prev: ApplyResult | null,
  formData: FormData
): Promise<ApplyResult> {
  const canal = String(formData.get('canal') ?? '');
  const canal_reserva_id = String(formData.get('canal_reserva_id') ?? '') || null;
  const hospede_nome = String(formData.get('hospede_nome') ?? '').trim() || null;
  const hospede_email = String(formData.get('hospede_email') ?? '').trim() || null;
  const hospede_telefone = String(formData.get('hospede_telefone') ?? '').trim() || null;
  const data_checkin = String(formData.get('data_checkin') ?? '') || null;
  const data_checkout = String(formData.get('data_checkout') ?? '') || null;
  const numero_hospedes = Number(formData.get('numero_hospedes') ?? 1);
  const valor_total = Number(formData.get('valor_total') ?? 0);
  const estada_id_existente = String(formData.get('estada_id_existente') ?? '') || null;
  const imovel_id_novo = String(formData.get('imovel_id_novo') ?? '') || null;

  if (!['airbnb', 'booking', 'direto', 'outro'].includes(canal)) {
    return { ok: false, error: 'Canal inválido' };
  }
  if (!hospede_nome) return { ok: false, error: 'Nome do hóspede obrigatório' };
  if (!data_checkin || !data_checkout) return { ok: false, error: 'Datas obrigatórias' };

  const supabase = createClient();

  // 1. Criar/atualizar hóspede (pelo nome — v1 simples; idealmente por email)
  let hospedeId: string | null = null;
  if (hospede_email) {
    const { data: existing } = await supabase
      .from('hospedes')
      .select('id')
      .eq('email', hospede_email)
      .maybeSingle();
    if (existing) hospedeId = existing.id;
  }

  if (!hospedeId) {
    const { data: novo, error: he } = await supabase
      .from('hospedes')
      .insert({
        nome: hospede_nome,
        email: hospede_email,
        telefone: hospede_telefone,
        origem: canal === 'direto' ? 'direto' : canal,
      })
      .select('id')
      .single();
    if (he) return { ok: false, error: `Erro ao criar hóspede: ${he.message}` };
    hospedeId = novo.id;
  } else {
    // complementa campos faltantes
    await supabase
      .from('hospedes')
      .update({
        telefone: hospede_telefone ?? undefined,
        origem: canal === 'direto' ? 'direto' : canal,
      })
      .eq('id', hospedeId);
  }

  // 2a. Atualizar estada existente
  if (estada_id_existente) {
    const { error: ue } = await supabase
      .from('estadas')
      .update({
        hospede_id: hospedeId,
        valor_total: valor_total || undefined,
        numero_hospedes: numero_hospedes || undefined,
        data_checkin,
        data_checkout,
      })
      .eq('id', estada_id_existente);
    if (ue) return { ok: false, error: ue.message };

    revalidatePath(`/admin/estadas/${estada_id_existente}`);
    revalidatePath('/admin/estadas');
    return { ok: true, estadaId: estada_id_existente };
  }

  // 2b. Criar nova estada (sem match no iCal)
  if (!imovel_id_novo) {
    return { ok: false, error: 'Selecione um imóvel para criar a estada' };
  }

  const { data: imovel } = await supabase
    .from('imoveis')
    .select('codigo')
    .eq('id', imovel_id_novo)
    .maybeSingle();
  const yyyymm = data_checkin.slice(0, 7).replace('-', '');
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  const codigo = `EST-${imovel?.codigo ?? 'XX'}-${yyyymm}-${rand}`;

  const { data: nova, error: ce } = await supabase
    .from('estadas')
    .insert({
      codigo,
      imovel_id: imovel_id_novo,
      hospede_id: hospedeId,
      data_checkin,
      data_checkout,
      numero_hospedes: numero_hospedes || 1,
      valor_diaria: 0,
      valor_total: valor_total || 0,
      canal,
      canal_reserva_id,
      status: 'confirmada',
      taxa_administracao_pct: 10,
      observacoes: 'Criada via import de email',
    })
    .select('id')
    .single();

  if (ce) return { ok: false, error: ce.message };

  revalidatePath('/admin/estadas');
  revalidatePath('/admin/estadas/calendario');
  return { ok: true, estadaId: nova.id };
}
