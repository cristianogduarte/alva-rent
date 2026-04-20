'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { brl } from '@/lib/utils';
import { previewImport, aplicarImport } from './actions';

const inputCls =
  'w-full px-3 py-2 text-sm border border-navy-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-900/20 bg-white';

export function ConciliacaoClient() {
  const [previewState, previewAction] = useFormState(previewImport, null as any);
  const [applyState, applyAction] = useFormState(aplicarImport, null as any);

  return (
    <div className="space-y-5">
      {/* Passo 1 — upload */}
      <form action={previewAction} className="bg-white rounded-xl shadow-soft p-5 space-y-3">
        <div className="text-xs font-semibold text-ink-500 uppercase tracking-wide">1. Upload do extrato</div>
        <div className="grid grid-cols-[180px_1fr_auto] gap-3 items-start">
          <select name="canal" defaultValue="airbnb" className={inputCls}>
            <option value="airbnb">Airbnb</option>
            <option value="booking">Booking</option>
          </select>
          <input name="arquivo" type="file" accept=".csv,text/csv" required className="text-sm" />
          <UploadSubmit />
        </div>
        {previewState?.ok === false && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg px-3 py-2">
            {previewState.error}
          </div>
        )}
      </form>

      {/* Passo 2 — preview */}
      {previewState?.ok && (
        <div className="bg-white rounded-xl shadow-soft p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-ink-500 uppercase tracking-wide">
              2. Revisar — {previewState.arquivo}
            </div>
            <div className="flex gap-3 text-xs">
              <Badge tone="emerald">{previewState.resumo.conciliaveis} conciliáveis</Badge>
              <Badge tone="amber">{previewState.resumo.orfas} órfãs</Badge>
              {previewState.resumo.jaConciliadas > 0 && (
                <Badge tone="ink">{previewState.resumo.jaConciliadas} duplicadas</Badge>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-navy-50 text-ink-500 uppercase">
                <tr>
                  <th className="text-left px-2 py-2">Reserva</th>
                  <th className="text-left px-2 py-2">Hóspede</th>
                  <th className="text-left px-2 py-2">Check-in</th>
                  <th className="text-left px-2 py-2">Payout</th>
                  <th className="text-right px-2 py-2">Bruto</th>
                  <th className="text-right px-2 py-2">Taxa</th>
                  <th className="text-right px-2 py-2">Líquido</th>
                  <th className="text-left px-2 py-2">Estada</th>
                  <th className="text-center px-2 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {previewState.linhas.map((l: any, i: number) => (
                  <tr key={i} className="border-t border-navy-50">
                    <td className="px-2 py-1.5 font-mono">{l.canal_reserva_id ?? '—'}</td>
                    <td className="px-2 py-1.5">{l.hospede_nome ?? '—'}</td>
                    <td className="px-2 py-1.5">{l.data_checkin_hint ?? '—'}</td>
                    <td className="px-2 py-1.5">{l.data_payout || '—'}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{brl(l.valor_bruto)}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums text-ink-500">{brl(l.taxa_plataforma)}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums font-semibold">{brl(l.valor_liquido)}</td>
                    <td className="px-2 py-1.5 font-mono">
                      {l.estada_codigo ? (
                        <span className="text-emerald-700">{l.estada_codigo}</span>
                      ) : (
                        <span className="text-amber-700">órfã</span>
                      )}
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      {l.ja_conciliada ? (
                        <span className="text-ink-400">duplicada</span>
                      ) : l.estada_id ? (
                        <span className="text-emerald-600">✓</span>
                      ) : (
                        <span className="text-amber-600">!</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <form action={applyAction} className="flex items-center gap-3 pt-2 border-t border-navy-50">
            <input type="hidden" name="arquivo" value={previewState.arquivo} />
            <input type="hidden" name="payload" value={JSON.stringify(previewState.linhas)} />
            <ApplySubmit />
            <p className="text-xs text-ink-500">
              Linhas duplicadas são ignoradas. Órfãs geram ota_payout sem conciliação (admin concilia depois).
            </p>
          </form>

          {applyState?.ok && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-lg px-3 py-2">
              ✓ Import concluído — {applyState.criadas} payouts, {applyState.conciliadas} conciliados, {applyState.repasses} repasses gerados.
            </div>
          )}
          {applyState?.ok === false && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg px-3 py-2">
              {applyState.error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Badge({ tone, children }: { tone: 'emerald' | 'amber' | 'ink'; children: React.ReactNode }) {
  const cls =
    tone === 'emerald' ? 'bg-emerald-50 text-emerald-700'
    : tone === 'amber' ? 'bg-amber-50 text-amber-700'
    : 'bg-ink-100 text-ink-600';
  return <span className={`px-2 py-0.5 rounded-full ${cls}`}>{children}</span>;
}

function UploadSubmit() {
  const { pending } = useFormStatus();
  return <Button type="submit" disabled={pending}>{pending ? 'Processando...' : 'Analisar'}</Button>;
}

function ApplySubmit() {
  const { pending } = useFormStatus();
  return <Button type="submit" disabled={pending}>{pending ? 'Aplicando...' : 'Aplicar import'}</Button>;
}
