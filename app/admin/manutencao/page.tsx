import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { NovoTicketForm } from './client';
import { brl, formatDate } from '@/lib/utils';

export const metadata = { title: 'Manutenção · ALVA Rent' };
export const dynamic = 'force-dynamic';

type SP = { status?: string; prioridade?: string };

const statusColor: Record<string, string> = {
  aberta: 'bg-rose-50 text-rose-700',
  agendada: 'bg-amber-50 text-amber-700',
  em_andamento: 'bg-sky-50 text-sky-700',
  resolvida: 'bg-emerald-50 text-emerald-700',
  cancelada: 'bg-ink-100 text-ink-600',
};
const prioColor: Record<string, string> = {
  baixa: 'bg-ink-100 text-ink-600',
  media: 'bg-sky-50 text-sky-700',
  alta: 'bg-amber-50 text-amber-700',
  urgente: 'bg-rose-100 text-rose-800 font-bold',
};

export default async function ManutencaoPage({ searchParams }: { searchParams: SP }) {
  const supabase = createClient();

  let query = supabase
    .from('manutencoes')
    .select(`
      id, tipo, prioridade, status, titulo, descricao, origem,
      custo, aberta_em, agendada_para, resolvida_em,
      imovel:imoveis(codigo, endereco),
      fornecedor:fornecedores_manutencao(nome, telefone)
    `)
    .order('aberta_em', { ascending: false });

  if (searchParams.status) query = query.eq('status', searchParams.status);
  if (searchParams.prioridade) query = query.eq('prioridade', searchParams.prioridade);

  const { data: tickets } = await query;

  const { data: imoveis } = await supabase
    .from('imoveis')
    .select('id, codigo, endereco')
    .order('codigo');

  const { data: fornecedores } = await supabase
    .from('fornecedores_manutencao')
    .select('id, nome, especialidade')
    .eq('ativo', true)
    .order('nome');

  // KPIs
  const { data: kpiData } = await supabase.from('manutencoes').select('status, prioridade, custo');
  const abertas = (kpiData ?? []).filter((t) => t.status === 'aberta').length;
  const agendadas = (kpiData ?? []).filter((t) => t.status === 'agendada').length;
  const urgentes = (kpiData ?? []).filter(
    (t) => t.prioridade === 'urgente' && t.status !== 'resolvida' && t.status !== 'cancelada',
  ).length;
  const custoTotal = (kpiData ?? [])
    .filter((t) => t.status === 'resolvida')
    .reduce((s, t) => s + Number(t.custo ?? 0), 0);

  return (
    <div className="px-8 py-6 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-xs uppercase tracking-wider text-ink-400 font-semibold">Operações</div>
          <h1 className="text-2xl font-bold text-navy-900">Manutenção</h1>
        </div>
        <Link href="/admin/manutencao/fornecedores">
          <Button variant="outline">🧰 Fornecedores</Button>
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <KpiCard label="Abertas" value={abertas} tone="rose" href="?status=aberta" active={searchParams.status === 'aberta'} />
        <KpiCard label="Agendadas" value={agendadas} tone="amber" href="?status=agendada" active={searchParams.status === 'agendada'} />
        <KpiCard label="Urgentes ativas" value={urgentes} tone="rose" href="?prioridade=urgente" active={searchParams.prioridade === 'urgente'} />
        <KpiCard label="Custo resolvido" value={brl(custoTotal)} tone="emerald" />
      </div>

      {/* Novo ticket */}
      <div className="bg-white rounded-xl p-6 shadow-soft mb-6">
        <h2 className="font-bold text-navy-900 mb-3">Abrir ticket</h2>
        <NovoTicketForm imoveis={imoveis ?? []} fornecedores={fornecedores ?? []} />
      </div>

      {/* Lista */}
      <div className="bg-white rounded-xl shadow-soft overflow-hidden">
        <div className="px-6 py-3 border-b border-navy-100 flex items-center justify-between">
          <h2 className="font-bold text-navy-900">Tickets ({tickets?.length ?? 0})</h2>
          {(searchParams.status || searchParams.prioridade) && (
            <Link href="/admin/manutencao" className="text-xs text-navy-900 hover:underline">
              Limpar filtros
            </Link>
          )}
        </div>
        {(tickets ?? []).length === 0 ? (
          <div className="p-12 text-center text-sm text-ink-400">Sem tickets.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-navy-50 text-xs uppercase text-ink-500">
              <tr>
                <th className="text-left px-4 py-3">Imóvel</th>
                <th className="text-left px-4 py-3">Título</th>
                <th className="text-left px-4 py-3">Tipo</th>
                <th className="text-center px-4 py-3">Prioridade</th>
                <th className="text-center px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Aberta em</th>
                <th className="text-right px-4 py-3">Custo</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {(tickets ?? []).map((t: any) => {
                const im = Array.isArray(t.imovel) ? t.imovel[0] : t.imovel;
                const fo = Array.isArray(t.fornecedor) ? t.fornecedor[0] : t.fornecedor;
                return (
                  <tr key={t.id} className="border-t border-navy-50 hover:bg-navy-50/50">
                    <td className="px-4 py-3">
                      <div className="font-mono text-xs">{im?.codigo}</div>
                      <div className="text-[11px] text-ink-500 truncate max-w-[160px]">{im?.endereco}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{t.titulo}</div>
                      {fo && <div className="text-[11px] text-ink-500">👷 {fo.nome}</div>}
                    </td>
                    <td className="px-4 py-3 capitalize">{t.tipo}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-[10px] px-2 py-1 rounded-full uppercase ${prioColor[t.prioridade]}`}>
                        {t.prioridade}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs px-2 py-1 rounded-full ${statusColor[t.status]}`}>
                        {t.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-ink-500">{formatDate(t.aberta_em)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-xs">
                      {t.custo ? brl(Number(t.custo)) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/manutencao/${t.id}`} className="text-xs text-navy-900 hover:underline">
                        Abrir →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  tone,
  href,
  active,
}: {
  label: string;
  value: string | number;
  tone: 'rose' | 'amber' | 'emerald' | 'sky';
  href?: string;
  active?: boolean;
}) {
  const tones = {
    rose: 'text-rose-700',
    amber: 'text-amber-700',
    emerald: 'text-emerald-700',
    sky: 'text-sky-700',
  };
  const content = (
    <div className={`bg-white rounded-xl p-5 shadow-soft ${active ? 'ring-2 ring-navy-900' : ''}`}>
      <div className="text-xs text-ink-500 font-semibold uppercase">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${tones[tone]}`}>{value}</div>
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}
