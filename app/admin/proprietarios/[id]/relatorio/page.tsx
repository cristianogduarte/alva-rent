import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { brl, formatDate, formatCpf } from '@/lib/utils';
import { PrintButton } from '@/app/admin/relatorios/print-button';

export const metadata = { title: 'Relatório consolidado por proprietário' };
export const dynamic = 'force-dynamic';

export default async function RelatorioConsolidadoPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { mes?: string; ini?: string; fim?: string; modalidade?: string };
}) {
  const supabase = createClient();
  const { data: prop } = await supabase
    .from('proprietarios')
    .select('*')
    .eq('id', params.id)
    .maybeSingle();
  if (!prop) notFound();

  // Período
  const hoje = new Date();
  const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
  const mes = searchParams.mes ?? (searchParams.ini ? '' : mesAtual);
  let ini: string, fim: string;
  if (mes) {
    const [y, m] = mes.split('-').map(Number);
    ini = `${mes}-01`;
    fim = new Date(y, m, 1).toISOString().slice(0, 10);
  } else {
    ini = searchParams.ini ?? `${hoje.getFullYear()}-01-01`;
    fim = searchParams.fim ?? `${hoje.getFullYear()}-12-31`;
  }
  const modalidade = searchParams.modalidade ?? 'todos';

  // Imóveis do proprietário
  let imoveisQ = supabase
    .from('imoveis')
    .select('id, codigo, endereco, bairro, cidade, modalidade')
    .eq('proprietario_id', params.id);
  if (modalidade !== 'todos') imoveisQ = imoveisQ.eq('modalidade', modalidade);
  const { data: imoveis } = await imoveisQ.order('codigo');
  const imovelIds = (imoveis ?? []).map((i) => i.id);

  // Repasses no período
  const { data: repasses } = await supabase
    .from('repasses')
    .select(`
      id, valor_bruto, valor_taxa, valor_liquido, status, data_repasse, created_at, observacoes,
      boleto:boletos (id, competencia, contrato:contratos(codigo, imovel_id)),
      estada_pagamento:estada_pagamentos (id, estada:estadas(codigo, imovel_id, canal, data_checkin, data_checkout))
    `)
    .eq('proprietario_id', params.id)
    .gte('created_at', ini)
    .lt('created_at', fim)
    .order('created_at', { ascending: true });

  // Organiza por imóvel
  const porImovel = new Map<string, { bruto: number; taxa: number; liquido: number; qtd: number; modalidade: string }>();
  for (const i of imoveis ?? []) {
    porImovel.set(i.id, { bruto: 0, taxa: 0, liquido: 0, qtd: 0, modalidade: i.modalidade });
  }
  for (const r of repasses ?? []) {
    const bol: any = Array.isArray(r.boleto) ? r.boleto[0] : r.boleto;
    const ep: any = Array.isArray(r.estada_pagamento) ? r.estada_pagamento[0] : r.estada_pagamento;
    const estada = ep?.estada ? (Array.isArray(ep.estada) ? ep.estada[0] : ep.estada) : null;
    const contrato = bol?.contrato ? (Array.isArray(bol.contrato) ? bol.contrato[0] : bol.contrato) : null;
    const imovelId = estada?.imovel_id ?? contrato?.imovel_id;
    if (!imovelId || !porImovel.has(imovelId)) continue;
    const agg = porImovel.get(imovelId)!;
    agg.bruto += Number(r.valor_bruto);
    agg.taxa += Number(r.valor_taxa);
    agg.liquido += Number(r.valor_liquido);
    agg.qtd += 1;
  }

  const totalBruto = [...porImovel.values()].reduce((s, v) => s + v.bruto, 0);
  const totalTaxa = [...porImovel.values()].reduce((s, v) => s + v.taxa, 0);
  const totalLiquido = [...porImovel.values()].reduce((s, v) => s + v.liquido, 0);

  const pagos = (repasses ?? []).filter((r) => r.status === 'pago');
  const pendentes = (repasses ?? []).filter((r) => r.status === 'pendente');

  const periodoLabel = mes
    ? `Competência ${mes}`
    : `${formatDate(ini)} a ${formatDate(fim)}`;

  return (
    <div className="px-8 py-6 max-w-5xl print:max-w-full print:px-4 print:py-2">
      {/* Toolbar — esconde no print */}
      <div className="print:hidden flex items-center justify-between mb-4">
        <Link href={`/admin/proprietarios/${params.id}`} className="text-sm text-navy-900 hover:underline">← Voltar</Link>
        <div className="flex items-center gap-2">
          <form method="GET" className="flex gap-2 text-xs items-center">
            <input type="month" name="mes" defaultValue={mes} className="px-2 py-1 border border-navy-100 rounded" />
            <select name="modalidade" defaultValue={modalidade} className="px-2 py-1 border border-navy-100 rounded">
              <option value="todos">Todas modalidades</option>
              <option value="long_stay">Long stay</option>
              <option value="short_stay">Short stay</option>
            </select>
            <button type="submit" className="px-3 py-1 border border-navy-100 rounded hover:bg-navy-50">Filtrar</button>
          </form>
          <PrintButton label="🖨 Imprimir / PDF" />
        </div>
      </div>

      {/* Cabeçalho do relatório */}
      <header className="mb-6 pb-4 border-b-2 border-navy-900">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs uppercase tracking-wider text-ink-500 font-semibold">
              ALVA Rent — Demonstrativo de Repasse
            </div>
            <h1 className="text-2xl font-bold text-navy-900 mt-1">{prop.nome}</h1>
            <div className="text-xs text-ink-500 mt-0.5">
              {prop.cpf_cnpj ? formatCpf(prop.cpf_cnpj) : '—'}
              {prop.email && ` · ${prop.email}`}
            </div>
          </div>
          <div className="text-right text-xs text-ink-500">
            <div>{periodoLabel}</div>
            <div>Emitido em {formatDate(new Date().toISOString().slice(0, 10))}</div>
            <div className="mt-1 capitalize">Modalidade: {modalidade.replace('_', ' ')}</div>
          </div>
        </div>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <Kpi label="Receita bruta" value={brl(totalBruto)} />
        <Kpi label="Taxa ALVA" value={brl(totalTaxa)} tone="indigo" />
        <Kpi label="Repasse líquido" value={brl(totalLiquido)} tone="emerald" />
        <Kpi label="Imóveis ativos" value={String(imoveis?.length ?? 0)} />
      </div>

      {/* Detalhamento por imóvel */}
      <section className="mb-6">
        <h2 className="text-sm font-semibold text-navy-900 mb-2 uppercase tracking-wider">
          Por imóvel
        </h2>
        <table className="w-full text-sm bg-white rounded-xl overflow-hidden shadow-soft print:shadow-none">
          <thead className="bg-navy-50 text-xs uppercase text-ink-500">
            <tr>
              <th className="text-left px-3 py-2">Código</th>
              <th className="text-left px-3 py-2">Endereço</th>
              <th className="text-center px-3 py-2">Modalidade</th>
              <th className="text-center px-3 py-2">Repasses</th>
              <th className="text-right px-3 py-2">Bruto</th>
              <th className="text-right px-3 py-2">Taxa ALVA</th>
              <th className="text-right px-3 py-2">Líquido</th>
            </tr>
          </thead>
          <tbody>
            {(imoveis ?? []).map((i) => {
              const agg = porImovel.get(i.id)!;
              return (
                <tr key={i.id} className="border-t border-navy-50">
                  <td className="px-3 py-2 font-mono text-xs">{i.codigo}</td>
                  <td className="px-3 py-2 text-xs">{i.endereco}{i.bairro ? ` · ${i.bairro}` : ''}</td>
                  <td className="px-3 py-2 text-center text-xs capitalize">{i.modalidade?.replace('_', ' ')}</td>
                  <td className="px-3 py-2 text-center">{agg.qtd}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{brl(agg.bruto)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-ink-500">{brl(agg.taxa)}</td>
                  <td className="px-3 py-2 text-right tabular-nums font-semibold">{brl(agg.liquido)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="border-t-2 border-navy-100 bg-navy-50/30">
            <tr>
              <td colSpan={4} className="px-3 py-2 font-semibold">Total</td>
              <td className="px-3 py-2 text-right tabular-nums font-bold">{brl(totalBruto)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{brl(totalTaxa)}</td>
              <td className="px-3 py-2 text-right tabular-nums font-bold text-navy-900">{brl(totalLiquido)}</td>
            </tr>
          </tfoot>
        </table>
      </section>

      {/* Extrato de repasses */}
      <section className="mb-6">
        <h2 className="text-sm font-semibold text-navy-900 mb-2 uppercase tracking-wider">
          Extrato de repasses ({(repasses ?? []).length})
        </h2>
        <table className="w-full text-xs bg-white rounded-xl overflow-hidden shadow-soft print:shadow-none">
          <thead className="bg-navy-50 uppercase text-ink-500">
            <tr>
              <th className="text-left px-3 py-2">Data</th>
              <th className="text-left px-3 py-2">Origem</th>
              <th className="text-right px-3 py-2">Bruto</th>
              <th className="text-right px-3 py-2">Taxa</th>
              <th className="text-right px-3 py-2">Líquido</th>
              <th className="text-center px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {(repasses ?? []).length === 0 && (
              <tr><td colSpan={6} className="text-center text-ink-500 py-6">Sem movimento no período.</td></tr>
            )}
            {repasses?.map((r: any) => {
              const bol: any = Array.isArray(r.boleto) ? r.boleto[0] : r.boleto;
              const ep: any = Array.isArray(r.estada_pagamento) ? r.estada_pagamento[0] : r.estada_pagamento;
              const estada = ep?.estada ? (Array.isArray(ep.estada) ? ep.estada[0] : ep.estada) : null;
              const contrato = bol?.contrato ? (Array.isArray(bol.contrato) ? bol.contrato[0] : bol.contrato) : null;
              const origem =
                estada ? `Short — ${estada.codigo} (${estada.canal})`
                : contrato ? `Long — ${contrato.codigo} comp ${bol.competencia?.slice(0, 7)}`
                : '—';
              return (
                <tr key={r.id} className="border-t border-navy-50">
                  <td className="px-3 py-1.5">{formatDate(r.data_repasse ?? r.created_at?.slice(0,10))}</td>
                  <td className="px-3 py-1.5">{origem}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{brl(Number(r.valor_bruto))}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-ink-500">{brl(Number(r.valor_taxa))}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums font-semibold">{brl(Number(r.valor_liquido))}</td>
                  <td className="px-3 py-1.5 text-center capitalize">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                      r.status === 'pago' ? 'bg-emerald-50 text-emerald-700' :
                      r.status === 'pendente' ? 'bg-amber-50 text-amber-700' :
                      'bg-ink-100 text-ink-600'
                    }`}>{r.status}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="mt-2 text-xs text-ink-500">
          {pagos.length} pagos · {pendentes.length} pendentes
        </div>
      </section>

      <footer className="mt-10 pt-4 border-t border-navy-100 text-[10px] text-ink-400 text-center print:fixed print:bottom-4 print:left-0 print:right-0">
        ALVA Rent · ALVA ONE · Documento emitido eletronicamente em {new Date().toLocaleString('pt-BR')}
      </footer>
    </div>
  );
}

function Kpi({ label, value, tone = 'navy' }: { label: string; value: string; tone?: 'navy' | 'indigo' | 'emerald' }) {
  const c =
    tone === 'indigo' ? 'text-indigo-700'
    : tone === 'emerald' ? 'text-emerald-700'
    : 'text-navy-900';
  return (
    <div className="bg-white rounded-xl p-3 shadow-soft print:border print:shadow-none">
      <div className="text-[10px] text-ink-500 uppercase font-semibold">{label}</div>
      <div className={`text-lg font-bold mt-0.5 ${c}`}>{value}</div>
    </div>
  );
}
