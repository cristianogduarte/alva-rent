import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { brl } from '@/lib/utils';

export const metadata = { title: 'Dashboard' };
export const dynamic = 'force-dynamic';

interface KPIs {
  receitaPrevista: number;
  receitaRealizada: number;
  emAtraso: number;
  totalImoveis: number;
  imoveisAlugados: number;
  mrrContratos: number;
  contratosAtivos: number;
  contratosVencendo60d: number;
  pendenciasAbertas: number;
}

async function getData() {
  const supabase = createClient();
  const hoje = new Date();
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const em60d = new Date(hoje);
  em60d.setDate(em60d.getDate() + 60);

  const [
    boletosRes,
    imoveisRes,
    imoveisAlugadosRes,
    contratosRes,
    contratosListRes,
    pendenciasRes,
    limpezasRes,
    manutencoesRes,
  ] = await Promise.all([
    supabase
      .from('boletos')
      .select('valor_total, valor_pago, status')
      .gte('competencia', inicioMes.toISOString().slice(0, 10)),
    supabase.from('imoveis').select('*', { count: 'exact', head: true }),
    supabase
      .from('imoveis')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'alugado'),
    supabase
      .from('contratos')
      .select('valor_aluguel, data_fim, status')
      .eq('status', 'ativo'),
    supabase
      .from('contratos')
      .select(
        'id, codigo, valor_aluguel, dia_vencimento, data_fim, status, imovel:imoveis(codigo, bairro, cidade), inquilino:inquilinos(nome)'
      )
      .eq('status', 'ativo')
      .order('data_fim', { ascending: true })
      .limit(10),
    supabase
      .from('pendencias')
      .select('*', { count: 'exact', head: true })
      .in('status', ['aberta', 'em_andamento']),
    supabase
      .from('limpezas')
      .select(`
        id, status, agendada_para, concluida_em,
        estada:estadas(codigo, data_checkout, imovel:imoveis(codigo)),
        equipe:equipe_limpeza(nome)
      `)
      .in('status', ['pendente', 'agendada', 'em_andamento'])
      .order('agendada_para', { ascending: true, nullsFirst: true })
      .limit(6),
    supabase
      .from('manutencoes')
      .select(`
        id, titulo, tipo, prioridade, status, aberta_em,
        imovel:imoveis(codigo)
      `)
      .in('status', ['aberta', 'agendada', 'em_andamento'])
      .order('prioridade', { ascending: false })
      .order('aberta_em', { ascending: false })
      .limit(6),
  ]);

  const boletos = boletosRes.data ?? [];
  const contratos = contratosRes.data ?? [];

  const receitaPrevista = boletos.reduce((s, b) => s + Number(b.valor_total), 0);
  const receitaRealizada = boletos
    .filter((b) => b.status === 'pago')
    .reduce((s, b) => s + Number(b.valor_pago ?? b.valor_total), 0);
  const emAtraso = boletos
    .filter((b) => b.status === 'vencido')
    .reduce((s, b) => s + Number(b.valor_total), 0);

  const mrrContratos = contratos.reduce((s, c) => s + Number(c.valor_aluguel), 0);
  const contratosVencendo60d = contratos.filter((c) => {
    if (!c.data_fim) return false;
    const fim = new Date(c.data_fim);
    return fim >= hoje && fim <= em60d;
  }).length;

  const kpis: KPIs = {
    receitaPrevista,
    receitaRealizada,
    emAtraso,
    totalImoveis: imoveisRes.count ?? 0,
    imoveisAlugados: imoveisAlugadosRes.count ?? 0,
    mrrContratos,
    contratosAtivos: contratos.length,
    contratosVencendo60d,
    pendenciasAbertas: pendenciasRes.count ?? 0,
  };

  return {
    kpis,
    contratosAtivos: contratosListRes.data ?? [],
    limpezas: limpezasRes.data ?? [],
    manutencoes: manutencoesRes.data ?? [],
  };
}

