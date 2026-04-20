/**
 * Feed público iCal por imóvel×canal.
 * URL: /ical/<token>  (token gerado em ical_feeds.url_export_token)
 *
 * Use esta URL nos settings do Airbnb ("Import calendar") e Booking,
 * para que vejam as datas bloqueadas pelas outras fontes.
 *
 * Não exige autenticação — o token é a credencial.
 */
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { buildIcal, type IcalEvento } from '@/lib/ical/build';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(_req: Request, { params }: { params: { token: string } }) {
  // Service role para ignorar RLS (feed público, já autenticado pelo token)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const { data: feed } = await supabase
    .from('ical_feeds')
    .select('id, imovel_id, canal, ativo, imovel:imoveis(codigo, endereco)')
    .eq('url_export_token', params.token)
    .maybeSingle();

  if (!feed || !feed.ativo) {
    return new NextResponse('Feed não encontrado ou inativo', { status: 404 });
  }

  // Exporta estadas confirmadas/em andamento do imóvel, exceto as que vieram
  // do MESMO canal (evita loop: Airbnb não precisa receber de volta o que
  // ele já nos enviou).
  const { data: estadas } = await supabase
    .from('estadas')
    .select('id, codigo, data_checkin, data_checkout, canal, status, hospede:hospedes(nome)')
    .eq('imovel_id', feed.imovel_id)
    .in('status', ['confirmada', 'checkin', 'checkout'])
    .neq('canal', feed.canal)
    .gte('data_checkout', new Date().toISOString().slice(0, 10));

  const eventos: IcalEvento[] = (estadas ?? []).map((e: any) => ({
    uid: e.id,
    dataCheckin: e.data_checkin,
    dataCheckout: e.data_checkout,
    summary: `Reservado (ALVA ${e.canal})`,
    description: `${e.codigo}${e.hospede?.nome ? ` — ${e.hospede.nome}` : ''}`,
  }));

  const imovel = Array.isArray(feed.imovel) ? feed.imovel[0] : feed.imovel;
  const calName = `ALVA Rent — ${imovel?.codigo ?? 'imóvel'} (${feed.canal})`;
  const ics = buildIcal(calName, eventos);

  return new NextResponse(ics, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Cache-Control': 'public, max-age=300', // 5 min
      'Content-Disposition': `inline; filename="alva-${imovel?.codigo ?? feed.imovel_id}-${feed.canal}.ics"`,
    },
  });
}
