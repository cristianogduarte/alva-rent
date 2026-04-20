import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { brl, formatDate } from '@/lib/utils';
import { AgendarForm, CopiarLinkMobile } from './client';

export const metadata = { title: 'Limpeza — detalhe' };
export const dynamic = 'force-dynamic';

export default async function LimpezaDetalhePage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: l } = await supabase
    .from('limpezas')
    .select(`
      *,
      imovel:imoveis (codigo, endereco, numero, bairro, cidade, uf),
      equipe:equipe_limpeza (id, nome, telefone),
      estada:estadas (codigo, data_checkin, data_checkout, hospede:hospedes (nome, telefone))
    `)
    .eq('id', params.id)
    .maybeSingle();
  if (!l) notFound();

  const { data: equipes } = await supabase
    .from('equipe_limpeza')
    .select('id, nome, valor_padrao')
    .eq('ativo', true)
    .order('nome');

  const im: any = Array.isArray(l.imovel) ? l.imovel[0] : l.imovel;
  const eq: any = Array.isArray(l.equipe) ? l.equipe[0] : l.equipe;
  const est: any = Array.isArray(l.estada) ? l.estada[0] : l.estada;
  const hos: any = est && (Array.isArray(est.hospede) ? est.hospede[0] : est.hospede);
  const checklist: { item: string; ok: boolean }[] = Array.isArray(l.checklist_json)
    ? l.checklist_json
    : [];

  const feitos = checklist.filter((c) => c.ok).length;

  return (
    <div className="px-8 py-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/admin/limpeza" className="text-xs text-ink-500 hover:underline">
            ← Limpezas
          </Link>
          <h1 className="text-2xl font-bold text-navy-900 mt-1">
            Limpeza — {im?.codigo}
          </h1>
          <p className="text-sm text-ink-500">
            {im?.endereco}, {im?.numero} · {im?.bairro} · {im?.cidade}/{im?.uf}
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs uppercase text-ink-400">Status</div>
          <div className="text-lg font-bold capitalize">{l.status.replace('_', ' ')}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-soft">
          <div className="text-xs uppercase text-ink-400 font-semibold mb-2">Estada</div>
          {est ? (
            <>
              <div className="font-mono text-sm">{est.codigo}</div>
              <div className="text-sm">{hos?.nome ?? 'Sem hóspede cadastrado'}</div>
              <div className="text-xs text-ink-500">
                Check-in {formatDate(est.data_checkin)} · Check-out {formatDate(est.data_checkout)}
              </div>
            </>
          ) : (
            <div className="text-sm text-ink-500">Limpeza manual (sem estada)</div>
          )}
        </div>

        <div className="bg-white rounded-xl p-4 shadow-soft">
          <div className="text-xs uppercase text-ink-400 font-semibold mb-2">Equipe</div>
          {eq ? (
            <>
              <div className="font-medium">{eq.nome}</div>
              <div className="text-xs text-ink-500">{eq.telefone ?? '—'}</div>
              <div className="text-xs mt-1">Valor: {brl(l.valor ?? 0)}</div>
            </>
          ) : (
            <div className="text-sm text-ink-500">— não atribuída —</div>
          )}
        </div>
      </div>

      {l.status !== 'concluida' && l.status !== 'cancelada' && (
        <div className="bg-white rounded-xl p-4 shadow-soft mb-6">
          <div className="text-sm font-semibold mb-3">Agendar / Reagendar</div>
          <AgendarForm
            id={l.id}
            equipes={equipes ?? []}
            equipeAtual={eq?.id ?? null}
            valorAtual={l.valor ?? null}
            agendadaPara={l.agendada_para}
          />
        </div>
      )}

      <div className="bg-white rounded-xl p-4 shadow-soft mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-semibold">
            Checklist ({feitos}/{checklist.length})
          </div>
          <CopiarLinkMobile token={l.token_publico} telefone={eq?.telefone ?? null} nome={eq?.nome ?? 'Equipe'} imovel={im?.codigo ?? ''} />
        </div>
        <ul className="space-y-1.5 text-sm">
          {checklist.map((c, i) => (
            <li key={i} className="flex items-center gap-2">
              <span className={c.ok ? 'text-emerald-600' : 'text-ink-300'}>
                {c.ok ? '✓' : '○'}
              </span>
              <span className={c.ok ? '' : 'text-ink-500'}>{c.item}</span>
            </li>
          ))}
        </ul>
      </div>

      {l.observacoes && (
        <div className="bg-white rounded-xl p-4 shadow-soft mb-6">
          <div className="text-xs uppercase text-ink-400 font-semibold mb-2">Observações da equipe</div>
          <p className="text-sm whitespace-pre-line">{l.observacoes}</p>
        </div>
      )}

      {(l.fotos_antes?.length > 0 || l.fotos_depois?.length > 0) && (
        <div className="bg-white rounded-xl p-4 shadow-soft">
          <div className="text-sm font-semibold mb-2">Fotos</div>
          <div className="grid grid-cols-2 gap-4 text-xs text-ink-500">
            <div>
              Antes: {l.fotos_antes?.length ?? 0} fotos
            </div>
            <div>
              Depois: {l.fotos_depois?.length ?? 0} fotos
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
