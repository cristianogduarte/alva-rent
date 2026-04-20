/**
 * POST /api/webhooks/inter
 *
 * Recebe eventos de pagamento da API Cobrança do Banco Inter.
 * Faz baixa automática dos boletos e registra no histórico.
 */
import { NextResponse } from 'next/server';
import { verifyInterSignature } from '@/lib/inter/webhook';
import { createAdminClient } from '@/lib/supabase/admin';
import type { InterWebhookEvent } from '@/lib/inter/types';

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get('x-inter-signature');

  if (!verifyInterSignature(rawBody, signature)) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 403 });
  }

  let events: InterWebhookEvent[];
  try {
    const parsed = JSON.parse(rawBody);
    events = Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }

  const supabase = createAdminClient();
  let processados = 0;

  for (const evt of events) {
    if (evt.situacao !== 'PAGO' && evt.situacao !== 'RECEBIDO' && evt.situacao !== 'MARCADO_RECEBIDO') {
      continue;
    }

    const { data: boleto, error } = await supabase
      .from('boletos')
      .update({
        status: 'pago',
        data_pagamento: evt.dataHoraSituacao,
        valor_pago: evt.valorTotalRecebido ?? evt.valorNominal,
        forma_pagamento: evt.origemRecebimento ?? 'BOLETO',
        webhook_payload: evt,
      })
      .eq('inter_codigo_solic', evt.codigoSolicitacao)
      .select('id, contrato_id, valor_total')
      .maybeSingle();

    if (!error && boleto) {
      await supabase.from('historico').insert({
        contrato_id: boleto.contrato_id,
        tipo: 'boleto_pago',
        titulo: 'Boleto pago',
        descricao: `Pago via ${evt.origemRecebimento ?? 'BOLETO'} em ${evt.dataHoraSituacao}`,
        metadata: { codigoSolicitacao: evt.codigoSolicitacao, valor: evt.valorTotalRecebido },
      });
      processados++;
      continue;
    }

    // Fallback: tenta casar com estada_pagamento (reservas diretas short-stay)
    const { data: pagto } = await supabase
      .from('estada_pagamentos')
      .update({
        status: 'pago',
        data_pagamento: evt.dataHoraSituacao,
      })
      .eq('inter_cobranca_id', evt.codigoSolicitacao)
      .select('id, estada_id')
      .maybeSingle();

    if (pagto) {
      await supabase
        .from('estadas')
        .update({ status: 'confirmada' })
        .eq('id', pagto.estada_id);
      processados++;
      continue;
    }

    console.error('[inter-webhook] cobrança não encontrada', evt.codigoSolicitacao);
  }

  return NextResponse.json({ ok: true, processados });
}
