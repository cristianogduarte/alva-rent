import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { brl } from '@/lib/utils';
import { PrintButton } from '../print-button';

export const metadata = { title: 'Relatório — Empresa' };
export const dynamic = 'force-dynamic';

function parsePeriodo(sp: { de?: string; ate?: string; ano?: string }) {
  if (sp.de && sp.ate) return { de: sp.de, ate: sp.ate, label: `${sp.de} a ${sp.ate}` };
  const ano = Number(sp.ano ?? new Date().getFullYear());
  return { de: `${ano}-01-01`, ate: `${ano}-12-31`, label: `Ano ${ano}` };
}

export default async function EmpresaRel({ searchParams }: { searchParams: any }) {
  const { de, ate, label } = parsePeriodo(searchParams);
  const supabase = createClient();

  const [
    { data: boletosPagos },
    { data: contratosAtivos },
    { data: proprietarios },
    { data: imoveis },
    { data: boletosVencidos },
  ] = await Promise.all([
    supabase
      .from('boletos')
      .select('valor_pago, valor_total, contrato:contratos(taxa_administracao_pct, imovel:imoveis(proprietario_id))')
      .eq('status', 'pago')
      .gte('data_pagamento', de)
      .lte('data_pagamento', ate),
    supabase
      .from('contratos')
      .select('valor_aluguel, taxa_administracao_pct, imovel:imoveis(proprietario_id)')
      .eq('status', 'ativo'),
    supabase.from('proprietarios').select('id, nome'),
    supabase.from('imoveis').select('id, status'),
    supabase.from('boletos').select('valor_total').eq('status', 'vencido'),
  ]);

  const totalRecebido = (boletosPagos ?? []).reduce((s, b: any) => s + Number(b.valor_pago ?? b.valor_total), 0);
  const taxaRetida = (boletosPagos ?? []).reduce((s, b: any) => {
    const taxa = Number(b.contrato?.taxa_administracao_pct ?? 10);
    return s + Number(b.valor_pago ?? b.valor_total) * (taxa / 100);
  }, 0);
  const repassado = totalRecebido - taxaRetida;

  const mrr = (contratosAtivos ?? []).reduce((s, c) => s + Number(c.valor_aluguel), 0);
  const inadimplencia = (boletosVencidos ?? []).reduce((s, b) => s + Number(b.valor_total), 0);

  const totImv = imoveis?.length ?? 0;
  const alugados = (imoveis ?? []).filter((i) => i.status === 'alugado').length;
  const ocupacao = totImv ? Math.round((alugados / totImv) * 100) : 0;

  // Agrega por proprietário (dentro do período)
  const nomePorProp = Object.fromEntries((proprietarios ?? []).map((p) => [p.id, p.nome]));
  const porProp = new Map<string, { recebido: number; taxa: number }>();
  for (const b of (boletosPagos ?? []) as any[]) {
    const pid = b.contrato?.imovel?.proprietario_id;
    if (!pid) continue;
    const val = Number(b.valor_pago ?? b.valor_total);
    const taxa = val * (Number(b.contrato?.taxa_administracao_pct ?? 10) / 100);
    const cur = porProp.get(pid) ?? { recebido: 0, taxa: 0 };
    cur.recebido += val;
    cur.taxa += taxa;
    porProp.set(pid, cur);
  }

  const anos = [new Date().getFullYear(), new Date().getFullYear() - 1, new Date().getFullYear() - 2];

  return (
    <div className="px-8 py-6 print:px-0 print:py-0">
      <nav aria-label="Breadcrumb" className="text-xs text-ink-400 mb-2 print:hidden">
        <Link href="/admin/dashboard" className="hover:underline">Admin</Link>
        <span className="mx-1.5">/</span>
        <Link href="/admin/relatorios" className="hover:underline">Relatórios</Link>
        <span className="mx-1.5">/</span>
        <span className="text-ink-500">Empresa</span>
      </nav>

      <div className="flex items-end justify-between mb-6">
        <div>
          <div className="text-xs uppercase tracking-wider text-ink-400 font-semibold">Gestão</div>
          <h1 className="text-2xl font-bold text-navy-900">Relatório da empresa</h1>
          <p className="text-sm text-ink-500">Período: {label}</p>
        </div>
        <div className="flex items-center gap-2 print:hidden">
          <form className="flex items-center gap-2">
            <label className="text-xs text-ink-500">Ano:</label>
            <select
              name="ano"
              defaultValue={searchParams.ano ?? new Date().getFullYear()}
              className="text-sm border border-navy-100 rounded-md px-2 py-1 bg-white"
            >
              {anos.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
            <button type="submit" className="text-xs px-3 py-1.5 bg-navy-900 text-white rounded-md font-semibold">
              aplicar
            </button>
          </form>
          <PrintButton />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <KPI label="Faturamento recebido" value={brl(totalRecebido)} hint="boletos pagos no período" />
        <KPI label="Taxa ALVA retida" value={brl(taxaRetida)} hint="receita da administradora" tone="primary" />
        <KPI label="Repassado aos proprietários" value={brl(repassado)} />
        <KPI label="MRR ativo" value={brl(mrr)} hint="contratos vigentes hoje" />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <KPI label="Inadimplência atual" value={brl(inadimplencia)} hint="boletos vencidos hoje" tone={inadimplencia > 0 ? 'danger' : 'default'} />
        <KPI label="Ocupação" value={`${ocupacao}%`} hint={`${alugados} de ${totImv} imóveis alugados`} />
      </div>

      <div className="bg-white rounded-xl shadow-soft overflow-hidden">
        <div className="px-6 py-4 border-b border-navy-50">
          <h2 className="text-base font-semibold text-navy-900">Por proprietário — período</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-navy-50/40 text-ink-500 text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left px-4 py-3 font-semibold">Proprietário</th>
              <th className="text-right px-4 py-3 font-semibold">Recebido</th>
              <th className="text-right px-4 py-3 font-semibold">Taxa ALVA</th>
              <th className="text-right px-4 py-3 font-semibold">Repassado</th>
            </tr>
          </thead>
          <tbody>
            {porProp.size === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-sm text-ink-500">
                  Sem boletos pagos no período.
                </td>
              </tr>
            ) : (
              [...porProp.entries()].map(([pid, v]) => (
                <tr key={pid} className="border-t border-navy-50">
                  <td className="px-4 py-3 font-semibold text-navy-900">{nomePorProp[pid] ?? pid}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{brl(v.recebido)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-ink-600">{brl(v.taxa)}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-semibold">{brl(v.recebido - v.taxa)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function KPI({
  label,
  value,
  hint,
  tone = 'default',
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: 'default' | 'primary' | 'danger';
}) {
  const toneCls = tone === 'danger' ? 'text-rose-600' : tone === 'primary' ? 'text-emerald-700' : 'text-navy-900';
  return (
    <div className="bg-white rounded-xl p-5 shadow-soft">
      <div className="text-xs text-ink-500 font-semibold uppercase">{label}</div>
      <div className={`text-2xl font-bold mt-1 tabular-nums ${toneCls}`}>{value}</div>
      {hint && <div className="text-xs text-ink-500 mt-1">{hint}</div>}
    </div>
  );
}
