import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { brl, formatDate } from '@/lib/utils';
import { PrintButton } from '../print-button';

export const metadata = { title: 'Relatório — Contador' };
export const dynamic = 'force-dynamic';

function parsePeriodo(sp: { de?: string; ate?: string; ano?: string }) {
  if (sp.de && sp.ate) return { de: sp.de, ate: sp.ate, label: `${sp.de} a ${sp.ate}` };
  const ano = Number(sp.ano ?? new Date().getFullYear());
  return { de: `${ano}-01-01`, ate: `${ano}-12-31`, label: `Ano ${ano}`, ano };
}

export default async function ContadorRel({ searchParams }: { searchParams: any }) {
  const periodo = parsePeriodo(searchParams);
  const supabase = createClient();

  const { data: boletos } = await supabase
    .from('boletos')
    .select(`
      id, competencia, data_pagamento, valor_total, valor_pago, status,
      contrato:contratos (
        codigo, valor_aluguel,
        imovel:imoveis (codigo, endereco, numero, bairro, cidade, uf,
          proprietario:proprietarios (nome, cpf_cnpj)),
        inquilino:inquilinos (nome, cpf)
      )
    `)
    .gte('competencia', periodo.de)
    .lte('competencia', periodo.ate)
    .order('competencia', { ascending: true });

  const linhas = (boletos ?? []).map((b: any) => ({
    competencia: b.competencia,
    imovel: b.contrato?.imovel?.codigo,
    endereco: `${b.contrato?.imovel?.endereco ?? ''} ${b.contrato?.imovel?.numero ?? ''} · ${b.contrato?.imovel?.bairro ?? ''}, ${b.contrato?.imovel?.cidade ?? ''}/${b.contrato?.imovel?.uf ?? ''}`,
    proprietario: b.contrato?.imovel?.proprietario?.nome,
    cpf_cnpj_proprietario: b.contrato?.imovel?.proprietario?.cpf_cnpj,
    inquilino: b.contrato?.inquilino?.nome,
    cpf_inquilino: b.contrato?.inquilino?.cpf,
    contrato: b.contrato?.codigo,
    valor_bruto: Number(b.valor_total),
    valor_pago: b.valor_pago ? Number(b.valor_pago) : 0,
    data_pagamento: b.data_pagamento,
    status: b.status,
  }));

  const totalBruto = linhas.reduce((s, l) => s + l.valor_bruto, 0);
  const totalPago = linhas.reduce((s, l) => s + l.valor_pago, 0);

  const anos = [new Date().getFullYear(), new Date().getFullYear() - 1, new Date().getFullYear() - 2];

  const csvHref = `/admin/relatorios/contador/csv?ano=${periodo.ano ?? new Date().getFullYear()}`;

  return (
    <div className="px-8 py-6 print:px-0">
      <nav aria-label="Breadcrumb" className="text-xs text-ink-400 mb-2 print:hidden">
        <Link href="/admin/dashboard" className="hover:underline">Admin</Link>
        <span className="mx-1.5">/</span>
        <Link href="/admin/relatorios" className="hover:underline">Relatórios</Link>
        <span className="mx-1.5">/</span>
        <span className="text-ink-500">Contador</span>
      </nav>

      <div className="flex items-end justify-between mb-6">
        <div>
          <div className="text-xs uppercase tracking-wider text-ink-400 font-semibold">Contábil</div>
          <h1 className="text-2xl font-bold text-navy-900">Receita de locação — contador</h1>
          <p className="text-sm text-ink-500">Período: {periodo.label} · {linhas.length} competência(s)</p>
        </div>
        <div className="flex items-center gap-2 print:hidden">
          <form className="flex items-center gap-2">
            <label className="text-xs text-ink-500">Ano:</label>
            <select name="ano" defaultValue={searchParams.ano ?? new Date().getFullYear()} className="text-sm border border-navy-100 rounded-md px-2 py-1 bg-white">
              {anos.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
            <button type="submit" className="text-xs px-3 py-1.5 bg-navy-900 text-white rounded-md font-semibold">aplicar</button>
          </form>
          <a href={csvHref} className="text-xs px-3 py-1.5 border border-navy-100 rounded-md font-semibold hover:bg-navy-50">exportar CSV</a>
          <PrintButton />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6 print:hidden">
        <KPI label="Boletos no período" value={String(linhas.length)} />
        <KPI label="Valor bruto emitido" value={brl(totalBruto)} />
        <KPI label="Valor pago (competência)" value={brl(totalPago)} />
      </div>

      <div className="bg-white rounded-xl shadow-soft overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-navy-50/40 text-ink-500 uppercase tracking-wider">
            <tr>
              <th className="text-left px-3 py-2 font-semibold">Competência</th>
              <th className="text-left px-3 py-2 font-semibold">Imóvel</th>
              <th className="text-left px-3 py-2 font-semibold">Proprietário</th>
              <th className="text-left px-3 py-2 font-semibold">Inquilino</th>
              <th className="text-right px-3 py-2 font-semibold">Bruto</th>
              <th className="text-right px-3 py-2 font-semibold">Pago</th>
              <th className="text-left px-3 py-2 font-semibold">Pago em</th>
              <th className="text-left px-3 py-2 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {linhas.length === 0 ? (
              <tr><td colSpan={8} className="px-3 py-10 text-center text-ink-500">Nenhum boleto no período.</td></tr>
            ) : (
              linhas.map((l, i) => (
                <tr key={i} className="border-t border-navy-50">
                  <td className="px-3 py-2">{formatDate(l.competencia)}</td>
                  <td className="px-3 py-2">{l.imovel}</td>
                  <td className="px-3 py-2">{l.proprietario}</td>
                  <td className="px-3 py-2">{l.inquilino}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{brl(l.valor_bruto)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{brl(l.valor_pago)}</td>
                  <td className="px-3 py-2">{l.data_pagamento ? formatDate(l.data_pagamento) : '—'}</td>
                  <td className="px-3 py-2 capitalize">{l.status}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function KPI({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-soft">
      <div className="text-xs text-ink-500 font-semibold uppercase">{label}</div>
      <div className="text-2xl font-bold mt-1 tabular-nums text-navy-900">{value}</div>
    </div>
  );
}