export default async function DashboardPage() {
  const { kpis, contratosAtivos, limpezas, manutencoes } = await getData();
  const ocupacao = kpis.totalImoveis
    ? Math.round((kpis.imoveisAlugados / kpis.totalImoveis) * 100)
    : 0;
  const aderencia = kpis.receitaPrevista
    ? Math.round((kpis.receitaRealizada / kpis.receitaPrevista) * 100)
    : 0;

  return (
    <div className="px-8 py-6">
      <div className="mb-6">
        <div className="text-xs uppercase tracking-wider text-ink-400 font-semibold">
          Visão Geral
        </div>
        <h1 className="text-2xl font-bold text-navy-900">Dashboard ALVA Rent</h1>
        <p className="text-sm text-ink-500">
          {new Date().toLocaleDateString('pt-BR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-4">
        <KPICard
          label="MRR (aluguéis ativos)"
          value={brl(kpis.mrrContratos)}
          hint={`${kpis.contratosAtivos} contrato${kpis.contratosAtivos === 1 ? '' : 's'} ativo${kpis.contratosAtivos === 1 ? '' : 's'}`}
        />
        <KPICard
          label="Receita prevista"
          value={brl(kpis.receitaPrevista)}
          hint="boletos do mês corrente"
        />
        <KPICard
          label="Realizado"
          value={brl(kpis.receitaRealizada)}
          hint={`${aderencia}% do previsto`}
        />
        <KPICard
          label="Em atraso"
          value={brl(kpis.emAtraso)}
          hint="boletos vencidos"
          tone={kpis.emAtraso > 0 ? 'danger' : 'default'}
        />
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <KPICard
          label="Ocupação"
          value={`${ocupacao}%`}
          hint={`${kpis.imoveisAlugados} de ${kpis.totalImoveis} imóveis`}
        />
        <KPICard
          label="Contratos vencendo"
          value={String(kpis.contratosVencendo60d)}
          hint="próximos 60 dias"
          tone={kpis.contratosVencendo60d > 0 ? 'warning' : 'default'}
        />
        <KPICard
          label="Pendências"
          value={String(kpis.pendenciasAbertas)}
          hint="abertas / em andamento"
          tone={kpis.pendenciasAbertas > 0 ? 'warning' : 'default'}
        />
        <KPICard
          label="Imóveis vagos"
          value={String(kpis.totalImoveis - kpis.imoveisAlugados)}
          hint="disponíveis pra locação"
        />
      </div>

      {/* Operações — precisa de ação */}
      <div className="mb-6">
        <div className="text-xs uppercase tracking-wider text-ink-400 font-semibold mb-3">
          Operações · precisa de ação
        </div>
        <div className="grid grid-cols-2 gap-4">
          <OperacoesCard
            titulo="🧹 Limpezas pendentes"
            total={limpezas.length}
            hrefLista="/admin/limpeza"
            tomVazio="Nenhuma limpeza em aberto."
            itens={limpezas.map((l: any) => {
              const est = Array.isArray(l.estada) ? l.estada[0] : l.estada;
              const imv = est && (Array.isArray(est.imovel) ? est.imovel[0] : est.imovel);
              const eqp = Array.isArray(l.equipe) ? l.equipe[0] : l.equipe;
              return {
                id: l.id,
                href: `/admin/limpeza/${l.id}`,
                titulo: `${imv?.codigo ?? '—'} · ${est?.codigo ?? ''}`,
                subtitulo: eqp?.nome
                  ? `Equipe ${eqp.nome}`
                  : 'Sem equipe atribuída',
                meta: l.agendada_para
                  ? new Date(l.agendada_para).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
                  : est?.data_checkout
                    ? `saída ${new Date(est.data_checkout).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`
                    : '—',
                statusLabel: l.status.replace('_', ' '),
                statusTone:
                  l.status === 'pendente'
                    ? 'rose'
                    : l.status === 'agendada'
                      ? 'amber'
                      : 'sky',
              };
            })}
          />

          <OperacoesCard
            titulo="🔧 Manutenção aberta"
            total={manutencoes.length}
            hrefLista="/admin/manutencao"
            tomVazio="Nenhum ticket em aberto."
            itens={manutencoes.map((m: any) => {
              const imv = Array.isArray(m.imovel) ? m.imovel[0] : m.imovel;
              return {
                id: m.id,
                href: `/admin/manutencao/${m.id}`,
                titulo: m.titulo,
                subtitulo: `${imv?.codigo ?? '—'} · ${m.tipo}`,
                meta: new Date(m.aberta_em).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
                statusLabel: m.prioridade,
                statusTone:
                  m.prioridade === 'urgente'
                    ? 'rose'
                    : m.prioridade === 'alta'
                      ? 'amber'
                      : m.prioridade === 'media'
                        ? 'sky'
                        : 'ink',
              };
            })}
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-soft overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-navy-50">
          <div>
            <div className="text-xs uppercase tracking-wider text-ink-400 font-semibold">
              Contratos ativos
            </div>
            <h2 className="text-base font-semibold text-navy-900">
              Próximos vencimentos de contrato
            </h2>
          </div>
          <Link
            href="/admin/contratos"
            className="text-xs font-semibold text-navy-900 hover:underline"
          >
            ver todos →
          </Link>
        </div>

        {contratosAtivos.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-ink-500">
            Nenhum contrato ativo ainda.{' '}
            <Link href="/admin/contratos/novo" className="text-navy-900 font-semibold hover:underline">
              Criar o primeiro
            </Link>
            .
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-navy-50/40 text-xs uppercase tracking-wider text-ink-500">
              <tr>
                <th className="text-left px-6 py-3 font-semibold">Contrato</th>
                <th className="text-left px-6 py-3 font-semibold">Imóvel</th>
                <th className="text-left px-6 py-3 font-semibold">Inquilino</th>
                <th className="text-right px-6 py-3 font-semibold">Aluguel</th>
                <th className="text-center px-6 py-3 font-semibold">Venc.</th>
                <th className="text-left px-6 py-3 font-semibold">Término</th>
              </tr>
            </thead>
            <tbody>
              {contratosAtivos.map((c: any) => {
                const imv = Array.isArray(c.imovel) ? c.imovel[0] : c.imovel;
                const inq = Array.isArray(c.inquilino) ? c.inquilino[0] : c.inquilino;
                const fim = c.data_fim ? new Date(c.data_fim) : null;
                const diasRestantes = fim
                  ? Math.ceil((fim.getTime() - Date.now()) / 86400000)
                  : null;
                const alerta =
                  diasRestantes !== null && diasRestantes <= 60 && diasRestantes >= 0;
                return (
                  <tr key={c.id} className="border-t border-navy-50 hover:bg-navy-50/30">
                    <td className="px-6 py-3">
                      <Link
                        href={`/admin/contratos/${c.id}`}
                        className="font-semibold text-navy-900 hover:underline"
                      >
                        {c.codigo}
                      </Link>
                    </td>
                    <td className="px-6 py-3 text-ink-600">
                      {imv ? `${imv.codigo} · ${imv.bairro}, ${imv.cidade}` : '—'}
                    </td>
                    <td className="px-6 py-3 text-ink-600">{inq?.nome ?? '—'}</td>
                    <td className="px-6 py-3 text-right font-semibold text-navy-900">
                      {brl(Number(c.valor_aluguel))}
                    </td>
                    <td className="px-6 py-3 text-center text-ink-600">
                      dia {c.dia_vencimento}
                    </td>
                    <td className="px-6 py-3">
                      {fim ? (
                        <span
                          className={
                            alerta
                              ? 'text-amber-600 font-semibold'
                              : 'text-ink-600'
                          }
                        >
                          {fim.toLocaleDateString('pt-BR')}
                          {diasRestantes !== null && diasRestantes >= 0 && (
                            <span className="text-xs text-ink-400 ml-1">
                              ({diasRestantes}d)
                            </span>
                          )}
                        </span>
                      ) : (
                        '—'
                      )}
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

type TomStatus = 'rose' | 'amber' | 'sky' | 'ink';

function OperacoesCard({
  titulo,
  total,
  hrefLista,
  tomVazio,
  itens,
}: {
  titulo: string;
  total: number;
  hrefLista: string;
  tomVazio: string;
  itens: Array<{
    id: string;
    href: string;
    titulo: string;
    subtitulo: string;
    meta: string;
    statusLabel: string;
    statusTone: TomStatus;
  }>;
}) {
  const tones: Record<TomStatus, string> = {
    rose: 'bg-rose-50 text-rose-700',
    amber: 'bg-amber-50 text-amber-700',
    sky: 'bg-sky-50 text-sky-700',
    ink: 'bg-ink-100 text-ink-600',
  };
  return (
    <div className="bg-white rounded-xl shadow-soft overflow-hidden flex flex-col">
      <div className="flex items-center justify-between px-5 py-3 border-b border-navy-50">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-navy-900">{titulo}</h3>
          {total > 0 && (
            <span className="text-[11px] bg-navy-900 text-white px-2 py-0.5 rounded-full font-bold">
              {total}
            </span>
          )}
        </div>
        <Link href={hrefLista} className="text-xs font-semibold text-navy-900 hover:underline">
          ver todos →
        </Link>
      </div>
      {itens.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-ink-400 flex-1 flex items-center justify-center">
          {tomVazio}
        </div>
      ) : (
        <ul className="divide-y divide-navy-50">
          {itens.map((it) => (
            <li key={it.id}>
              <Link
                href={it.href}
                className="flex items-center gap-3 px-5 py-3 hover:bg-navy-50 transition"
              >
                <span className={`text-[10px] px-2 py-1 rounded-full uppercase font-bold ${tones[it.statusTone]}`}>
                  {it.statusLabel}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-navy-900 truncate">{it.titulo}</div>
                  <div className="text-xs text-ink-500 truncate">{it.subtitulo}</div>
                </div>
                <div className="text-xs text-ink-500 whitespace-nowrap">{it.meta}</div>
                <span className="text-ink-400">→</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function KPICard({
  label,
  value,
  hint,
  tone = 'default',
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: 'default' | 'danger' | 'warning';
}) {
  const toneCls =
    tone === 'danger'
      ? 'text-rose-600'
      : tone === 'warning'
        ? 'text-amber-600'
        : 'text-navy-900';
  return (
    <div className="bg-white rounded-xl p-5 shadow-soft">
      <div className="text-xs text-ink-500 font-semibold uppercase">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${toneCls}`}>{value}</div>
      {hint && <div className="text-xs text-ink-500 mt-1">{hint}</div>}
    </div>
  );
}
