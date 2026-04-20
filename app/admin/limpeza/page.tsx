import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { brl, formatDate } from '@/lib/utils';

export const metadata = { title: 'Limpezas' };
export const dynamic = 'force-dynamic';

const statusCls: Record<string, string> = {
  pendente: 'bg-amber-50 text-amber-700',
  agendada: 'bg-sky-50 text-sky-700',
  em_andamento: 'bg-indigo-50 text-indigo-700',
  concluida: 'bg-emerald-50 text-emerald-700',
  cancelada: 'bg-ink-100 text-ink-600',
};

export default async function LimpezasPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const supabase = createClient();
  const status = searchParams.status;

  let q = supabase
    .from('limpezas')
    .select(`
      id, status, agendada_para, concluida_em, valor, token_publico,
      imovel:imoveis (codigo, endereco, numero, bairro),
      equipe:equipe_limpeza (nome, telefone),
      estada:estadas (codigo, data_checkout, hospede:hospedes (nome))
    `)
    .order('agendada_para', { ascending: true, nullsFirst: true });
  if (status) q = q.eq('status', status);
  const { data: limpezas } = await q;

  const resumo = {
    pendente: 0,
    agendada: 0,
    em_andamento: 0,
    concluida: 0,
  };
  // quick count separado para KPIs
  const { data: countsRaw } = await supabase.from('limpezas').select('status');
  for (const r of countsRaw ?? []) {
    if (r.status in resumo) (resumo as any)[r.status]++;
  }

  return (
    <div className="px-8 py-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-xs uppercase tracking-wider text-ink-400 font-semibold">Short Stay</div>
          <h1 className="text-2xl font-bold text-navy-900">Limpezas</h1>
          <p className="text-sm text-ink-500">
            Tickets criados automaticamente quando uma estada entra em checkout.
          </p>
        </div>
        <Link
          href="/admin/limpeza/equipe"
          className="px-4 py-2 border border-navy-100 rounded-lg text-sm hover:bg-navy-50"
        >
          👥 Equipes
        </Link>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        {(['pendente', 'agendada', 'em_andamento', 'concluida'] as const).map((s) => (
          <Link
            key={s}
            href={status === s ? '/admin/limpeza' : `/admin/limpeza?status=${s}`}
            className={`bg-white rounded-xl p-4 shadow-soft hover:shadow-md transition ${
              status === s ? 'ring-2 ring-navy-900' : ''
            }`}
          >
            <div className="text-xs text-ink-500 uppercase font-semibold">
              {s.replace('_', ' ')}
            </div>
            <div className="text-2xl font-bold text-navy-900 mt-1">{resumo[s]}</div>
          </Link>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-soft overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-navy-50 text-ink-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-3 font-semibold">Imóvel</th>
              <th className="text-left px-4 py-3 font-semibold">Estada</th>
              <th className="text-left px-4 py-3 font-semibold">Equipe</th>
              <th className="text-left px-4 py-3 font-semibold">Agendada</th>
              <th className="text-center px-4 py-3 font-semibold">Status</th>
              <th className="text-right px-4 py-3 font-semibold">Valor</th>
              <th className="text-right px-4 py-3 font-semibold">Ação</th>
            </tr>
          </thead>
          <tbody>
            {(limpezas ?? []).length === 0 && (
              <tr>
                <td colSpan={7} className="text-center text-ink-500 py-10">
                  Nenhuma limpeza nos filtros.
                </td>
              </tr>
            )}
            {(limpezas ?? []).map((l: any) => {
              const im = Array.isArray(l.imovel) ? l.imovel[0] : l.imovel;
              const eq = Array.isArray(l.equipe) ? l.equipe[0] : l.equipe;
              const est = Array.isArray(l.estada) ? l.estada[0] : l.estada;
              const hos = est && (Array.isArray(est.hospede) ? est.hospede[0] : est.hospede);
              return (
                <tr key={l.id} className="border-t border-navy-50">
                  <td className="px-4 py-3">
                    <div className="font-medium">{im?.codigo}</div>
                    <div className="text-xs text-ink-500">{im?.bairro}</div>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {est ? (
                      <>
                        <div className="font-mono">{est.codigo}</div>
                        <div className="text-ink-500">{hos?.nome ?? '—'}</div>
                      </>
                    ) : (
                      <span className="text-ink-400">manual</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {eq ? eq.nome : <span className="text-ink-400 italic">— atribuir —</span>}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {l.agendada_para ? formatDate(l.agendada_para) : '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusCls[l.status]}`}>
                      {l.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{brl(l.valor ?? 0)}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/limpeza/${l.id}`}
                      className="text-xs text-navy-900 hover:underline font-medium"
                    >
                      Detalhes →
                    </Link>
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
