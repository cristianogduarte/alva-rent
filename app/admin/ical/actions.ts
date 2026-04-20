'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { parseIcal } from '@/lib/ical/parse';

type Result = { ok: true; msg?: string } | { ok: false; error: string };

export async function upsertFeed(
  _prev: Result | null,
  formData: FormData
): Promise<Result> {
  const imovel_id = String(formData.get('imovel_id') ?? '');
  const canal = String(formData.get('canal') ?? '');
  const url_import = String(formData.get('url_import') ?? '').trim() || null;
  const ativo = formData.get('ativo') === 'on';

  if (!imovel_id || !['airbnb', 'booking', 'outro'].includes(canal)) {
    return { ok: false, error: 'Imóvel e canal são obrigatórios' };
  }

  const supabase = createClient();
  const { error } = await supabase
    .from('ical_feeds')
    .upsert(
      { imovel_id, canal, url_import, ativo, updated_at: new Date().toISOString() },
      { onConflict: 'imovel_id,canal' }
    );

  if (error) return { ok: false, error: error.message };

  revalidatePath('/admin/ical');
  return { ok: true, msg: 'Feed salvo' };
}

export async function excluirFeed(id: string): Promise<Result> {
  const supabase = createClient();
  const { error } = await supabase.from('ical_feeds').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/admin/ical');
  return { ok: true };
}

/**
 * Sincroniza manualmente um feed: busca a url_import, parseia, cria/atualiza
 * estadas com canal correspondente e status=confirmada.
 *
 * Airbnb/Booking só expõem UID + datas + "Reserved/Not available" — nome do
 * hóspede vem depois via email parsing (Etapa 4.5).
 */
export async function sincronizarFeed(feedId: string): Promise<Result> {
  const supabase = createClient();

  const { data: feed, error: fe } = await supabase
    .from('ical_feeds')
    .select('id, imovel_id, canal, url_import, imovel:imoveis(codigo)')
    .eq('id', feedId)
    .maybeSingle();

  if (fe || !feed) return { ok: false, error: 'Feed não encontrado' };
  if (!feed.url_import) return { ok: false, error: 'URL de import não configurada' };

  let raw: string;
  try {
    const res = await fetch(feed.url_import, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    raw = await res.text();
  } catch (e: any) {
    await supabase
      .from('ical_feeds')
      .update({ ultimo_erro: e.message, ultima_sincronizacao: new Date().toISOString() })
      .eq('id', feedId);
    return { ok: false, error: `Erro ao buscar feed: ${e.message}` };
  }

  const eventos = parseIcal(raw);

  // Ignora eventos passados (já saiu) e blocks "curtos demais" (geralmente
  // são placeholders como "Not available" que o Airbnb põe).
  const hoje = new Date().toISOString().slice(0, 10);
  const imovel = Array.isArray(feed.imovel) ? feed.imovel[0] : feed.imovel;
  const imovelCodigo = imovel?.codigo ?? 'XX';

  let criadas = 0;
  let atualizadas = 0;

  for (const e of eventos) {
    if (e.dtend <= hoje) continue;
    if (e.dtend <= e.dtstart) continue;

    // Chave de idempotência: canal + UID externo → canal_reserva_id
    const canal_reserva_id = e.uid;

    const { data: existing } = await supabase
      .from('estadas')
      .select('id')
      .eq('imovel_id', feed.imovel_id)
      .eq('canal', feed.canal)
      .eq('canal_reserva_id', canal_reserva_id)
      .maybeSingle();

    if (existing) {
      // atualiza datas/status caso mudaram
      await supabase
        .from('estadas')
        .update({
          data_checkin: e.dtstart,
          data_checkout: e.dtend,
          status: 'confirmada',
        })
        .eq('id', existing.id);
      atualizadas++;
    } else {
      const yyyymm = e.dtstart.slice(0, 7).replace('-', '');
      const codigo = `EST-${imovelCodigo}-${yyyymm}-${canal_reserva_id.slice(-6).toUpperCase()}`;
      await supabase.from('estadas').insert({
        codigo,
        imovel_id: feed.imovel_id,
        hospede_id: null, // nome vem no email parsing (Etapa 4.5)
        data_checkin: e.dtstart,
        data_checkout: e.dtend,
        numero_hospedes: 1,
        valor_diaria: 0,
        valor_total: 0,
        canal: feed.canal,
        canal_reserva_id,
        status: 'confirmada',
        taxa_administracao_pct: 10,
        observacoes: `Importado via iCal ${feed.canal}${e.summary ? ` — ${e.summary}` : ''}`,
      });
      criadas++;
    }
  }

  await supabase
    .from('ical_feeds')
    .update({
      ultima_sincronizacao: new Date().toISOString(),
      ultimo_erro: null,
    })
    .eq('id', feedId);

  revalidatePath('/admin/ical');
  revalidatePath('/admin/estadas');
  revalidatePath('/admin/estadas/calendario');
  return { ok: true, msg: `Sync OK — ${criadas} criadas, ${atualizadas} atualizadas` };
}
