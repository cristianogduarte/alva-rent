'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { emitirBoleto } from '@/lib/inter/cobranca';

export type ReservaResult =
  | { ok: true; estadaId: string; pagamentoId: string; codigoSolicitacao: string | null; modo: 'real' | 'stub'; valorTotal: number }
  | { ok: false; error: string };

interface Input {
  imovel_id: string;
  nome: string;
  email: string;
  telefone: string;
  documento: string;
  data_checkin: string; // YYYY-MM-DD
  data_checkout: string;
  num_hospedes: number;
}

export async function criarReservaDireta(input: Input): Promise<ReservaResult> {
  // Validações básicas
  if (!input.nome || !input.email || !input.data_checkin || !input.data_checkout) {
    return { ok: false, error: 'Preencha todos os campos obrigatórios' };
  }
  const ci = new Date(input.data_checkin);
  const co = new Date(input.data_checkout);
  if (co <= ci) return { ok: false, error: 'Check-out precisa ser após check-in' };
  const noites = Math.round((co.getTime() - ci.getTime()) / 86400000);
  if (noites < 1) return { ok: false, error: 'Estada mínima de 1 noite' };

  const supabase = createAdminClient();

  // Busca imóvel e valida modalidade
  const { data: imovel } = await supabase
    .from('imoveis')
    .select('id, codigo, modalidade, diaria_base, capacidade_hospedes, proprietario_id')
    .eq('id', input.imovel_id)
    .maybeSingle();
  if (!imovel) return { ok: false, error: 'Imóvel não encontrado' };
  if (imovel.modalidade !== 'short_stay') return { ok: false, error: 'Imóvel não disponível para temporada' };
  if (imovel.capacidade_hospedes && input.num_hospedes > imovel.capacidade_hospedes) {
    return { ok: false, error: `Capacidade máxima: ${imovel.capacidade_hospedes} hóspedes` };
  }

  const diaria = Number(imovel.diaria_base ?? 0);
  if (diaria <= 0) return { ok: false, error: 'Imóvel sem diária configurada' };

  // Checa overlap
  const { data: conflito } = await supabase
    .from('estadas')
    .select('id')
    .eq('imovel_id', imovel.id)
    .neq('status', 'cancelada')
    .lt('data_checkin', input.data_checkout)
    .gt('data_checkout', input.data_checkin)
    .limit(1);
  if (conflito && conflito.length > 0) {
    return { ok: false, error: 'Datas indisponíveis. Escolha outro período.' };
  }

  const valorTotal = diaria * noites;

  // Busca ou cria hóspede por email
  let hospedeId: string;
  const { data: hExist } = await supabase
    .from('hospedes')
    .select('id')
    .eq('email', input.email)
    .is('anonimizado_em', null)
    .maybeSingle();

  if (hExist) {
    hospedeId = hExist.id;
    await supabase
      .from('hospedes')
      .update({
        nome: input.nome,
        telefone: input.telefone,
        documento: input.documento || null,
      })
      .eq('id', hospedeId);
  } else {
    const { data: novo, error: he } = await supabase
      .from('hospedes')
      .insert({
        nome: input.nome,
        email: input.email,
        telefone: input.telefone,
        documento: input.documento || null,
        origem: 'direto',
      })
      .select('id')
      .single();
    if (he || !novo) return { ok: false, error: he?.message ?? 'Falha ao criar hóspede' };
    hospedeId = novo.id;
  }

  // Gera código da estada
  const codigoEstada = `EST-${imovel.codigo}-${Date.now().toString().slice(-6)}`;

  const { data: estada, error: ee } = await supabase
    .from('estadas')
    .insert({
      codigo: codigoEstada,
      imovel_id: imovel.id,
      hospede_id: hospedeId,
      data_checkin: input.data_checkin,
      data_checkout: input.data_checkout,
      valor_diaria: diaria,
      valor_total: valorTotal,
      canal: 'direto',
      status: 'pre_reservada',
    })
    .select('id')
    .single();
  if (ee || !estada) return { ok: false, error: ee?.message ?? 'Falha ao criar estada' };

  // Cria pagamento (sinal = total para simplificar v1)
  const { data: pagamento, error: pe } = await supabase
    .from('estada_pagamentos')
    .insert({
      estada_id: estada.id,
      tipo: 'saldo',
      valor: valorTotal,
      data_vencimento: new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 10),
      forma: 'pix',
      status: 'pendente',
    })
    .select('id')
    .single();
  if (pe || !pagamento) return { ok: false, error: pe?.message ?? 'Falha ao criar pagamento' };

  // Tenta emitir cobrança Inter (com fallback se credenciais não destravadas)
  const interEnabled = process.env.INTER_ENABLED === 'true';
  let codigoSolicitacao: string | null = null;
  let modo: 'real' | 'stub' = 'stub';

  if (interEnabled) {
    try {
      // seuNumero: 15 chars max — usa primeiros caracteres do pagamento_id
      const seuNumero = `R${pagamento.id.replace(/-/g, '').slice(0, 14)}`;
      const resp = await emitirBoleto({
        seuNumero,
        valor: valorTotal,
        dataVencimento: new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 10),
        pagador: {
          nome: input.nome,
          cpfCnpj: (input.documento || '').replace(/\D/g, '') || '00000000000',
          email: input.email,
          telefone: (input.telefone || '').replace(/\D/g, ''),
          tipoPessoa: 'FISICA',
          cep: '20000000',
          logradouro: 'Reserva direta',
          numero: 'S/N',
          bairro: 'Centro',
          cidade: 'Rio de Janeiro',
          uf: 'RJ',
        } as any,
        mensagem: `Reserva ${codigoEstada} — ALVA Rent`,
      });
      codigoSolicitacao = resp.codigoSolicitacao;
      modo = 'real';
      await supabase
        .from('estada_pagamentos')
        .update({ inter_cobranca_id: codigoSolicitacao })
        .eq('id', pagamento.id);
    } catch (e: any) {
      console.error('[reserva-direta] Inter falhou, mantendo em modo stub:', e.message);
    }
  }

  return {
    ok: true,
    estadaId: estada.id,
    pagamentoId: pagamento.id,
    codigoSolicitacao,
    modo,
    valorTotal,
  };
}
