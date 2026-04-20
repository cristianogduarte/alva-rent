import { createClient } from '@/lib/supabase/server';
import { brl, formatDate } from '@/lib/utils';

export const metadata = { title: 'Repasses — Portal do Proprietário' };
export const dynamic = 'force-dynamic';

export default async function RepassesProprietarioPage({
  searchParams,
}: {
  searchParams: { mes?: string };
}) {
  const supabase = createClient();

  const hoje = new Date();
  const mes = searchParams.mes ?? `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;

  let q = supabase
    .from('repasses')
    .select(`
      id, valor_bruto, valor_taxa, valor_liquido, status, data_repasse, forma_repasse, observacoes, created_at,
      boleto:boletos (competencia, contrato:contratos(imovel:imoveis(codigo))),
      estada_pagamento:estada_pagamentos (estada:estadas(codigo, imovel:imoveis(codigo)))
    `)
    .order('created_at', { ascending: false });

  if (mes && mes !== 'todos') {
    const [y, m] = mes.split('-').map(Number);
    const ini = `${mes}-01`;
    const fim = new Date(y, m, 1).toISOString().slice(0, 10);
    q = q.gte('created_at', ini).lt('created_at', fim);
  }

  const { data: repasses } = await q;

  const bruto = (repasses ?? []).reduce((s, r) => s + Number(r.valor_bruto), 0);
  const taxa = (repasses ?? []).reduce((s, r) => s + Number(r.valor_taxa), 0);
  const liquido = (repasses ?? []).reduce((s, r) => s + Number(r.valor_liquido), 0);
  const pendente = (repasses ?? [])
    .filter((r) => r.status === 'pendente')
    .reduce((s, r) => s + Number(r.valor_liquido), 0);

  return (
    <div className="px-5 md:px-8 py-6 max-w-6xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-navy-900">Extrato de repasses</h1>
          <p className="text-sm text-ink-500">Competência {mes === 'todos' ? 'todas' : mes}</p>
        </div>
        <form method="GET" className="flex gap-2 items-center text-sm">
          <input
            type="month"
            name="mes"
            defaultValue={mes === 'todos' ? '' : mes}
            className="px-3 py-1.5 border border-navy-100 rounded-lg"
          />
          <button className="px-3 py-1.5 border border-navy-100 rounded-lg hover:bg-navy-50 text-xs">OK</button>
          <a href="?mes=todos" className="text-xs text-ink-500 hover:underline">todas</a>
        </form>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-5">
        <Kpi label="Receita bruta" value={brl(bruto)} />
        <Kpi label="Taxa ALVA" value={brl(taxa)} tone="indigo" />
        <Kpi label="Repasse líquido" value={brl(liquido)} tone="emerald" />
        <Kpi label="Pendente" value={brl(pendente)} tone={pendente > 0 ? 'amber' : 'navy'} />
      </div>

      <div className="bg-white rounded-xl shadow-soft overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-navy-50 text-ink-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-3 font-semibold">Data</th>
              <th className="text-left px-4 py-3 font-semibold">Origem</th>
              <th className="text-right px-4 py-3 font-semibold">Bruto</th>
              <th className="text-right px-4 py-3 font-semibold">Taxa</th>
              <th className="text-right px-4 py-3 font-semibold">Líquido</th>
              <th className="text-center px-4 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {(repasses ?? []).length === 0 && (
              <tr><td colSpan={6} className="text-center text-ink-500 py-10">
                Nenhum repasse no período.
              </td></tr>
            )}
            {(repasses ?? []).map((r: any) => {
              const bol = Array.isArray(r.boleto) ? r.boleto[0] : r.boleto;
              const ep = Array.isArray(r.estada_pagamento) ? r.estada_pagamento[0] : r.estada_pagamento;
              let origem = '—';
              if (bol) {
                const c = Array.isArray(bol.contrato) ? bol.contrato[0] : bol.contrato;
                const im = c && (Array.isArray(c.imovel) ? c.imovel[0] : c.imovel);
                origem = `${im?.codigo ?? '—'} · long-stay ${bol.competencia}`;
              } else if (ep) {
                const est = Array.isArray(ep.estada) ? ep.estada[0] : ep.estada;
                const im = est && (Array.isArray(est.imovel) ? est.imovel[0] : est.imovel);
                origem = `${im?.codigo ?? '—'} · estada ${est?.codigo ?? ''}`;
              }
              return (
                <tr key={r.id} className="border-t border-navy-50">
                  <td className="px-4 py-3 text-xs">{formatDate(r.data_repasse ?? r.created_at)}</td>
                  <td className="px-4 py-3 text-xs">{origem}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{brl(Number(r.valor_bruto))}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-ink-500">{brl(Number(r.valor_taxa))}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-semibold">{brl(Number(r.valor_liquido))}</td>
                  <td className="px-4 py-3 text-center">
                    {r.status === 'pago' ? (
                      <span className="text-xs text-emerald-700 font-medium">✓ pago</span>
                    ) : r.status === 'pendente' ? (
                      <span className="text-xs text-amber-700 font-medium">pendente</span>
                    ) : (
                      <span className="text-xs text-ink-500">{r.status}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  tone = 'navy',
}: {
  label: string;
  value: string;
  tone?: 'navy' | 'indigo' | 'amber' | 'emerald';
}) {
  const cls =
    tone === 'indigo' ? 'text-indigo-700'
    : tone === 'emerald' ? 'text-emerald-700'
    : tone === 'amber' ? 'text-amber-700'
    : 'text-navy-900';
  return (
    <div className="bg-white rounded-xl p-3 md:p-4 shadow-soft">
      <div className="text-[10px] md:text-xs text-ink-500 uppercase font-semibold">{label}</div>
      <div className={`text-base md:text-xl font-bold mt-1 ${cls}`}>{value}</div>
    </div>
  );
}
