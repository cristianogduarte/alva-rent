import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { brl } from '@/lib/utils';
import { PagarButton } from './pagar-button';

export const metadata = { title: 'Fechamento mensal — Repasses' };
export const dynamic = 'force-dynamic';

interface LinhaProp {
  proprietario_id: string;
  nome: string;
  chave_pix: string | null;
  email: string | null;
  bruto: number;
  taxa_alva: number;
  liquido: number;
  pago: number;
  pendente: number;
  qtd: number;
}

export default async function FechamentoPage({
  searchParams,
}: {
  searchParams: { mes?: string };
}) {
  const hoje = new Date();
  const mes = searchParams.mes ?? `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
  const [y, m] = mes.split('-').map(Number);
  const iniMes = `${mes}-01`;
  const fimMes = new Date(y, m, 1).toISOString().slice(0, 10);

  const supabase = createClient();
  const { data: repasses } = await supabase
    .from('repasses')
    .select(`
      id, proprietario_id, valor_bruto, valor_taxa, valor_liquido, status, created_at,
      proprietario:proprietarios (nome, chave_pix, email)
    `)
    .gte('created_at', iniMes)
    .lt('created_at', fimMes);

  // Agrupa por proprietário
  const mapa = new Map<string, LinhaProp>();
  for (const r of repasses ?? []) {
    const prop: any = Array.isArray(r.proprietario) ? r.proprietario[0] : r.proprietario;
    if (!prop) continue;
    const key = r.proprietario_id;
    if (!mapa.has(key)) {
      mapa.set(key, {
        proprietario_id: key,
        nome: prop.nome,
        chave_pix: prop.chave_pix ?? null,
        email: prop.email ?? null,
        bruto: 0,
        taxa_alva: 0,
        liquido: 0,
        pago: 0,
        pendente: 0,
        qtd: 0,
      });
    }
    const linha = mapa.get(key)!;
    linha.bruto += Number(r.valor_bruto);
    linha.taxa_alva += Number(r.valor_taxa);
    linha.liquido += Number(r.valor_liquido);
    linha.qtd += 1;
    if (r.status === 'pago') linha.pago += Number(r.valor_liquido);
    if (r.status === 'pendente') linha.pendente += Number(r.valor_liquido);
  }

  const linhas = [...mapa.values()].sort((a, b) => b.pendente - a.pendente || a.nome.localeCompare(b.nome));
  const totalBruto = linhas.reduce((s, l) => s + l.bruto, 0);
  const totalLiquido = linhas.reduce((s, l) => s + l.liquido, 0);
  const totalPendente = linhas.reduce((s, l) => s + l.pendente, 0);
  const totalTaxa = linhas.reduce((s, l) => s + l.taxa_alva, 0);

  // nav meses
  const prevDate = new Date(y, m - 2, 1);
  const nextDate = new Date(y, m, 1);
  const prevMes = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
  const nextMes = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`;

  return (
    <div className="px-8 py-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-xs uppercase tracking-wider text-ink-400 font-semibold">Repasses</div>
          <h1 className="text-2xl font-bold text-navy-900">Fechamento mensal</h1>
          <p className="text-sm text-ink-500">
            Competência {mes} · {linhas.length} proprietários · {(repasses ?? []).length} repasses
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Link href={`/admin/repasses/fechamento?mes=${prevMes}`} className="px-3 py-1.5 border border-navy-100 rounded-lg hover:bg-navy-50">← {prevMes}</Link>
          <form method="GET" className="flex gap-2">
            <input type="month" name="mes" defaultValue={mes} className="px-3 py-1.5 border border-navy-100 rounded-lg" />
            <button type="submit" className="px-3 py-1.5 border border-navy-100 rounded-lg hover:bg-navy-50 text-xs">OK</button>
          </form>
          <Link href={`/admin/repasses/fechamento?mes=${nextMes}`} className="px-3 py-1.5 border border-navy-100 rounded-lg hover:bg-navy-50">{nextMes} →</Link>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <Kpi label="Receita bruta" value={brl(totalBruto)} />
        <Kpi label="Taxa ALVA retida" value={brl(totalTaxa)} tone="indigo" />
        <Kpi label="A repassar (líquido)" value={brl(totalLiquido)} />
        <Kpi label="Pendente de pagamento" value={brl(totalPendente)} tone={totalPendente > 0 ? 'amber' : 'emerald'} />
      </div>

      <div className="bg-white rounded-xl shadow-soft overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-navy-50 text-ink-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-3 font-semibold">Proprietário</th>
              <th className="text-center px-4 py-3 font-semibold">Repasses</th>
              <th className="text-right px-4 py-3 font-semibold">Bruto</th>
              <th className="text-right px-4 py-3 font-semibold">Taxa ALVA</th>
              <th className="text-right px-4 py-3 font-semibold">Líquido</th>
              <th className="text-right px-4 py-3 font-semibold">Pendente</th>
              <th className="text-left px-4 py-3 font-semibold">Chave PIX</th>
              <th className="text-right px-4 py-3 font-semibold">Ação</th>
            </tr>
          </thead>
          <tbody>
            {linhas.length === 0 && (
              <tr><td colSpan={8} className="text-center text-ink-500 py-10">
                Nenhum repasse neste mês.
              </td></tr>
            )}
            {linhas.map((l) => (
              <tr key={l.proprietario_id} className="border-t border-navy-50">
                <td className="px-4 py-3">
                  <Link href={`/admin/proprietarios/${l.proprietario_id}/relatorio?mes=${mes}`} className="font-medium hover:underline">
                    {l.nome}
                  </Link>
                </td>
                <td className="px-4 py-3 text-center">{l.qtd}</td>
                <td className="px-4 py-3 text-right tabular-nums">{brl(l.bruto)}</td>
                <td className="px-4 py-3 text-right tabular-nums text-ink-500">{brl(l.taxa_alva)}</td>
                <td className="px-4 py-3 text-right tabular-nums font-semibold">{brl(l.liquido)}</td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {l.pendente > 0 ? (
                    <span className="text-amber-700 font-semibold">{brl(l.pendente)}</span>
                  ) : (
                    <span className="text-emerald-700">✓ {brl(l.pago)}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs font-mono">
                  {l.chave_pix ?? <span className="text-ink-400 italic">— cadastrar —</span>}
                </td>
                <td className="px-4 py-3 text-right">
                  {l.pendente > 0 ? (
                    <PagarButton
                      proprietarioId={l.proprietario_id}
                      mes={mes}
                      valor={l.pendente}
                      nome={l.nome}
                      temChave={!!(l.chave_pix || l.email)}
                    />
                  ) : (
                    <span className="text-xs text-emerald-700">pago</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-ink-500 mt-3">
        Um único PIX é disparado por proprietário/mês, somando todos os repasses pendentes.
        {process.env.INTER_PIX_ENABLED === 'true'
          ? ' Modo real — PIX enviado via Banco Inter.'
          : ' Modo STUB — credenciais Inter ainda não destravadas; repasses são marcados como pagos localmente com end-to-end-id sintético.'}
      </p>
    </div>
  );
}

function Kpi({ label, value, tone = 'navy' }: { label: string; value: string; tone?: 'navy' | 'indigo' | 'amber' | 'emerald' }) {
  const bg =
    tone === 'indigo' ? 'text-indigo-700'
    : tone === 'amber' ? 'text-amber-700'
    : tone === 'emerald' ? 'text-emerald-700'
    : 'text-navy-900';
  return (
    <div className="bg-white rounded-xl p-4 shadow-soft">
      <div className="text-xs text-ink-500 uppercase font-semibold">{label}</div>
      <div className={`text-xl font-bold mt-1 ${bg}`}>{value}</div>
    </div>
  );
}
