import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { brl, formatDate } from '@/lib/utils';
import { OptInToggle, AnonimizarButton } from './client';

export const metadata = { title: 'CRM / Marketing' };
export const dynamic = 'force-dynamic';

const segmentoCls: Record<string, string> = {
  vip: 'bg-amber-50 text-amber-700',
  recorrente: 'bg-indigo-50 text-indigo-700',
  ativo: 'bg-emerald-50 text-emerald-700',
  inativo: 'bg-ink-100 text-ink-600',
  churn: 'bg-rose-50 text-rose-700',
  novo: 'bg-sky-50 text-sky-700',
};

export default async function MarketingPage({
  searchParams,
}: {
  searchParams: {
    segmento?: string;
    origem?: string;
    optin?: string;
    q?: string;
  };
}) {
  const supabase = createClient();

  let query = supabase
    .from('hospedes')
    .select(
      'id, nome, email, telefone, pais, cidade, origem, origem_primeira_estada, aceita_marketing, qtd_estadas, receita_total_gerada, ultima_estada_em, primeira_estada_em, tags, segmento, anonimizado_em',
    )
    .is('anonimizado_em', null)
    .order('receita_total_gerada', { ascending: false })
    .limit(500);

  if (searchParams.segmento) query = query.eq('segmento', searchParams.segmento);
  if (searchParams.origem) query = query.eq('origem_primeira_estada', searchParams.origem);
  if (searchParams.optin === 'sim') query = query.eq('aceita_marketing', true);
  if (searchParams.optin === 'nao') query = query.eq('aceita_marketing', false);
  if (searchParams.q) query = query.ilike('nome', `%${searchParams.q}%`);

  const { data: hospedes } = await query;

  // Totais de segmento (sem filtro p/ ver a base inteira)
  const { data: todosSeg } = await supabase
    .from('hospedes')
    .select('segmento, aceita_marketing')
    .is('anonimizado_em', null);

  const contagem = { vip: 0, recorrente: 0, ativo: 0, inativo: 0, churn: 0, novo: 0 };
  let totalOptIn = 0;
  for (const h of todosSeg ?? []) {
    if (h.segmento && h.segmento in contagem) (contagem as any)[h.segmento]++;
    if (h.aceita_marketing) totalOptIn++;
  }

  // CSV URL
  const csvParams = new URLSearchParams();
  if (searchParams.segmento) csvParams.set('segmento', searchParams.segmento);
  if (searchParams.origem) csvParams.set('origem', searchParams.origem);
  if (searchParams.optin) csvParams.set('optin', searchParams.optin);
  if (searchParams.q) csvParams.set('q', searchParams.q);

  return (
    <div className="px-8 py-6 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-xs uppercase tracking-wider text-ink-400 font-semibold">Short Stay</div>
          <h1 className="text-2xl font-bold text-navy-900">CRM / Marketing</h1>
          <p className="text-sm text-ink-500">
            Base de hóspedes com segmentação automática. Use pra reengajamento e reserva direta.
          </p>
        </div>
        <Link
          href={`/admin/marketing/csv?${csvParams.toString()}`}
          className="px-4 py-2 bg-navy-900 text-white rounded-lg text-sm hover:bg-navy-800"
        >
          📥 Exportar CSV
        </Link>
      </div>

      <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-6">
        <SegCard label="VIP" value={contagem.vip} tone="amber" href="?segmento=vip" />
        <SegCard label="Recorrente" value={contagem.recorrente} tone="indigo" href="?segmento=recorrente" />
        <SegCard label="Ativo" value={contagem.ativo} tone="emerald" href="?segmento=ativo" />
        <SegCard label="Inativo" value={contagem.inativo} tone="ink" href="?segmento=inativo" />
        <SegCard label="Churn" value={contagem.churn} tone="rose" href="?segmento=churn" />
        <SegCard label="Opt-in ativo" value={totalOptIn} tone="emerald" href="?optin=sim" />
      </div>

      <form method="GET" className="bg-white rounded-xl p-4 shadow-soft mb-4 flex flex-wrap gap-3 items-end text-sm">
        <div>
          <label className="text-xs text-ink-500 block mb-1">Buscar nome</label>
          <input name="q" defaultValue={searchParams.q ?? ''} className="px-3 py-1.5 border border-navy-100 rounded-lg" />
        </div>
        <div>
          <label className="text-xs text-ink-500 block mb-1">Segmento</label>
          <select name="segmento" defaultValue={searchParams.segmento ?? ''} className="px-3 py-1.5 border border-navy-100 rounded-lg">
            <option value="">todos</option>
            <option value="vip">VIP</option>
            <option value="recorrente">Recorrente</option>
            <option value="ativo">Ativo</option>
            <option value="inativo">Inativo</option>
            <option value="churn">Churn</option>
            <option value="novo">Novo</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-ink-500 block mb-1">Origem</label>
          <select name="origem" defaultValue={searchParams.origem ?? ''} className="px-3 py-1.5 border border-navy-100 rounded-lg">
            <option value="">todas</option>
            <option value="direto">Direto</option>
            <option value="airbnb">Airbnb</option>
            <option value="booking">Booking</option>
            <option value="outro">Outro</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-ink-500 block mb-1">Opt-in LGPD</label>
          <select name="optin" defaultValue={searchParams.optin ?? ''} className="px-3 py-1.5 border border-navy-100 rounded-lg">
            <option value="">qualquer</option>
            <option value="sim">Aceita marketing</option>
            <option value="nao">Não aceita</option>
          </select>
        </div>
        <button className="px-4 py-1.5 bg-navy-900 text-white rounded-lg text-xs">Filtrar</button>
        <Link href="/admin/marketing" className="text-xs text-ink-500 hover:underline">limpar</Link>
      </form>

      <div className="bg-white rounded-xl shadow-soft overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-navy-50 text-ink-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-3 font-semibold">Hóspede</th>
              <th className="text-left px-4 py-3 font-semibold">Contato</th>
              <th className="text-left px-4 py-3 font-semibold">Origem</th>
              <th className="text-center px-4 py-3 font-semibold">Estadas</th>
              <th className="text-right px-4 py-3 font-semibold">Receita</th>
              <th className="text-left px-4 py-3 font-semibold">Última</th>
              <th className="text-center px-4 py-3 font-semibold">Segmento</th>
              <th className="text-center px-4 py-3 font-semibold">Opt-in</th>
              <th className="text-right px-4 py-3 font-semibold">LGPD</th>
            </tr>
          </thead>
          <tbody>
            {(hospedes ?? []).length === 0 && (
              <tr><td colSpan={9} className="text-center text-ink-500 py-10">Nenhum hóspede nos filtros.</td></tr>
            )}
            {(hospedes ?? []).map((h: any) => (
              <tr key={h.id} className="border-t border-navy-50">
                <td className="px-4 py-3">
                  <div className="font-medium">{h.nome}</div>
                  <div className="text-xs text-ink-500">{h.cidade ?? h.pais ?? ''}</div>
                </td>
                <td className="px-4 py-3 text-xs">
                  <div>{h.email ?? '—'}</div>
                  <div className="text-ink-500">{h.telefone ?? ''}</div>
                </td>
                <td className="px-4 py-3 text-xs capitalize">{h.origem_primeira_estada ?? h.origem}</td>
                <td className="px-4 py-3 text-center font-semibold">{h.qtd_estadas}</td>
                <td className="px-4 py-3 text-right tabular-nums">{brl(Number(h.receita_total_gerada ?? 0))}</td>
                <td className="px-4 py-3 text-xs">{h.ultima_estada_em ? formatDate(h.ultima_estada_em) : '—'}</td>
                <td className="px-4 py-3 text-center">
                  {h.segmento && (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${segmentoCls[h.segmento] ?? 'bg-ink-100'}`}>
                      {h.segmento}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  <OptInToggle id={h.id} checked={h.aceita_marketing} />
                </td>
                <td className="px-4 py-3 text-right">
                  <AnonimizarButton id={h.id} nome={h.nome} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-ink-500 mt-3">
        LGPD: opt-in é obrigatório pra envios de marketing. Botão "anonimizar" apaga nome/email/telefone preservando métricas agregadas.
      </p>
    </div>
  );
}

function SegCard({
  label,
  value,
  tone,
  href,
}: {
  label: string;
  value: number;
  tone: 'amber' | 'indigo' | 'emerald' | 'ink' | 'rose';
  href: string;
}) {
  const cls =
    tone === 'amber' ? 'text-amber-700'
    : tone === 'indigo' ? 'text-indigo-700'
    : tone === 'emerald' ? 'text-emerald-700'
    : tone === 'rose' ? 'text-rose-700'
    : 'text-ink-700';
  return (
    <Link href={href} className="bg-white rounded-xl p-3 shadow-soft hover:shadow-md transition block">
      <div className="text-[10px] text-ink-500 uppercase font-semibold">{label}</div>
      <div className={`text-xl font-bold mt-1 ${cls}`}>{value}</div>
    </Link>
  );
}
