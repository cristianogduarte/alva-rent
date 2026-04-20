import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { brl, formatDate } from '@/lib/utils';
import { PrintButton } from '@/app/admin/relatorios/print-button';

export const metadata = { title: 'Relatório consolidado — Portal do Proprietário' };
export const dynamic = 'force-dynamic';

export default async function RelatorioProprietarioPage({
  searchParams,
}: {
  searchParams: { mes?: string; ini?: string; fim?: string; modalidade?: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/proprietario/relatorio');

  const { data: prop } = await supabase
    .from('proprietarios')
    .select('id, nome, cpf_cnpj, email')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!prop) redirect('/proprietario');

  const hoje = new Date();
  const mesDefault = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
  const mes = searchParams.mes ?? mesDefault;
  const modalidade = searchParams.modalidade ?? 'todos';

  let iniPeriodo: string;
  let fimPeriodo: string;
  if (searchParams.ini && searchParams.fim) {
    iniPeriodo = searchParams.ini;
    fimPeriodo = searchParams.fim;
  } else {
    const [y, m] = mes.split('-').map(Number);
    iniPeriodo = `${mes}-01`;
    fimPeriodo = new Date(y, m, 1).toISOString().slice(0, 10);
  }

  const { data: imoveis } = await supabase
    .from('imoveis')
    .select('id, codigo, modalidade, endereco, numero, bairro, cidade');

  let imoveisFiltrados = imoveis ?? [];
  if (modalidade !== 'todos') {
    imoveisFiltrados = imoveisFiltrados.filter((i) => i.modalidade === modalidade);
  }
  const imIds = imoveisFiltrados.map((i) => i.id);

  const { data: repasses } = await supabase
    .from('repasses')
    .select(`
      id, valor_bruto, valor_taxa, valor_liquido, status, data_repasse, created_at,
      boleto:boletos (competencia, contrato_id, contrato:contratos(imovel_id, imovel:imoveis(codigo))),
      estada_pagamento:estada_pagamentos (estada:estadas(codigo, imovel_id, imovel:imoveis(codigo)))
    `)
    .gte('created_at', iniPeriodo)
    .lt('created_at', fimPeriodo);

  // Filtra por imóvel
  const mapa = new Map<string, { codigo: string; modalidade: string; bruto: number; taxa: number; liquido: number; qtd: number }>();
  let totalBruto = 0;
  let totalTaxa = 0;
  let totalLiquido = 0;

  for (const r of repasses ?? []) {
    const bol: any = Array.isArray(r.boleto) ? r.boleto[0] : r.boleto;
    const ep: any = Array.isArray(r.estada_pagamento) ? r.estada_pagamento[0] : r.estada_pagamento;
    let imId: string | null = null;
    if (bol) {
      const c = Array.isArray(bol.contrato) ? bol.contrato[0] : bol.contrato;
      imId = c?.imovel_id ?? null;
    } else if (ep) {
      const est = Array.isArray(ep.estada) ? ep.estada[0] : ep.estada;
      imId = est?.imovel_id ?? null;
    }
    if (!imId || !imIds.includes(imId)) continue;

    const im = imoveisFiltrados.find((x) => x.id === imId)!;
    if (!mapa.has(imId)) {
      mapa.set(imId, {
        codigo: im.codigo,
        modalidade: im.modalidade,
        bruto: 0,
        taxa: 0,
        liquido: 0,
        qtd: 0,
      });
    }
    const linha = mapa.get(imId)!;
    linha.bruto += Number(r.valor_bruto);
    linha.taxa += Number(r.valor_taxa);
    linha.liquido += Number(r.valor_liquido);
    linha.qtd += 1;
    totalBruto += Number(r.valor_bruto);
    totalTaxa += Number(r.valor_taxa);
    totalLiquido += Number(r.valor_liquido);
  }

  const linhas = [...mapa.values()].sort((a, b) => b.liquido - a.liquido);

  return (
    <div className="px-5 md:px-8 py-6 max-w-5xl mx-auto print:max-w-full">
      <div className="flex items-center justify-between mb-6 print:hidden">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-navy-900">Relatório consolidado</h1>
          <p className="text-sm text-ink-500">
            {searchParams.ini && searchParams.fim
              ? `De ${formatDate(iniPeriodo)} a ${formatDate(new Date(new Date(fimPeriodo).getTime() - 86400000).toISOString().slice(0, 10))}`
              : `Competência ${mes}`}
          </p>
        </div>
        <PrintButton />
      </div>

      <form method="GET" className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 print:hidden text-sm">
        <div>
          <label className="text-xs text-ink-500 block mb-1">Mês</label>
          <input type="month" name="mes" defaultValue={mes} className="w-full px-3 py-1.5 border border-navy-100 rounded-lg" />
        </div>
        <div>
          <label className="text-xs text-ink-500 block mb-1">Ou início</label>
          <input type="date" name="ini" defaultValue={searchParams.ini ?? ''} className="w-full px-3 py-1.5 border border-navy-100 rounded-lg" />
        </div>
        <div>
          <label className="text-xs text-ink-500 block mb-1">Fim</label>
          <input type="date" name="fim" defaultValue={searchParams.fim ?? ''} className="w-full px-3 py-1.5 border border-navy-100 rounded-lg" />
        </div>
        <div>
          <label className="text-xs text-ink-500 block mb-1">Modalidade</label>
          <select name="modalidade" defaultValue={modalidade} className="w-full px-3 py-1.5 border border-navy-100 rounded-lg">
            <option value="todos">Todas</option>
            <option value="long_stay">Long-stay</option>
            <option value="short_stay">Short-stay</option>
          </select>
        </div>
        <div className="col-span-2 md:col-span-4">
          <button className="px-4 py-2 bg-navy-900 text-white rounded-lg text-sm">Aplicar filtros</button>
        </div>
      </form>

      {/* Cabeçalho imprimível */}
      <div className="bg-white rounded-xl p-5 shadow-soft print:shadow-none mb-5">
        <div className="flex justify-between items-start">
          <div>
            <div className="text-xs uppercase text-ink-400 font-semibold">ALVA Rent</div>
            <h2 className="text-lg font-bold">{prop.nome}</h2>
            <div className="text-xs text-ink-500">{prop.cpf_cnpj} · {prop.email ?? '—'}</div>
          </div>
          <div className="text-right text-xs text-ink-500">
            Emitido em {formatDate(new Date().toISOString())}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <Kpi label="Receita bruta" value={brl(totalBruto)} />
        <Kpi label="Taxa ALVA" value={brl(totalTaxa)} tone="indigo" />
        <Kpi label="Repasse líquido" value={brl(totalLiquido)} tone="emerald" />
        <Kpi label="Imóveis" value={String(linhas.length)} />
      </div>

      <div className="bg-white rounded-xl shadow-soft print:shadow-none overflow-hidden">
        <div className="px-4 py-3 border-b border-navy-50 text-sm font-bold">Detalhamento por imóvel</div>
        <table className="w-full text-sm">
          <thead className="bg-navy-50 text-ink-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-2 font-semibold">Imóvel</th>
              <th className="text-left px-4 py-2 font-semibold">Mod.</th>
              <th className="text-center px-4 py-2 font-semibold">Qtd</th>
              <th className="text-right px-4 py-2 font-semibold">Bruto</th>
              <th className="text-right px-4 py-2 font-semibold">Taxa</th>
              <th className="text-right px-4 py-2 font-semibold">Líquido</th>
            </tr>
          </thead>
          <tbody>
            {linhas.length === 0 && (
              <tr><td colSpan={6} className="text-center text-ink-500 py-8">Sem dados no período.</td></tr>
            )}
            {linhas.map((l, i) => (
              <tr key={i} className="border-t border-navy-50">
                <td className="px-4 py-2">{l.codigo}</td>
                <td className="px-4 py-2 text-xs">{l.modalidade === 'short_stay' ? 'Short' : 'Long'}</td>
                <td className="px-4 py-2 text-center">{l.qtd}</td>
                <td className="px-4 py-2 text-right tabular-nums">{brl(l.bruto)}</td>
                <td className="px-4 py-2 text-right tabular-nums text-ink-500">{brl(l.taxa)}</td>
                <td className="px-4 py-2 text-right tabular-nums font-semibold">{brl(l.liquido)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Kpi({ label, value, tone = 'navy' }: { label: string; value: string; tone?: 'navy' | 'indigo' | 'emerald' }) {
  const cls = tone === 'indigo' ? 'text-indigo-700' : tone === 'emerald' ? 'text-emerald-700' : 'text-navy-900';
  return (
    <div className="bg-white rounded-xl p-3 md:p-4 shadow-soft print:shadow-none">
      <div className="text-[10px] md:text-xs text-ink-500 uppercase font-semibold">{label}</div>
      <div className={`text-base md:text-xl font-bold mt-1 ${cls}`}>{value}</div>
    </div>
  );
}
