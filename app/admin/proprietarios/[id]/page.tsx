import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { brl, formatDate } from '@/lib/utils';
import { DeleteButton } from '../delete-button';

export const metadata = { title: 'Proprietário' };
export const dynamic = 'force-dynamic';

type Tab = 'dados' | 'imoveis' | 'repasses';

function formatDoc(d: string | null) {
  if (!d) return '—';
  const n = d.replace(/\D/g, '');
  if (n.length === 11) return n.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  if (n.length === 14) return n.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  return d;
}

const statusImovelCls: Record<string, string> = {
  vago: 'bg-ink-100 text-ink-600',
  alugado: 'bg-emerald-50 text-emerald-700',
  manutencao: 'bg-amber-50 text-amber-700',
  vendido: 'bg-navy-100 text-navy-900',
};

const statusRepasseCls: Record<string, string> = {
  pendente: 'bg-amber-50 text-amber-700',
  pago: 'bg-emerald-50 text-emerald-700',
  cancelado: 'bg-ink-100 text-ink-600',
};

export default async function ProprietarioDetalhePage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { tab?: Tab };
}) {
  const tab: Tab = searchParams.tab ?? 'dados';
  const supabase = createClient();

  const { data: p } = await supabase
    .from('proprietarios')
    .select('*')
    .eq('id', params.id)
    .maybeSingle();
  if (!p) notFound();

  const [{ data: imoveis }, { data: contratos }, { data: repasses }] = await Promise.all([
    supabase
      .from('imoveis')
      .select('id, codigo, tipo, endereco, numero, bairro, cidade, uf, status')
      .eq('proprietario_id', params.id)
      .order('codigo'),
    supabase
      .from('contratos')
      .select(
        'id, codigo, valor_aluguel, taxa_administracao_pct, status, imovel:imoveis!inner(proprietario_id)'
      )
      .eq('status', 'ativo')
      .eq('imovel.proprietario_id', params.id),
    supabase
      .from('repasses')
      .select('id, valor_bruto, valor_taxa, valor_liquido, status, data_repasse, created_at')
      .eq('proprietario_id', params.id)
      .order('created_at', { ascending: false })
      .limit(50),
  ]);

  const mrrBruto = (contratos ?? []).reduce((s, c) => s + Number(c.valor_aluguel), 0);
  const taxaRetida = (contratos ?? []).reduce(
    (s, c) => s + Number(c.valor_aluguel) * (Number(c.taxa_administracao_pct ?? 10) / 100),
    0
  );
  const mrrLiquido = mrrBruto - taxaRetida;

  const repassesPendentes = (repasses ?? []).filter((r) => r.status === 'pendente');
  const totalPendente = repassesPendentes.reduce((s, r) => s + Number(r.valor_liquido), 0);

  return (
    <div className="px-8 py-6">
      <nav aria-label="Breadcrumb" className="text-xs text-ink-400 mb-2">
        <Link href="/admin/dashboard" className="hover:underline">Admin</Link>
        <span className="mx-1.5">/</span>
        <Link href="/admin/proprietarios" className="hover:underline">Proprietários</Link>
        <span className="mx-1.5">/</span>
        <span className="text-ink-500">{p.nome}</span>
      </nav>

      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="text-xs uppercase tracking-wider text-ink-400 font-semibold">
            Proprietário
          </div>
          <h1 className="text-2xl font-bold text-navy-900">{p.nome}</h1>
          <p className="text-sm text-ink-500 font-mono">{formatDoc(p.cpf_cnpj)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/admin/proprietarios/${p.id}/relatorio`}>
            <Button variant="outline">📊 Relatório consolidado</Button>
          </Link>
          <Link href={`/admin/proprietarios/${p.id}/editar`}>
            <Button variant="outline">Editar</Button>
          </Link>
          <DeleteButton id={p.id} nome={p.nome} variant="button" />
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <KPI label="Imóveis" value={String(imoveis?.length ?? 0)} hint="na carteira" />
        <KPI
          label="Contratos ativos"
          value={String(contratos?.length ?? 0)}
          hint={`MRR bruto ${brl(mrrBruto)}`}
        />
        <KPI
          label="Repasse mensal previsto"
          value={brl(mrrLiquido)}
          hint={`ALVA retém ${brl(taxaRetida)}`}
        />
        <KPI
          label="A repassar"
          value={brl(totalPendente)}
          hint={`${repassesPendentes.length} pendente${repassesPendentes.length === 1 ? '' : 's'}`}
          tone={totalPendente > 0 ? 'warning' : 'default'}
        />
      </div>

      {/* Tabs */}
      <div className="border-b border-navy-100 mb-4">
        <nav className="flex gap-1 -mb-px" role="tablist">
          <TabLink id={p.id} active={tab} tab="dados" label="Dados" />
          <TabLink id={p.id} active={tab} tab="imoveis" label={`Imóveis (${imoveis?.length ?? 0})`} />
          <TabLink id={p.id} active={tab} tab="repasses" label={`Repasses (${repasses?.length ?? 0})`} />
        </nav>
      </div>

      <div className="bg-white rounded-xl shadow-soft">
        {tab === 'dados' && <DadosTab p={p} />}
        {tab === 'imoveis' && <ImoveisTab itens={imoveis ?? []} />}
        {tab === 'repasses' && <RepassesTab itens={repasses ?? []} />}
      </div>
    </div>
  );
}

function KPI({
  label,
  value,
  hint,
  tone = 'default',
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: 'default' | 'warning';
}) {
  const toneCls = tone === 'warning' ? 'text-amber-600' : 'text-navy-900';
  return (
    <div className="bg-white rounded-xl p-5 shadow-soft">
      <div className="text-xs text-ink-500 font-semibold uppercase">{label}</div>
      <div className={`text-2xl font-bold mt-1 tabular-nums ${toneCls}`}>{value}</div>
      {hint && <div className="text-xs text-ink-500 mt-1">{hint}</div>}
    </div>
  );
}

function TabLink({ id, active, tab, label }: { id: string; active: string; tab: Tab; label: string }) {
  const isActive = active === tab;
  return (
    <Link
      href={`/admin/proprietarios/${id}?tab=${tab}`}
      role="tab"
      aria-selected={isActive}
      className={`px-4 py-2 text-sm border-b-2 focus:outline-none focus:ring-2 focus:ring-navy-900/20 rounded-t-md ${
        isActive
          ? 'border-navy-900 text-navy-900 font-semibold'
          : 'border-transparent text-ink-500 hover:text-navy-900'
      }`}
    >
      {label}
    </Link>
  );
}

function DadosTab({ p }: { p: any }) {
  return (
    <dl className="p-6 grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
      <Info label="Nome / Razão social" value={p.nome} />
      <Info label="CPF / CNPJ" value={formatDoc(p.cpf_cnpj)} mono />
      <Info label="E-mail" value={p.email ?? '—'} />
      <Info label="Telefone" value={p.telefone ?? '—'} />
      <Info label="Taxa de administração" value={`${Number(p.comissao_pct ?? 0).toFixed(2)}%`} />
      <Info label="Cadastrado em" value={formatDate(p.created_at)} />
      {p.observacoes && (
        <div className="col-span-2">
          <dt className="text-xs font-semibold text-ink-500 uppercase tracking-wide">Observações</dt>
          <dd className="mt-1 text-sm text-ink-600 whitespace-pre-wrap">{p.observacoes}</dd>
        </div>
      )}
    </dl>
  );
}

function Info({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs font-semibold text-ink-500 uppercase tracking-wide">{label}</dt>
      <dd className={`mt-1 text-navy-900 ${mono ? 'font-mono text-xs' : ''}`}>{value}</dd>
    </div>
  );
}

function ImoveisTab({ itens }: { itens: any[] }) {
  if (itens.length === 0) {
    return (
      <div className="p-12 text-center text-sm text-ink-500">
        Nenhum imóvel vinculado.{' '}
        <Link href="/admin/imoveis/novo" className="text-navy-900 font-semibold hover:underline">
          Cadastrar imóvel
        </Link>
      </div>
    );
  }
  return (
    <table className="w-full text-sm">
      <thead className="bg-navy-50/40 text-ink-500 text-xs uppercase tracking-wider">
        <tr>
          <th className="text-left px-4 py-3 font-semibold">Código</th>
          <th className="text-left px-4 py-3 font-semibold">Tipo</th>
          <th className="text-left px-4 py-3 font-semibold">Endereço</th>
          <th className="text-center px-4 py-3 font-semibold">Status</th>
          <th className="text-right px-4 py-3 font-semibold"></th>
        </tr>
      </thead>
      <tbody>
        {itens.map((i) => (
          <tr key={i.id} className="border-t border-navy-50 hover:bg-navy-50/30">
            <td className="px-4 py-3 font-semibold text-navy-900">{i.codigo}</td>
            <td className="px-4 py-3 capitalize text-ink-600">{i.tipo}</td>
            <td className="px-4 py-3 text-ink-600">
              {i.endereco}
              {i.numero ? `, ${i.numero}` : ''} · {i.bairro}, {i.cidade}/{i.uf}
            </td>
            <td className="px-4 py-3 text-center">
              <span
                className={`text-xs px-2 py-1 rounded-full capitalize ${statusImovelCls[i.status] ?? ''}`}
              >
                {i.status}
              </span>
            </td>
            <td className="px-4 py-3 text-right">
              <Link
                href={`/admin/imoveis/${i.id}/editar`}
                className="text-xs text-navy-900 hover:underline font-semibold"
              >
                editar
              </Link>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function RepassesTab({ itens }: { itens: any[] }) {
  if (itens.length === 0) {
    return (
      <div className="p-12 text-center text-sm text-ink-500">
        Nenhum repasse registrado. Repasses são criados automaticamente quando boletos forem pagos.
      </div>
    );
  }
  return (
    <table className="w-full text-sm">
      <thead className="bg-navy-50/40 text-ink-500 text-xs uppercase tracking-wider">
        <tr>
          <th className="text-left px-4 py-3 font-semibold">Gerado em</th>
          <th className="text-right px-4 py-3 font-semibold">Bruto</th>
          <th className="text-right px-4 py-3 font-semibold">Taxa ALVA</th>
          <th className="text-right px-4 py-3 font-semibold">Líquido</th>
          <th className="text-center px-4 py-3 font-semibold">Status</th>
          <th className="text-left px-4 py-3 font-semibold">Pago em</th>
        </tr>
      </thead>
      <tbody>
        {itens.map((r) => (
          <tr key={r.id} className="border-t border-navy-50">
            <td className="px-4 py-3">{formatDate(r.created_at)}</td>
            <td className="px-4 py-3 text-right tabular-nums">{brl(Number(r.valor_bruto))}</td>
            <td className="px-4 py-3 text-right tabular-nums text-ink-500">
              −{brl(Number(r.valor_taxa))}
            </td>
            <td className="px-4 py-3 text-right tabular-nums font-semibold text-navy-900">
              {brl(Number(r.valor_liquido))}
            </td>
            <td className="px-4 py-3 text-center">
              <span
                className={`text-xs px-2 py-1 rounded-full capitalize ${statusRepasseCls[r.status] ?? ''}`}
              >
                {r.status}
              </span>
            </td>
            <td className="px-4 py-3">{r.data_repasse ? formatDate(r.data_repasse) : '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
