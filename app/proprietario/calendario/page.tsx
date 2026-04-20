import { createClient } from '@/lib/supabase/server';

export const metadata = { title: 'Calendário — Portal do Proprietário' };
export const dynamic = 'force-dynamic';

const canalCor: Record<string, string> = {
  airbnb: 'bg-rose-500',
  booking: 'bg-sky-500',
  direto: 'bg-emerald-500',
  outro: 'bg-ink-400',
};

const DIAS = 60;
const CELL = 36;

export default async function CalendarioProprietarioPage() {
  const supabase = createClient();

  const { data: imoveis } = await supabase
    .from('imoveis')
    .select('id, codigo, modalidade')
    .eq('modalidade', 'short_stay')
    .order('codigo');

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const fim = new Date(hoje);
  fim.setDate(fim.getDate() + DIAS);

  const { data: estadas } = await supabase
    .from('estadas')
    .select('id, imovel_id, data_checkin, data_checkout, canal, hospede:hospedes(nome)')
    .neq('status', 'cancelada')
    .gte('data_checkout', hoje.toISOString().slice(0, 10))
    .lte('data_checkin', fim.toISOString().slice(0, 10));

  const dias: Date[] = [];
  for (let i = 0; i < DIAS; i++) {
    const d = new Date(hoje);
    d.setDate(d.getDate() + i);
    dias.push(d);
  }
  const diaIndex = (iso: string) => {
    const d = new Date(iso);
    d.setHours(0, 0, 0, 0);
    return Math.round((d.getTime() - hoje.getTime()) / 86400000);
  };

  return (
    <div className="px-3 md:px-8 py-6 max-w-full">
      <h1 className="text-xl md:text-2xl font-bold text-navy-900 mb-1">Calendário (60 dias)</h1>
      <p className="text-sm text-ink-500 mb-4">
        Reservas confirmadas em todos seus imóveis short-stay. Cores por canal.
      </p>

      <div className="flex gap-3 mb-4 text-xs flex-wrap">
        <Legend cor="bg-rose-500" label="Airbnb" />
        <Legend cor="bg-sky-500" label="Booking" />
        <Legend cor="bg-emerald-500" label="Direto" />
        <Legend cor="bg-ink-400" label="Outro" />
      </div>

      <div className="bg-white rounded-xl shadow-soft overflow-x-auto">
        <div style={{ minWidth: 180 + DIAS * CELL }}>
          {/* Header dias */}
          <div className="flex border-b border-navy-100 sticky top-0 bg-white z-10">
            <div className="w-[180px] shrink-0 px-3 py-2 text-xs font-semibold text-ink-500 uppercase">
              Imóvel
            </div>
            <div className="flex">
              {dias.map((d, i) => {
                const isHoje = i === 0;
                const weekend = d.getDay() === 0 || d.getDay() === 6;
                return (
                  <div
                    key={i}
                    style={{ width: CELL }}
                    className={`shrink-0 text-center text-[10px] py-2 border-l border-navy-50 ${
                      isHoje ? 'bg-amber-50 font-bold' : weekend ? 'bg-navy-50/50' : ''
                    }`}
                  >
                    <div className="text-ink-400">{d.toLocaleDateString('pt-BR', { weekday: 'short' }).slice(0, 3)}</div>
                    <div>{d.getDate()}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {(imoveis ?? []).length === 0 && (
            <div className="px-3 py-8 text-sm text-ink-400 text-center">
              Nenhum imóvel short-stay cadastrado.
            </div>
          )}

          {(imoveis ?? []).map((im) => {
            const doImovel = (estadas ?? []).filter((e) => e.imovel_id === im.id);
            return (
              <div key={im.id} className="flex border-b border-navy-50 h-12 relative">
                <div className="w-[180px] shrink-0 px-3 py-2 flex flex-col justify-center">
                  <div className="text-sm font-medium">{im.codigo}</div>
                </div>
                <div className="flex-1 relative">
                  {doImovel.map((e: any) => {
                    const startIdx = Math.max(0, diaIndex(e.data_checkin));
                    const endIdx = Math.min(DIAS, diaIndex(e.data_checkout));
                    if (endIdx <= 0 || startIdx >= DIAS) return null;
                    const h = Array.isArray(e.hospede) ? e.hospede[0] : e.hospede;
                    const cor = canalCor[e.canal] ?? 'bg-ink-400';
                    return (
                      <div
                        key={e.id}
                        title={`${h?.nome ?? '—'} · ${e.canal}`}
                        style={{
                          left: startIdx * CELL + 2,
                          width: (endIdx - startIdx) * CELL - 4,
                          top: 6,
                          height: CELL,
                        }}
                        className={`absolute ${cor} rounded-lg text-white text-[10px] px-2 py-1 overflow-hidden shadow-sm`}
                      >
                        {h?.nome ?? e.canal}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Legend({ cor, label }: { cor: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`w-3 h-3 rounded ${cor}`} />
      <span className="text-ink-500">{label}</span>
    </div>
  );
}
