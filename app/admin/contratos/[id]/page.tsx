import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { brl, formatDate, formatCpf } from '@/lib/utils';
import { DeleteButton } from '../delete-button';
import { UploadForm } from './arquivos/upload-form';
import { FileRow } from './arquivos/file-row';

export const metadata = { title: 'Detalhe do contrato' };
export const dynamic = 'force-dynamic';

type Tab = 'boletos' | 'historico' | 'pendencias' | 'anexos' | 'encargos';

const statusBoleto: Record<string, string> = {
  criado: 'bg-navy-50 text-navy-900',
  enviado: 'bg-sky-50 text-sky-700',
  visualizado: 'bg-indigo-50 text-indigo-700',
  pago: 'bg-emerald-50 text-emerald-700',
  vencido: 'bg-rose-50 text-rose-700',
  cancelado: 'bg-ink-100 text-ink-600',
  expirado: 'bg-ink-100 text-ink-600',
};

export default async function ContratoDetalhePage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { tab?: Tab };
}) {
  const tab: Tab = searchParams.tab ?? 'boletos';
  const supabase = createClient();

  const { data: contrato } = await supabase
    .from('contratos')
    .select(`
      *,
      imovel:imoveis (id, codigo, endereco, numero, bairro, cidade, uf),
      inquilino:inquilinos (id, nome, cpf, email, whatsapp)
    `)
    .eq('id', params.id)
    .maybeSingle();

  if (!contrato) notFound();

  const [{ data: boletos }, { data: historico }, { data: pendencias }, { data: arquivos }] = await Promise.all([
    supabase.from('boletos').select('*').eq('contrato_id', params.id).order('competencia', { ascending: false }),
    supabase.from('historico').select('*').eq('contrato_id', params.id).order('ocorrido_em', { ascending: false }).limit(50),
    supabase.from('pendencias').select('*').eq('contrato_id', params.id).order('created_at', { ascending: false }),
    supabase.from('contrato_arquivos').select('*').eq('contrato_id', params.id).order('uploaded_at', { ascending: false }),
  ]);

  const condLocat = contrato.condominio_responsavel === 'locatario' ? Number(contrato.valor_condominio ?? 0) : 0;
  const iptuLocat = contrato.iptu_responsavel === 'locatario' ? Number(contrato.valor_iptu_mensal ?? 0) : 0;
  const total =
    Number(contrato.valor_aluguel) +
    condLocat +
    iptuLocat +
    Number(contrato.outras_taxas ?? 0);

  return (
    <div className="px-8 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-xs uppercase tracking-wider text-ink-400 font-semibold">
            Contrato
          </div>
          <h1 className="text-2xl font-bold text-navy-900">{contrato.codigo}</h1>
          <p className="text-sm text-ink-500">
            {formatDate(contrato.data_inicio)} a {formatDate(contrato.data_fim)} · Vencimento dia {contrato.dia_vencimento}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/admin/contratos/${contrato.id}/editar`}>
            <Button variant="outline">Editar</Button>
          </Link>
          <DeleteButton id={contrato.id} codigo={contrato.codigo} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card label="Imóvel">
          <div className="font-semibold text-navy-900">{contrato.imovel?.codigo}</div>
          <div className="text-sm">
            {contrato.imovel?.endereco}{contrato.imovel?.numero ? `, ${contrato.imovel.numero}` : ''}
          </div>
          <div className="text-xs text-ink-500">
            {contrato.imovel?.bairro} · {contrato.imovel?.cidade}/{contrato.imovel?.uf}
          </div>
          <Link href={`/admin/imoveis/${contrato.imovel?.id}/editar`} className="text-xs text-navy-900 hover:underline mt-1 inline-block">
            Ver imóvel →
          </Link>
        </Card>

        <Card label="Inquilino">
          <div className="font-semibold text-navy-900">{contrato.inquilino?.nome}</div>
          <div className="text-xs font-mono">{formatCpf(contrato.inquilino?.cpf ?? '')}</div>
          {contrato.inquilino?.email && <div className="text-xs text-ink-500">{contrato.inquilino.email}</div>}
          {contrato.inquilino?.whatsapp && <div className="text-xs text-ink-500">{contrato.inquilino.whatsapp}</div>}
        </Card>

        <Card label="Mensalidade">
          <div className="text-2xl font-bold text-navy-900">{brl(total)}</div>
          <div className="text-xs text-ink-500">
            Aluguel {brl(Number(contrato.valor_aluguel))}
            {Number(contrato.valor_condominio) > 0 && ` · Cond. ${brl(Number(contrato.valor_condominio))}`}
            {Number(contrato.valor_iptu_mensal) > 0 && ` · IPTU ${brl(Number(contrato.valor_iptu_mensal))}`}
          </div>
          <div className="text-xs text-ink-500 mt-1">
            Reajuste {contrato.indice_reajuste} · Multa {contrato.multa_atraso_pct}% · Juros {contrato.juros_dia_pct}%/dia
          </div>
          <div className="text-xs text-ink-500 mt-1">
            Taxa adm. ALVA {Number(contrato.taxa_administracao_pct ?? 10).toFixed(2)}% · Repasse proprietário {brl(total * (1 - Number(contrato.taxa_administracao_pct ?? 10) / 100))}
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="border-b border-navy-100 mb-4">
        <nav className="flex gap-1 -mb-px">
          <TabLink id={contrato.id} active={tab} tab="boletos" label={`Boletos (${boletos?.length ?? 0})`} />
          <TabLink id={contrato.id} active={tab} tab="historico" label={`Histórico (${historico?.length ?? 0})`} />
          <TabLink id={contrato.id} active={tab} tab="pendencias" label={`Pendências (${pendencias?.length ?? 0})`} />
          <TabLink id={contrato.id} active={tab} tab="encargos" label="IPTU/Cond." />
          <TabLink id={contrato.id} active={tab} tab="anexos" label={`Anexos (${arquivos?.length ?? 0})`} />
        </nav>
      </div>

      <div className="bg-white rounded-xl shadow-soft">
        {tab === 'boletos' && <BoletosTab boletos={boletos ?? []} />}
        {tab === 'historico' && <HistoricoTab itens={historico ?? []} />}
        {tab === 'pendencias' && <PendenciasTab itens={pendencias ?? []} />}
        {tab === 'encargos' && <EncargosTab contrato={contrato} />}
        {tab === 'anexos' && <AnexosTab contratoId={contrato.id} arquivos={arquivos ?? []} />}
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
      href={`/admin/contratos/${id}?tab=${tab}`}
      className={`px-4 py-2 text-sm border-b-2 ${
        isActive ? 'border-navy-900 text-navy-900 font-semibold' : 'border-transparent text-ink-500 hover:text-navy-900'
      }`}
    >
      {label}
    </Link>
  );
}

function BoletosTab({ boletos }: { boletos: any[] }) {
  if (boletos.length === 0) {
    return (
      <div className="p-8 text-center text-sm text-ink-500">
        Nenhum boleto emitido ainda. A emissão automática começa na Sprint 3.
      </div>
    );
  }
  return (
    <table className="w-full text-sm">
      <thead className="bg-navy-50 text-ink-500 text-xs uppercase">
        <tr>
          <th className="text-left px-4 py-3 font-semibold">Competência</th>
          <th className="text-left px-4 py-3 font-semibold">Vencimento</th>
          <th className="text-right px-4 py-3 font-semibold">Valor</th>
          <th className="text-center px-4 py-3 font-semibold">Status</th>
          <th className="text-left px-4 py-3 font-semibold">Pagamento</th>
        </tr>
      </thead>
      <tbody>
        {boletos.map((b) => (
          <tr key={b.id} className="border-t border-navy-50">
            <td className="px-4 py-3">{formatDate(b.competencia)}</td>
            <td className="px-4 py-3">{formatDate(b.data_vencimento)}</td>
            <td className="px-4 py-3 text-right">{brl(Number(b.valor_total))}</td>
            <td className="px-4 py-3 text-center">
              <span className={`text-xs px-2 py-1 rounded-full capitalize ${statusBoleto[b.status] ?? ''}`}>
                {b.status}
              </span>
            </td>
            <td className="px-4 py-3 text-xs">
              {b.data_pagamento ? `${formatDate(b.data_pagamento)} · ${b.forma_pagamento ?? ''}` : '—'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const tipoHistorico: Record<string, { icon: string; cls: string; label: string }> = {
  boleto_emitido: { icon: '🧾', cls: 'bg-navy-100 text-navy-900 ring-navy-200', label: 'Boleto emitido' },
  boleto_enviado: { icon: '📤', cls: 'bg-sky-100 text-sky-700 ring-sky-200', label: 'Boleto enviado' },
  boleto_visualizado: { icon: '👁', cls: 'bg-indigo-100 text-indigo-700 ring-indigo-200', label: 'Boleto visualizado' },
  boleto_pago: { icon: '✓', cls: 'bg-emerald-100 text-emerald-700 ring-emerald-200', label: 'Boleto pago' },
  boleto_atrasado: { icon: '⚠', cls: 'bg-rose-100 text-rose-700 ring-rose-200', label: 'Boleto atrasado' },
  mensagem: { icon: '💬', cls: 'bg-sky-50 text-sky-700 ring-sky-200', label: 'Mensagem' },
  ligacao: { icon: '📞', cls: 'bg-violet-50 text-violet-700 ring-violet-200', label: 'Ligação' },
  manutencao: { icon: '🔧', cls: 'bg-amber-50 text-amber-700 ring-amber-200', label: 'Manutenção' },
  vistoria: { icon: '📋', cls: 'bg-teal-50 text-teal-700 ring-teal-200', label: 'Vistoria' },
  reajuste: { icon: '📈', cls: 'bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-200', label: 'Reajuste' },
  renovacao: { icon: '🔁', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200', label: 'Renovação' },
  observacao: { icon: '📝', cls: 'bg-ink-100 text-ink-600 ring-ink-200', label: 'Observação' },
};

function HistoricoTab({ itens }: { itens: any[] }) {
  if (itens.length === 0) {
    return (
      <div className="p-12 text-center text-sm text-ink-500">
        Nenhum evento registrado ainda. O histórico é preenchido automaticamente
        conforme boletos, mensagens e interações acontecem.
      </div>
    );
  }

  // Agrupa por dia (YYYY-MM-DD)
  const grupos = new Map<string, any[]>();
  for (const h of itens) {
    const dia = new Date(h.ocorrido_em).toISOString().slice(0, 10);
    if (!grupos.has(dia)) grupos.set(dia, []);
    grupos.get(dia)!.push(h);
  }
  const hoje = new Date().toISOString().slice(0, 10);
  const ontem = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  return (
    <div className="p-6">
      {[...grupos.entries()].map(([dia, eventos]) => {
        const d = new Date(dia + 'T00:00:00');
        const label =
          dia === hoje
            ? 'Hoje'
            : dia === ontem
              ? 'Ontem'
              : d.toLocaleDateString('pt-BR', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                });
        return (
          <div key={dia} className="mb-6 last:mb-0">
            <div className="sticky top-0 bg-white pb-2 mb-3 border-b border-navy-50">
              <span className="text-xs uppercase tracking-wider text-ink-400 font-semibold">
                {label}
              </span>
            </div>
            <ol className="relative ml-3 border-l-2 border-navy-50 space-y-4 pl-6">
              {eventos.map((h) => {
                const meta = tipoHistorico[h.tipo] ?? {
                  icon: '•',
                  cls: 'bg-ink-100 text-ink-600 ring-ink-200',
                  label: h.tipo,
                };
                const hora = new Date(h.ocorrido_em).toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit',
                });
                return (
                  <li key={h.id} className="relative">
                    <span
                      className={`absolute -left-[34px] flex h-7 w-7 items-center justify-center rounded-full ring-4 ring-white text-xs ${meta.cls}`}
                    >
                      {meta.icon}
                    </span>
                    <div className="flex items-baseline gap-2">
                      <div className="text-sm font-semibold text-navy-900">
                        {h.titulo}
                      </div>
                      <div className="text-xs text-ink-400">{hora}</div>
                    </div>
                    {h.descricao && (
                      <div className="text-xs text-ink-500 mt-0.5">{h.descricao}</div>
                    )}
                    <div className="text-[10px] uppercase tracking-wider text-ink-400 mt-1">
                      {meta.label}
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        );
      })}
    </div>
  );
}

function EncargosTab({ contrato }: { contrato: any }) {
  const rows = [
    {
      nome: 'Aluguel',
      valor: Number(contrato.valor_aluguel),
      responsavel: 'locatario' as const,
      obs: 'Base do contrato',
    },
    {
      nome: 'IPTU mensal',
      valor: Number(contrato.valor_iptu_mensal ?? 0),
      responsavel: contrato.iptu_responsavel as 'locatario' | 'locador',
      obs: contrato.iptu_responsavel === 'locatario' ? 'Cobrado no boleto' : 'Pago pelo proprietário',
    },
    {
      nome: 'Condomínio',
      valor: Number(contrato.valor_condominio ?? 0),
      responsavel: contrato.condominio_responsavel as 'locatario' | 'locador',
      obs: contrato.condominio_responsavel === 'locatario' ? 'Cobrado no boleto' : 'Pago pelo proprietário',
    },
    {
      nome: 'Outras taxas',
      valor: Number(contrato.outras_taxas ?? 0),
      responsavel: 'locatario' as const,
      obs: 'Cobrado no boleto',
    },
  ];
  const totalLocat = rows
    .filter((r) => r.responsavel === 'locatario')
    .reduce((s, r) => s + r.valor, 0);
  const totalLocador = rows
    .filter((r) => r.responsavel === 'locador')
    .reduce((s, r) => s + r.valor, 0);

  return (
    <div className="p-6 space-y-4">
      <table className="w-full text-sm">
        <thead className="bg-navy-50/40 text-ink-500 text-xs uppercase tracking-wider">
          <tr>
            <th className="text-left px-4 py-3 font-semibold">Encargo</th>
            <th className="text-right px-4 py-3 font-semibold">Valor mensal</th>
            <th className="text-center px-4 py-3 font-semibold">Responsável</th>
            <th className="text-left px-4 py-3 font-semibold">Observação</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-navy-50">
              <td className="px-4 py-3 font-medium text-navy-900">{r.nome}</td>
              <td className="px-4 py-3 text-right tabular-nums">{brl(r.valor)}</td>
              <td className="px-4 py-3 text-center">
                <span
                  className={`text-xs px-2 py-1 rounded-full capitalize ${
                    r.responsavel === 'locatario'
                      ? 'bg-navy-100 text-navy-900'
                      : 'bg-indigo-100 text-indigo-700'
                  }`}
                >
                  {r.responsavel === 'locatario' ? 'Locatário' : 'Locador'}
                </span>
              </td>
              <td className="px-4 py-3 text-xs text-ink-500">{r.obs}</td>
            </tr>
          ))}
        </tbody>
        <tfoot className="border-t-2 border-navy-100 bg-navy-50/30">
          <tr>
            <td className="px-4 py-3 font-semibold text-navy-900">Total no boleto mensal (locatário)</td>
            <td className="px-4 py-3 text-right tabular-nums font-bold text-navy-900">{brl(totalLocat)}</td>
            <td colSpan={2}></td>
          </tr>
          {totalLocador > 0 && (
            <tr>
              <td className="px-4 py-3 text-ink-600">Custos mensais do proprietário</td>
              <td className="px-4 py-3 text-right tabular-nums text-ink-600">{brl(totalLocador)}</td>
              <td colSpan={2}></td>
            </tr>
          )}
        </tfoot>
      </table>
    </div>
  );
}

function AnexosTab({ contratoId, arquivos }: { contratoId: string; arquivos: any[] }) {
  return (
    <div className="p-6 space-y-4">
      <UploadForm contratoId={contratoId} />
      {arquivos.length === 0 ? (
        <div className="p-8 text-center text-sm text-ink-500">Nenhum anexo ainda.</div>
      ) : (
        <div className="rounded-xl border border-navy-50 overflow-hidden">
          {arquivos.map((a) => (
            <FileRow key={a.id} contratoId={contratoId} arquivo={a} />
          ))}
        </div>
      )}
    </div>
  );
}

function PendenciasTab({ itens }: { itens: any[] }) {
  if (itens.length === 0) {
    return <div className="p-8 text-center text-sm text-ink-500">Nenhuma pendência.</div>;
  }
  return (
    <table className="w-full text-sm">
      <thead className="bg-navy-50 text-ink-500 text-xs uppercase">
        <tr>
          <th className="text-left px-4 py-3 font-semibold">Título</th>
          <th className="text-center px-4 py-3 font-semibold">Prioridade</th>
          <th className="text-center px-4 py-3 font-semibold">Status</th>
          <th className="text-left px-4 py-3 font-semibold">Prazo</th>
          <th className="text-left px-4 py-3 font-semibold">Aberta por</th>
        </tr>
      </thead>
      <tbody>
        {itens.map((p) => (
          <tr key={p.id} className="border-t border-navy-50">
            <td className="px-4 py-3">
              <div className="font-medium">{p.titulo}</div>
              {p.descricao && <div className="text-xs text-ink-500">{p.descricao}</div>}
            </td>
            <td className="px-4 py-3 text-center capitalize">{p.prioridade}</td>
            <td className="px-4 py-3 text-center capitalize">{p.status}</td>
            <td className="px-4 py-3">{formatDate(p.prazo)}</td>
            <td className="px-4 py-3 capitalize">{p.aberto_por}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
