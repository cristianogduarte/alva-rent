import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { formatDate } from '@/lib/utils';
import { abrirChamadoManutencao } from './actions';

export const metadata = { title: 'Manutenção' };
export const dynamic = 'force-dynamic';

export default async function ManutencaoPage({
  searchParams,
}: {
  searchParams: { ok?: string; erro?: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=/portal/manutencao');

  const { data: inquilino } = await supabase
    .from('inquilinos')
    .select('id, nome')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!inquilino) redirect('/portal');

  // Contrato ativo
  const { data: contrato } = await supabase
    .from('contratos')
    .select('id, imovel_id, imovel:imoveis(codigo, endereco)')
    .eq('inquilino_id', inquilino.id)
    .order('data_inicio', { ascending: false })
    .limit(1)
    .maybeSingle();

  // Chamados anteriores (filtrados por imóvel do contrato)
  const { data: chamados } = contrato?.imovel_id
    ? await supabase
        .from('manutencoes')
        .select('id, titulo, tipo, prioridade, status, aberta_em, resolvida_em')
        .eq('imovel_id', contrato.imovel_id)
        .eq('origem', 'hospede')
        .order('aberta_em', { ascending: false })
        .limit(10)
    : { data: [] };

  return (
    <div className="min-h-screen bg-navy-50 pb-10">
      <header className="bg-navy-900 text-white px-5 pt-6 pb-5">
        <Link href="/portal" className="text-xs opacity-70 hover:opacity-100">
          ← Voltar
        </Link>
        <h1 className="text-xl font-semibold mt-2">Manutenção</h1>
        <p className="text-xs opacity-70 mt-1">Abra um chamado que a gente resolve rápido.</p>
      </header>

      <div className="px-5 py-4 space-y-4">
        {searchParams.ok && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm rounded-lg p-3">
            ✅ Chamado aberto! Acompanhe o andamento abaixo.
          </div>
        )}
        {searchParams.erro && (
          <div className="bg-rose-50 border border-rose-200 text-rose-900 text-sm rounded-lg p-3">
            ❌ {searchParams.erro}
          </div>
        )}

        {contrato ? (
          <form
            action={abrirChamadoManutencao}
            className="bg-white rounded-xl p-4 border border-navy-100 space-y-3"
          >
            <input type="hidden" name="imovel_id" value={contrato.imovel_id} />
            <div>
              <label className="text-xs font-semibold text-ink-500 uppercase tracking-wider block mb-1">
                Título
              </label>
              <input
                name="titulo"
                required
                maxLength={120}
                placeholder="Ex: Vazamento na pia da cozinha"
                className="w-full border border-navy-100 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-ink-500 uppercase tracking-wider block mb-1">
                Descrição
              </label>
              <textarea
                name="descricao"
                required
                rows={4}
                placeholder="Conta o que aconteceu, quando começou, se está urgente..."
                className="w-full border border-navy-100 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-ink-500 uppercase tracking-wider block mb-1">
                Prioridade
              </label>
              <select
                name="prioridade"
                className="w-full border border-navy-100 rounded-lg px-3 py-2 text-sm"
                defaultValue="media"
              >
                <option value="baixa">Baixa — pode esperar</option>
                <option value="media">Média — nesta semana</option>
                <option value="alta">Alta — o quanto antes</option>
                <option value="urgente">Urgente — emergência</option>
              </select>
            </div>
            <button
              type="submit"
              className="w-full bg-navy-900 text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-navy-800 transition"
            >
              Abrir chamado
            </button>
          </form>
        ) : (
          <div className="bg-white rounded-xl p-6 text-center text-sm text-ink-500">
            Você não tem contrato ativo. Entre em contato com a administração.
          </div>
        )}

        {chamados && chamados.length > 0 && (
          <div>
            <div className="text-xs uppercase font-semibold text-ink-400 tracking-wider mb-2 px-1">
              Meus chamados
            </div>
            <div className="bg-white rounded-xl border border-navy-100 divide-y divide-navy-50">
              {chamados.map((c) => (
                <div key={c.id} className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-semibold text-navy-900 text-sm">{c.titulo}</div>
                    <StatusBadge status={c.status} />
                  </div>
                  <div className="text-[11px] text-ink-500 mt-1">
                    {c.tipo} · {c.prioridade} · aberto em {formatDate(c.aberta_em)}
                    {c.resolvida_em && ` · resolvido ${formatDate(c.resolvida_em)}`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    aberta: 'bg-rose-50 text-rose-700',
    agendada: 'bg-amber-50 text-amber-700',
    em_andamento: 'bg-sky-50 text-sky-700',
    resolvida: 'bg-emerald-50 text-emerald-700',
    cancelada: 'bg-ink-100 text-ink-500',
  };
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${map[status] ?? 'bg-ink-100'}`}>
      {status}
    </span>
  );
}
