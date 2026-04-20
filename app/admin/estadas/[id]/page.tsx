import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { brl, formatDate } from '@/lib/utils';

export const metadata = { title: 'Detalhe da estada' };
export const dynamic = 'force-dynamic';

type Tab = 'estadia' | 'hospede' | 'pagamentos' | 'historico';

const statusBoleto: Record<string, string> = {
  pendente: 'bg-amber-50 text-amber-700',
  pago: 'bg-emerald-50 text-emerald-700',
  cancelado: 'bg-ink-100 text-ink-600',
  reembolsado: 'bg-rose-50 text-rose-700',
};

export default async function EstadaDetalhePage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { tab?: Tab };
}) {
  const tab: Tab = searchParams.tab ?? 'estadia';
  const supabase = createClient();

  const { data: estada } = await supabase
    .from('estadas')
    .select(`
      *,
      imovel:imoveis (id, codigo, endereco, numero, bairro, cidade, uf),
      hospede:hospedes (id, nome, documento, email, telefone, pais, origem)
    `)
    .eq('id', params.id)
    .maybeSingle();

  if (!estada) notFound();

  const { data: pagamentos } = await supabase
    .from('estada_pagamentos')
    .select('*')
    .eq('estada_id', params.id)
    .order('data_vencimento', { ascending: true });

  const noites = Math.max(
    1,
    Math.round(
      (new Date(estada.data_checkout).getTime() - new Date(estada.data_checkin).getTime()) / 86400000
    )
  );
  const totalPago = (pagamentos ?? [])
    .filter((p: any) => p.status === 'pago')
    .reduce((s: number, p: any) => s + Number(p.valor), 0);
  const totalEstada = Number(estada.valor_total ?? 0);
  const saldo = totalEstada - totalPago;

  return (
    <div className="px-8 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-xs uppercase tracking-wider text-ink-400 font-semibold">Estada</div>
          <h1 className="text-2xl font-bold text-navy-900">{estada.codigo}</h1>
          <p className="text-sm text-ink-500">
            {formatDate(estada.data_checkin)} → {formatDate(estada.data_checkout)} · {noites} noite{noites > 1 ? 's' : ''} · {estada.numero_hospedes} hóspede{estada.numero_hospedes > 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {estada.token_publico && (
            <Link href={`/estadia/${estada.token_publico}`} target="_blank" rel="noopener">
              <Button variant="outline">👁️ Ver como hóspede</Button>
            </Link>
          )}
          <Link href={`/admin/estadas/${estada.id}/editar`}>
            <Button variant="outline">Editar</Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card label="Imóvel">
          <div className="font-semibold text-navy-900">{estada.imovel?.codigo}</div>
          <div className="text-sm">{estada.imovel?.endereco}{estada.imovel?.numero ? `, ${estada.imovel.numero}` : ''}</div>
          <div className="text-xs text-ink-500">{estada.imovel?.bairro} · {estada.imovel?.cidade}/{estada.imovel?.uf}</div>
        </Card>

        <Card label="Hóspede">
          {estada.hospede ? (
            <>
              <div className="font-semibold text-navy-900">{estada.hospede.nome}</div>
              {estada.hospede.documento && <div className="text-xs font-mono">{estada.hospede.documento}</div>}
              {estada.hospede.email && <div className="text-xs text-ink-500">{estada.hospede.email}</div>}
              {estada.hospede.telefone && <div className="text-xs text-ink-500">{estada.hospede.telefone}</div>}
            </>
          ) : (
            <div className="text-sm text-ink-400 italic">Sem hóspede vinculado</div>
          )}
        </Card>

        <Card label="Financeiro">
          <div className="text-2xl font-bold text-navy-900">{brl(totalEstada)}</div>
          <div className="text-xs text-ink-500">
            Diária {brl(Number(estada.valor_diaria ?? 0))} × {noites}
          </div>
          <div className="text-xs text-ink-500 mt-1">
            Pago {brl(totalPago)} · Saldo <strong className={saldo > 0 ? 'text-rose-600' : 'text-emerald-600'}>{brl(saldo)}</strong>
          </div>
          <div className="text-xs text-ink-500 mt-1">
            Canal {estada.canal} · Taxa plataforma {brl(Number(estada.taxa_plataforma ?? 0))}
          </div>
        </Card>
      </div>

      <div className="border-b border-navy-100 mb-4">
        <nav className="flex gap-1 -mb-px">
          <TabLink id={estada.id} active={tab} tab="estadia" label="Estadia" />
          <TabLink id={estada.id} active={tab} tab="hospede" label="Hóspede" />
          <TabLink id={estada.id} active={tab} tab="pagamentos" label={`Pagamentos (${pagamentos?.length ?? 0})`} />
          <TabLink id={estada.id} active={tab} tab="historico" label="Histórico" />
        </nav>
      </div>

      <div className="bg-white rounded-xl shadow-soft">
        {tab === 'estadia' && <EstadiaTab estada={estada} noites={noites} />}
        {tab === 'hospede' && <HospedeTab hospede={estada.hospede} />}
        {tab === 'pagamentos' && <PagamentosTab pagamentos={pagamentos ?? []} />}
        {tab === 'historico' && (
          <div className="p-12 text-center text-sm text-ink-500">
            Histórico de eventos (check-in, mensagens, limpeza) chega nas próximas etapas.
          </div>
        )}
      </div>
    </div>
  );
}

function Card({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-soft">
      <div className="text-xs text-ink-500 font-semibold uppercase mb-2">{label}</div>
      {children}
    </div>
  );
}

function TabLink({ id, active, tab, label }: { id: string; active: string; tab: Tab; label: string }) {
  const isActive = active === tab;
  return (
    <Link
      href={`/admin/estadas/${id}?tab=${tab}`}
      className={`px-4 py-2 text-sm border-b-2 ${
        isActive ? 'border-navy-900 text-navy-900 font-semibold' : 'border-transparent text-ink-500 hover:text-navy-900'
      }`}
    >
      {label}
    </Link>
  );
}

function EstadiaTab({ estada, noites }: { estada: any; noites: number }) {
  return (
    <div className="p-6 grid grid-cols-2 gap-6 text-sm">
      <Info label="Canal" value={estada.canal} />
      <Info label="Status" value={estada.status.replace('_', ' ')} />
      <Info label="ID no canal" value={estada.canal_reserva_id ?? '—'} />
      <Info label="Noites" value={String(noites)} />
      <Info label="Diária" value={brl(Number(estada.valor_diaria ?? 0))} />
      <Info label="Total" value={brl(Number(estada.valor_total ?? 0))} />
      <Info label="Taxa limpeza" value={brl(Number(estada.taxa_limpeza ?? 0))} />
      <Info label="Taxa plataforma" value={brl(Number(estada.taxa_plataforma ?? 0))} />
      <Info label="Taxa adm. ALVA" value={`${Number(estada.taxa_administracao_pct ?? 10).toFixed(2)}%`} />
      {estada.observacoes && (
        <div className="col-span-2">
          <div className="text-xs font-semibold text-ink-500 uppercase">Observações</div>
          <div className="mt-1 whitespace-pre-wrap">{estada.observacoes}</div>
        </div>
      )}
    </div>
  );
}

function HospedeTab({ hospede }: { hospede: any }) {
  if (!hospede) {
    return <div className="p-12 text-center text-sm text-ink-500">Estada sem hóspede vinculado.</div>;
  }
  return (
    <div className="p-6 grid grid-cols-2 gap-6 text-sm">
      <Info label="Nome" value={hospede.nome} />
      <Info label="Documento" value={hospede.documento ?? '—'} />
      <Info label="Email" value={hospede.email ?? '—'} />
      <Info label="Telefone" value={hospede.telefone ?? '—'} />
      <Info label="País" value={hospede.pais ?? 'BR'} />
      <Info label="Origem" value={hospede.origem ?? '—'} />
    </div>
  );
}

function PagamentosTab({ pagamentos }: { pagamentos: any[] }) {
  if (pagamentos.length === 0) {
    return (
      <div className="p-8 text-center text-sm text-ink-500">
        Nenhum pagamento registrado.
      </div>
    );
  }
  return (
    <table className="w-full text-sm">
      <thead className="bg-navy-50 text-ink-500 text-xs uppercase">
        <tr>
          <th className="text-left px-4 py-3 font-semibold">Tipo</th>
          <th className="text-right px-4 py-3 font-semibold">Valor</th>
          <th className="text-left px-4 py-3 font-semibold">Vencimento</th>
          <th className="text-left px-4 py-3 font-semibold">Pagamento</th>
          <th className="text-center px-4 py-3 font-semibold">Forma</th>
          <th className="text-center px-4 py-3 font-semibold">Status</th>
        </tr>
      </thead>
      <tbody>
        {pagamentos.map((p) => (
          <tr key={p.id} className="border-t border-navy-50">
            <td className="px-4 py-3 capitalize">{p.tipo}</td>
            <td className="px-4 py-3 text-right tabular-nums">{brl(Number(p.valor))}</td>
            <td className="px-4 py-3">{p.data_vencimento ? formatDate(p.data_vencimento) : '—'}</td>
            <td className="px-4 py-3">{p.data_pagamento ? formatDate(p.data_pagamento) : '—'}</td>
            <td className="px-4 py-3 text-center text-xs">{p.forma ?? '—'}</td>
            <td className="px-4 py-3 text-center">
              <span className={`text-xs px-2 py-1 rounded-full capitalize ${statusBoleto[p.status] ?? ''}`}>
                {p.status}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-semibold text-ink-500 uppercase">{label}</div>
      <div className="mt-1 capitalize">{value}</div>
    </div>
  );
}
