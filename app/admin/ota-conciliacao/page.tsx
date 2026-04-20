import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { brl, formatDate } from '@/lib/utils';
import { ConciliacaoClient } from './client';

export const metadata = { title: 'Conciliação OTA — Short Stay' };
export const dynamic = 'force-dynamic';

export default async function OtaConciliacaoPage() {
  const supabase = createClient();
  const { data: payouts } = await supabase
    .from('ota_payouts')
    .select('id, canal, data_payout, valor_bruto, valor_liquido, taxa_plataforma, referencia_externa, arquivo_origem, estada_pagamento_id, pagamento:estada_pagamentos(estada_id, estada:estadas(codigo))')
    .order('data_payout', { ascending: false })
    .limit(100);

  const conciliados = (payouts ?? []).filter((p: any) => p.estada_pagamento_id).length;
  const orfaos = (payouts ?? []).length - conciliados;

  return (
    <div className="px-8 py-6">
      <div className="mb-6">
        <div className="text-xs uppercase tracking-wider text-ink-400 font-semibold">Short Stay</div>
        <h1 className="text-2xl font-bold text-navy-900">Conciliação de payouts OTA</h1>
        <p className="text-sm text-ink-500 max-w-2xl">
          Importe o extrato CSV do Airbnb ou Booking. O sistema casa cada payout com a estada
          correspondente (via ID da reserva), cria o pagamento em <code>estada_pagamentos</code> e
          gera o repasse ao proprietário.
        </p>
      </div>

      <ConciliacaoClient />

      <div className="mt-10">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-navy-900">Últimos payouts importados</h2>
          <div className="text-xs text-ink-500">
            {conciliados} conciliados · {orfaos} órfãos
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-soft overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-navy-50 text-ink-500 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Canal</th>
                <th className="text-left px-4 py-3 font-semibold">Data payout</th>
                <th className="text-right px-4 py-3 font-semibold">Bruto</th>
                <th className="text-right px-4 py-3 font-semibold">Taxa OTA</th>
                <th className="text-right px-4 py-3 font-semibold">Líquido</th>
                <th className="text-left px-4 py-3 font-semibold">Ref.</th>
                <th className="text-left px-4 py-3 font-semibold">Estada</th>
                <th className="text-center px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {(!payouts || payouts.length === 0) && (
                <tr><td colSpan={8} className="text-center text-ink-500 py-10">Nenhum payout importado ainda.</td></tr>
              )}
              {payouts?.map((p: any) => {
                const pag = Array.isArray(p.pagamento) ? p.pagamento[0] : p.pagamento;
                const est = pag?.estada ? (Array.isArray(pag.estada) ? pag.estada[0] : pag.estada) : null;
                return (
                  <tr key={p.id} className="border-t border-navy-50">
                    <td className="px-4 py-3 capitalize">{p.canal}</td>
                    <td className="px-4 py-3">{formatDate(p.data_payout)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{brl(Number(p.valor_bruto))}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-ink-500">{brl(Number(p.taxa_plataforma ?? 0))}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold">{brl(Number(p.valor_liquido))}</td>
                    <td className="px-4 py-3 font-mono text-xs">{p.referencia_externa ?? '—'}</td>
                    <td className="px-4 py-3">
                      {est ? (
                        <Link href={`/admin/estadas/${pag.estada_id}`} className="text-navy-900 hover:underline text-xs font-mono">
                          {est.codigo}
                        </Link>
                      ) : <span className="text-ink-400 italic text-xs">órfão</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {p.estada_pagamento_id ? (
                        <span className="text-xs px-2 py-1 rounded-full bg-emerald-50 text-emerald-700">conciliado</span>
                      ) : (
                        <span className="text-xs px-2 py-1 rounded-full bg-amber-50 text-amber-700">pendente</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
