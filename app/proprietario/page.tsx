import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { brl, formatDate } from '@/lib/utils';

export const metadata = { title: 'Dashboard — Portal do Proprietário' };
export const dynamic = 'force-dynamic';

export default async function DashboardProprietarioPage() {
  const supabase = createClient();

  // RLS garante que só retorna dados do proprietário logado
  const [{ data: imoveis }, { data: estadasProx }, { data: repassesRec }] = await Promise.all([
    supabase.from('imoveis').select('id, codigo, modalidade, status'),
    supabase
      .from('estadas')
      .select('id, codigo, data_checkin, data_checkout, valor_total, canal, status, imovel:imoveis(codigo), hospede:hospedes(nome)')
      .gte('data_checkout', new Date().toISOString().slice(0, 10))
      .order('data_checkin')
      .limit(10),
    supabase
      .from('repasses')
      .select('id, valor_bruto, valor_liquido, valor_taxa, status, data_repasse, created_at')
      .order('created_at', { ascending: false })
      .limit(50),
  ]);

  const hoje = new Date();
  const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
  const mesAntDate = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
  const mesAnt = `${mesAntDate.getFullYear()}-${String(mesAntDate.getMonth() + 1).padStart(2, '0')}`;

  const noMes = (mes: string) =>
    (repassesRec ?? []).filter((r) => (r.created_at ?? '').slice(0, 7) === mes);
  const somaLiq = (lst: any[]) => lst.reduce((s, r) => s + Number(r.valor_liquido), 0);

  const receitaAtual = somaLiq(noMes(mesAtual));
  const receitaAnt = somaLiq(noMes(mesAnt));
  const pendente = (repassesRec ?? [])
    .filter((r) => r.status === 'pendente')
    .reduce((s, r) => s + Number(r.valor_liquido), 0);

  const imLong = (imoveis ?? []).filter((i) => i.modalidade === 'long_stay').length;
  const imShort = (imoveis ?? []).filter((i) => i.modalidade === 'short_stay').length;

  return (
    <div className="px-5 md:px-8 py-6 max-w-6xl mx-auto">
      <h1 className="text-xl md:text-2xl font-bold text-navy-900 mb-1">Visão geral</h1>
      <p className="text-sm text-ink-500 mb-6">
        Dados em tempo real da sua carteira no ALVA Rent.
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
        <Kpi label="Receita líquida do mês" value={brl(receitaAtual)} sub={`Mês anterior: ${brl(receitaAnt)}`} tone="emerald" />
        <Kpi label="Pendente de pagamento" value={brl(pendente)} tone={pendente > 0 ? 'amber' : 'navy'} />
        <Kpi label="Imóveis long-stay" value={String(imLong)} />
        <Kpi label="Imóveis short-stay" value={String(imShort)} />
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        {/* Próximas estadas */}
        <div className="bg-white rounded-xl p-4 md:p-5 shadow-soft">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold">Próximas estadas</h2>
            <Link href="/proprietario/calendario" className="text-xs text-navy-900 hover:underline">
              ver calendário →
            </Link>
          </div>
          {(estadasProx ?? []).length === 0 ? (
            <p className="text-sm text-ink-400 py-6 text-center">Nenhuma estada nos próximos dias.</p>
          ) : (
            <ul className="divide-y divide-navy-50">
              {(estadasProx ?? []).map((e: any) => {
                const im = Array.isArray(e.imovel) ? e.imovel[0] : e.imovel;
                const h = Array.isArray(e.hospede) ? e.hospede[0] : e.hospede;
                return (
                  <li key={e.id} className="py-2.5 text-sm flex justify-between gap-3">
                    <div>
                      <div className="font-medium">{im?.codigo}</div>
                      <div className="text-xs text-ink-500">
                        {h?.nome ?? '—'} · {e.canal}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs">
                        {formatDate(e.data_checkin)} → {formatDate(e.data_checkout)}
                      </div>
                      <div className="text-xs font-semibold text-emerald-700 tabular-nums">
                        {brl(Number(e.valor_total ?? 0))}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Últimos repasses */}
        <div className="bg-white rounded-xl p-4 md:p-5 shadow-soft">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold">Últimos repasses</h2>
            <Link href="/proprietario/repasses" className="text-xs text-navy-900 hover:underline">
              ver extrato →
            </Link>
          </div>
          {(repassesRec ?? []).slice(0, 8).length === 0 ? (
            <p className="text-sm text-ink-400 py-6 text-center">Nenhum repasse.</p>
          ) : (
            <ul className="divide-y divide-navy-50">
              {(repassesRec ?? []).slice(0, 8).map((r: any) => (
                <li key={r.id} className="py-2.5 text-sm flex justify-between">
                  <div>
                    <div className="text-xs text-ink-500">
                      {formatDate(r.data_repasse ?? r.created_at)}
                    </div>
                    <div className="text-[10px]">
                      {r.status === 'pago' ? (
                        <span className="text-emerald-700 font-medium">✓ pago</span>
                      ) : r.status === 'pendente' ? (
                        <span className="text-amber-700 font-medium">pendente</span>
                      ) : (
                        <span className="text-ink-400">{r.status}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold tabular-nums">{brl(Number(r.valor_liquido))}</div>
                    <div className="text-[10px] text-ink-500">
                      bruto {brl(Number(r.valor_bruto))}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  sub,
  tone = 'navy',
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: 'navy' | 'emerald' | 'amber';
}) {
  const cls =
    tone === 'emerald' ? 'text-emerald-700' : tone === 'amber' ? 'text-amber-700' : 'text-navy-900';
  return (
    <div className="bg-white rounded-xl p-4 shadow-soft">
      <div className="text-[10px] md:text-xs text-ink-500 uppercase font-semibold">{label}</div>
      <div className={`text-lg md:text-xl font-bold mt-1 ${cls}`}>{value}</div>
      {sub && <div className="text-[10px] text-ink-400 mt-1">{sub}</div>}
    </div>
  );
}
