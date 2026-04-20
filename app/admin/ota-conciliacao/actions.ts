'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { parseOtaCsv, type Canal, type LinhaPayout } from '@/lib/ota/csv';

export interface PreviewLinha extends LinhaPayout {
  estada_id: string | null;
  estada_codigo: string | null;
  imovel_codigo: string | null;
  proprietario_id: string | null;
  taxa_administracao_pct: number;
  ja_conciliada: boolean;
}

type Preview = {
  ok: true;
  canal: Canal;
  arquivo: string;
  linhas: PreviewLinha[];
  resumo: { total: number; conciliaveis: number; orfas: number; jaConciliadas: number };
} | { ok: false; error: string };

export async function previewImport(
  _prev: Preview | null,
  formData: FormData
): Promise<Preview> {
  const canal = String(formData.get('canal') ?? '') as Canal;
  if (canal !== 'airbnb' && canal !== 'booking') {
    return { ok: false, error: 'Canal inválido' };
  }
  const file = formData.get('arquivo') as File | null;
  if (!file || file.size === 0) return { ok: false, error: 'Selecione o CSV' };

  const text = await file.text();
  const linhas = parseOtaCsv(canal, text);
  if (linhas.length === 0) {
    return { ok: false, error: 'CSV vazio ou formato não reconhecido' };
  }

  const supabase = createClient();
  // Casa com estadas existentes via (canal, canal_reserva_id)
  const codigos = linhas.map((l) => l.canal_reserva_id).filter(Boolean) as string[];
  const { data: estadas } = await supabase
    .from('estadas')
    .select('id, codigo, canal_reserva_id, taxa_administracao_pct, imovel:imoveis(codigo, proprietario_id)')
    .eq('canal', canal)
    .in('canal_reserva_id', codigos);

  // Paygouts já importados (para marcar como duplicada)
  const { data: jaImportados } = await supabase
    .from('ota_payouts')
    .select('referencia_externa')
    .eq('canal', canal)
    .in('referencia_externa', linhas.map((l) => l.referencia_externa).filter(Boolean) as string[]);
  const setImportados = new Set((jaImportados ?? []).map((p) => p.referencia_externa));

  const byCode = new Map<string, any>();
  for (const e of estadas ?? []) byCode.set(e.canal_reserva_id!, e);

  const previewLinhas: PreviewLinha[] = linhas.map((l) => {
    const e = l.canal_reserva_id ? byCode.get(l.canal_reserva_id) : null;
    const im = e ? (Array.isArray(e.imovel) ? e.imovel[0] : e.imovel) : null;
    return {
      ...l,
      estada_id: e?.id ?? null,
      estada_codigo: e?.codigo ?? null,
      imovel_codigo: im?.codigo ?? null,
      proprietario_id: im?.proprietario_id ?? null,
      taxa_administracao_pct: Number(e?.taxa_administracao_pct ?? 10),
      ja_conciliada: l.referencia_externa ? setImportados.has(l.referencia_externa) : false,
    };
  });

  const conciliaveis = previewLinhas.filter((l) => l.estada_id && !l.ja_conciliada).length;
  const orfas = previewLinhas.filter((l) => !l.estada_id && !l.ja_conciliada).length;
  const jaC = previewLinhas.filter((l) => l.ja_conciliada).length;

  return {
    ok: true,
    canal,
    arquivo: file.name,
    linhas: previewLinhas,
    resumo: { total: previewLinhas.length, conciliaveis, orfas, jaConciliadas: jaC },
  };
}

type ApplyResult =
  | { ok: true; criadas: number; conciliadas: number; repasses: number }
  | { ok: false; error: string };

export async function aplicarImport(
  _prev: ApplyResult | null,
  formData: FormData
): Promise<ApplyResult> {
  const payload = String(formData.get('payload') ?? '');
  const arquivo = String(formData.get('arquivo') ?? '');
  let linhas: PreviewLinha[];
  try {
    linhas = JSON.parse(payload);
  } catch {
    return { ok: false, error: 'Payload inválido' };
  }

  const supabase = createClient();
  let criadas = 0;
  let conciliadas = 0;
  let repassesCriados = 0;

  for (const l of linhas) {
    if (l.ja_conciliada) continue;

    // 1. Cria ota_payout
    const { data: payout, error: pe } = await supabase
      .from('ota_payouts')
      .insert({
        canal: l.canal,
        data_payout: l.data_payout || new Date().toISOString().slice(0, 10),
        valor_bruto: l.valor_bruto,
        valor_liquido: l.valor_liquido,
        taxa_plataforma: l.taxa_plataforma,
        referencia_externa: l.referencia_externa,
        arquivo_origem: arquivo,
        observacoes: l.observacoes,
      })
      .select('id')
      .single();
    if (pe || !payout) continue;
    criadas++;

    // 2. Se casou com estada: cria estada_pagamento + liga + cria repasse
    if (l.estada_id) {
      const { data: pag, error: pge } = await supabase
        .from('estada_pagamentos')
        .insert({
          estada_id: l.estada_id,
          tipo: 'total',
          valor: l.valor_liquido, // o que a ALVA recebeu de fato
          data_pagamento: l.data_payout,
          forma: l.canal === 'airbnb' ? 'airbnb_payout' : 'booking_payout',
          status: 'pago',
          payout_ref: l.referencia_externa,
        })
        .select('id')
        .single();
      if (pge || !pag) continue;

      await supabase.from('ota_payouts').update({ estada_pagamento_id: pag.id }).eq('id', payout.id);
      conciliadas++;

      // 3. Gera repasse ao proprietário (valor líquido × (1 - taxa adm))
      if (l.proprietario_id) {
        const bruto = l.valor_liquido; // base do cálculo = o que efetivamente entrou
        const pct = Number(l.taxa_administracao_pct);
        const taxa = +(bruto * (pct / 100)).toFixed(2);
        const liquido = +(bruto - taxa).toFixed(2);

        const { error: re } = await supabase.from('repasses').insert({
          boleto_id: null,
          estada_pagamento_id: pag.id,
          proprietario_id: l.proprietario_id,
          valor_bruto: bruto,
          taxa_administracao_pct: pct,
          valor_taxa: taxa,
          valor_liquido: liquido,
          status: 'pendente',
          observacoes: `Conciliação ${l.canal.toUpperCase()} ${arquivo}`,
        });
        if (!re) repassesCriados++;
      }
    }
  }

  revalidatePath('/admin/ota-conciliacao');
  revalidatePath('/admin/estadas');
  return { ok: true, criadas, conciliadas, repasses: repassesCriados };
}
