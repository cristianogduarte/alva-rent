import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { brl, formatCpf } from '@/lib/utils';
import { PrintButton } from '../print-button';

export const metadata = { title: 'Informe de Rendimentos — IR' };
export const dynamic = 'force-dynamic';

function formatDoc(d: string | null) {
  if (!d) return '—';
  const n = d.replace(/\D/g, '');
  if (n.length === 11) return n.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  if (n.length === 14) return n.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  return d;
}

const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export default async function InquilinoIRPage({
  searchParams,
}: {
  searchParams: { inquilino?: string; ano?: string };
}) {
  const ano = Number(searchParams.ano ?? new Date().getFullYear() - 1); // IR declara o ano anterior
  const supabase = createClient();

  const { data: inquilinos } = await supabase
    .from('inquilinos')
    .select('id, nome, cpf')
    .order('nome');

  const inquilinoId = searchParams.inquilino || (inquilinos?.[0]?.id ?? '');
  const inquilinoSel = inquilinos?.find((i) => i.id === inquilinoId);

  let pagamentos: any[] = [];
  let contratos: any[] = [];
  if (inquilinoId) {
    const { data: contratosData } = await supabase
      .from('contratos')
      .select(`
        id, codigo,
        imovel:imoveis (codigo, endereco, numero, bairro, cidade, uf,
          proprietario:proprietarios (nome, cpf_cnpj))
      `)
      .eq('inquilino_id', inquilinoId);
    contratos = contratosData ?? [];

    const contratoIds = contratos.map((c) => c.id);
    if (contratoIds.length > 0) {
      const { data: pagos } = await supabase
        .from('boletos')
        .select('competencia, data_pagamento, valor_pago, valor_total, status, contrato_id')
        .in('contrato_id', contratoIds)
        .eq('status', 'pago')
        .gte('data_pagamento', `${ano}-01-01`)
        .lte('data_pagamento', `${ano}-12-31`)
        .order('data_pagamento');
      pagamentos = pagos ?? [];
    }
  }

  // Agrega por mês do pagamento
  const porMes = new Array(12).fill(0);
  for (const p of pagamentos) {
    if (!p.data_pagamento) continue;
    const m = Number(p.data_pagamento.slice(5, 7)) - 1;
    porMes[m] += Number(p.valor_pago ?? p.valor_total);
  }
  const totalAno = porMes.reduce((s, v) => s + v, 0);

  const proprietario: any = contratos[0]?.imovel?.proprietario;
  const imovel: any = contratos[0]?.imovel;

  const anos = [new Date().getFullYear() - 1, new Date().getFullYear() - 2, new Date().getFullYear() - 3, new Date().getFullYear()];

  return (
    <div className="px-8 py-6 print:px-8 print:py-6 max-w-4xl">
      <nav aria-label="Breadcrumb" className="text-xs text-ink-400 mb-2 print:hidden">
        <Link href="/admin/dashboard" className="hover:underline">Admin</Link>
        <span className="mx-1.5">/</span>
        <Link href="/admin/relatorios" className="hover:underline">Relatórios</Link>
        <span className="mx-1.5">/</span>
        <span className="text-ink-500">Informe IR</span>
      </nav>

      {/* Filtros (não imprimem) */}
      <div className="flex items-end justify-between mb-6 print:hidden">
        <div>
          <div className="text-xs uppercase tracking-wider text-ink-400 font-semibold">Declaração de IR</div>
          <h1 className="text-2xl font-bold text-navy-900">Informe de Rendimentos</h1>
          <p className="text-sm text-ink-500">Comprovante anual de aluguéis pagos para entregar ao inquilino.</p>
        </div>
        <div className="flex items-center gap-2">
          <form className="flex items-center gap-2">
            <select name="inquilino" defaultValue={inquilinoId} className="text-sm border border-navy-100 rounded-md px-2 py-1 bg-white">
              {(inquilinos ?? []).map((i) => (
                <option key={i.id} value={i.id}>{i.nome}</option>
              ))}
            </select>
            <select name="ano" defaultValue={ano} className="text-sm border border-navy-100 rounded-md px-2 py-1 bg-white">
              {anos.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
            <button type="submit" className="text-xs px-3 py-1.5 bg-navy-900 text-white rounded-md font-semibold">gerar</button>
          </form>
          <PrintButton />
        </div>
      </div>

      {/* Documento imprimível */}
      <div className="bg-white rounded-xl shadow-soft p-8 print:shadow-none print:p-0">
        <div className="text-center mb-6 pb-4 border-b border-navy-100">
          <h2 className="text-lg font-bold text-navy-900">
            COMPROVANTE DE ALUGUÉIS PAGOS — EXERCÍCIO {ano + 1} · ANO-CALENDÁRIO {ano}
          </h2>
          <p className="text-xs text-ink-500 mt-1">
            Documento informativo para declaração do Imposto de Renda Pessoa Física (IRPF)
          </p>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-6 text-sm">
          <section>
            <div className="text-xs uppercase tracking-wider text-ink-400 font-semibold mb-2">Locatário (inquilino)</div>
            <div className="font-semibold text-navy-900">{inquilinoSel?.nome ?? '—'}</div>
            <div className="font-mono text-xs text-ink-600">CPF: {formatCpf(inquilinoSel?.cpf ?? '')}</div>
          </section>
          <section>
            <div className="text-xs uppercase tracking-wider text-ink-400 font-semibold mb-2">Locador (proprietário)</div>
            <div className="font-semibold text-navy-900">{proprietario?.nome ?? '—'}</div>
            <div className="font-mono text-xs text-ink-600">CPF/CNPJ: {formatDoc(proprietario?.cpf_cnpj ?? null)}</div>
          </section>
          <section className="col-span-2">
            <div className="text-xs uppercase tracking-wider text-ink-400 font-semibold mb-2">Imóvel locado</div>
            {imovel ? (
              <div className="text-sm text-ink-700">
                {imovel.endereco}{imovel.numero ? `, ${imovel.numero}` : ''} · {imovel.bairro}, {imovel.cidade}/{imovel.uf}
              </div>
            ) : <div className="text-sm text-ink-400">—</div>}
          </section>
        </div>

        <table className="w-full text-sm mb-4">
          <thead className="bg-navy-50/40 text-ink-500 text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left px-3 py-2 font-semibold">Mês</th>
              <th className="text-right px-3 py-2 font-semibold">Aluguel pago (R$)</th>
            </tr>
          </thead>
          <tbody>
            {porMes.map((v, i) => (
              <tr key={i} className="border-t border-navy-50">
                <td className="px-3 py-2">{meses[i]}/{ano}</td>
                <td className="px-3 py-2 text-right tabular-nums">{brl(v)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t-2 border-navy-100 bg-navy-50/40">
            <tr>
              <td className="px-3 py-3 font-bold text-navy-900">TOTAL {ano}</td>
              <td className="px-3 py-3 text-right tabular-nums font-bold text-navy-900 text-base">{brl(totalAno)}</td>
            </tr>
          </tfoot>
        </table>

        <p className="text-xs text-ink-500 leading-relaxed mt-6">
          Declaramos para fins de comprovação junto à Receita Federal do Brasil que, no exercício {ano + 1}
          (ano-calendário {ano}), o locatário acima identificado pagou ao locador o valor total de{' '}
          <strong className="text-navy-900">{brl(totalAno)}</strong> a título de aluguel do imóvel descrito,
          conforme discriminado mensalmente acima.
        </p>
        <p className="text-xs text-ink-500 mt-2">
          Administração: ALVA Rent · ALVA ONE.
        </p>

        <div className="mt-12 pt-4 border-t border-navy-100 text-xs text-ink-500 flex justify-between">
          <div>Emitido em {new Date().toLocaleDateString('pt-BR')}</div>
          <div>Documento gerado automaticamente · ALVA Rent</div>
        </div>
      </div>
    </div>
  );
}
