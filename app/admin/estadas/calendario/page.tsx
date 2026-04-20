import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export const metadata = { title: 'Calendário multi-imóvel' };
export const dynamic = 'force-dynamic';

const canalCores: Record<string, string> = {
  airbnb: 'bg-rose-500 text-white',
  booking: 'bg-sky-500 text-white',
  direto: 'bg-emerald-500 text-white',
  outro: 'bg-ink-400 text-white',
};

const DIAS = 60;

export default async function CalendarioPage({
  searchParams,
}: {
  searchParams: { inicio?: string };
}) {
  const supabase = createClient();
  const hoje = searchParams.inicio ? new Date(searchParams.inicio) : new Date();
  hoje.setHours(0, 0, 0, 0);
  const dias = Array.from({ length: DIAS }, (_, i) => {
    const d = new Date(hoje);
    d.setDate(d.getDate() + i);
    return d;
  });
  const inicioStr = dias[0].toISOString().slice(0, 10);
  const fimStr = dias[DIAS - 1].toISOString().slice(0, 10);

  const { data: imoveis } = await supabase
    .from('imoveis')
    .select('id, codigo, endereco')
    .eq('modalidade', 'short_stay')
    .order('codigo');

  const { data: estadas } = await supabase
    .from('estadas')
    .select('id, codigo, imovel_id, data_checkin, data_checkout, canal, status, hospede:hospedes(nome), valor_total')
    .in('status', ['pre_reservada', 'confirmada', 'checkin', 'checkout'])
    .lte('data_checkin', fimStr)
    .gte('data_checkout', inicioStr);

  // Prev/next nav
  const prev = new Date(hoje); prev.setDate(prev.getDate() - DIAS);
  const next = new Date(hoje); next.setDate(next.getDate() + DIAS);

  return (
    <div className="px-8 py-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-xs uppercase tracking-wider text-ink-400 font-semibold">Short Stay</div>
          <h1 className="text-2xl font-bold text-navy-900">Calendário multi-imóvel</h1>
          <p className="text-sm text-ink-500">
            {dias[0].toLocaleDateString('pt-BR')} → {dias[DIAS - 1].toLocaleDateString('pt-BR')} · {imoveis?.length ?? 0} unidades
          </p>
        </div>
        <div className="flex gap-2 items-center text-sm">
          <Link href={`/admin/estadas/calendario?inicio=${prev.toISOString().slice(0,10)}`} className="px-3 py-1.5 border border-navy-100 rounded-lg hover:bg-navy-50">← {DIAS}d</Link>
          <Link href="/admin/estadas/calendario" className="px-3 py-1.5 border border-navy-100 rounded-lg hover:bg-navy-50">Hoje</Link>
          <Link href={`/admin/estadas/calendario?inicio=${next.toISOString().slice(0,10)}`} className="px-3 py-1.5 border border-navy-100 rounded-lg hover:bg-navy-50">{DIAS}d →</Link>
        </div>
      </div>

      <div className="flex gap-4 text-xs mb-3">
        {Object.entries(canalCores).map(([c, cls]) => (
          <div key={c} className="flex items-center gap-1.5">
            <span className={`inline-block w-3 h-3 rounded ${cls.split(' ')[0]}`} />
            <span className="capitalize text-ink-600">{c}</span>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-soft overflow-auto">
        <div className="inline-block min-w-full">
          {/* Header */}
          <div className="flex sticky top-0 bg-navy-50 z-10 border-b border-navy-100">
            <div className="w-48 flex-shrink-0 px-3 py-2 text-xs font-semibold text-ink-500 uppercase border-r border-navy-100">
              Imóvel
            </div>
            {dias.map((d) => {
              const isToday = d.toDateString() === new Date().toDateString();
              const isWeekend = d.getDay() === 0 || d.getDay() === 6;
              return (
                <div
                  key={d.toISOString()}
                  className={`w-10 flex-shrink-0 text-center py-1 text-[10px] border-r border-navy-100 ${
                    isToday ? 'bg-amber-100 font-bold' : isWeekend ? 'bg-navy-100/40' : ''
                  }`}
                >
                  <div className="text-ink-400">{d.toLocaleDateString('pt-BR', { weekday: 'short' }).slice(0, 1).toUpperCase()}</div>
                  <div className="text-ink-900 font-semibold">{d.getDate()}</div>
                  {d.getDate() === 1 && (
                    <div className="text-[9px] text-ink-500">{d.toLocaleDateString('pt-BR', { month: 'short' })}</div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Rows */}
          {(imoveis ?? []).map((imovel: any) => {
            const doImovel = (estadas ?? []).filter((e: any) => e.imovel_id === imovel.id);
            return (
              <div key={imovel.id} className="flex border-b border-navy-50 relative h-12">
                <div className="w-48 flex-shrink-0 px-3 py-2 border-r border-navy-100 bg-white sticky left-0 z-[1]">
                  <div className="font-mono text-xs font-semibold text-navy-900">{imovel.codigo}</div>
                  <div className="text-[10px] text-ink-500 truncate">{imovel.endereco}</div>
                </div>
                {/* day cells */}
                <div className="flex relative">
                  {dias.map((d) => {
                    const isToday = d.toDateString() === new Date().toDateString();
                    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                    return (
                      <div
                        key={d.toISOString()}
                        className={`w-10 flex-shrink-0 border-r border-navy-50 ${
                          isToday ? 'bg-amber-50' : isWeekend ? 'bg-navy-50/30' : ''
                        }`}
                      />
                    );
                  })}
                  {/* estada bars positioned absolutely */}
                  {doImovel.map((e: any) => {
                    const ci = new Date(e.data_checkin);
                    const co = new Date(e.data_checkout);
                    const startIdx = Math.max(
                      0,
                      Math.floor((ci.getTime() - dias[0].getTime()) / 86400000)
                    );
                    const endIdx = Math.min(
                      DIAS,
                      Math.ceil((co.getTime() - dias[0].getTime()) / 86400000)
                    );
                    const width = endIdx - startIdx;
                    if (width <= 0) return null;
                    const cls = canalCores[e.canal] ?? canalCores.outro;
                    return (
                      <Link
                        key={e.id}
                        href={`/admin/estadas/${e.id}`}
                        title={`${e.codigo} · ${e.hospede?.nome ?? 'sem nome'} · ${e.data_checkin} → ${e.data_checkout}`}
                        className={`absolute top-1.5 h-9 rounded ${cls} text-[10px] px-1.5 py-1 overflow-hidden hover:opacity-80 shadow-soft ${
                          e.status === 'pre_reservada' ? 'opacity-60' : ''
                        }`}
                        style={{
                          left: `${startIdx * 40}px`,
                          width: `${width * 40 - 2}px`,
                        }}
                      >
                        <div className="truncate font-semibold">{e.hospede?.nome ?? e.codigo}</div>
                        <div className="truncate opacity-90 text-[9px]">{e.canal} · {e.status.replace('_', ' ')}</div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {(imoveis?.length ?? 0) === 0 && (
            <div className="p-10 text-center text-sm text-ink-500">
              Nenhum imóvel <strong>short_stay</strong> cadastrado.{' '}
              <Link href="/admin/imoveis" className="text-navy-900 underline">Cadastrar imóvel</Link>.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
