'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { analisarEmail, aplicarEmail } from './actions';

const inputCls =
  'w-full px-3 py-2 text-sm border border-navy-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-900/20 bg-white';

interface ImovelOpt { id: string; codigo: string; endereco: string }

export function ImportarEmailClient({ imoveis }: { imoveis: ImovelOpt[] }) {
  const [analyzeState, analyzeAction] = useFormState(analisarEmail, null as any);
  const [applyState, applyAction] = useFormState(aplicarEmail, null as any);
  const [editable, setEditable] = useState<any>(null);

  useEffect(() => {
    if (analyzeState?.ok) {
      setEditable({
        ...analyzeState.preview,
        estada_id_existente: analyzeState.matchedEstadaId ?? '',
        imovel_id_novo: analyzeState.matchedImovelId ?? '',
      });
    }
  }, [analyzeState]);

  if (applyState?.ok) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center">
        <div className="text-2xl mb-2">✓</div>
        <div className="text-sm font-semibold text-emerald-800 mb-3">Reserva aplicada com sucesso</div>
        <Link href={`/admin/estadas/${applyState.estadaId}`}>
          <Button>Abrir estada</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Passo 1 — Colar email */}
      <form action={analyzeAction} className="bg-white rounded-xl shadow-soft p-5 space-y-3">
        <div className="text-xs font-semibold text-ink-500 uppercase tracking-wide">1. Colar email</div>
        <textarea
          name="email_text"
          rows={10}
          placeholder="Cole aqui o corpo completo do email do Airbnb/Booking (inclusive cabeçalho com data, hóspede e datas)..."
          className="w-full px-3 py-2 text-sm border border-navy-100 rounded-lg font-mono"
        />
        {analyzeState?.ok === false && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg px-3 py-2">
            {analyzeState.error}
          </div>
        )}
        <AnalyzeSubmit />
      </form>

      {/* Passo 2 — Preview + edição */}
      {editable && (
        <form action={applyAction} className="bg-white rounded-xl shadow-soft p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-ink-500 uppercase tracking-wide">
              2. Revisar e aplicar
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${
              editable.canal === 'desconhecido' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
            }`}>
              Canal detectado: {editable.canal}
            </span>
          </div>

          {analyzeState?.matchedEstadaId ? (
            <div className="bg-sky-50 border border-sky-200 text-sky-800 text-sm rounded-lg px-3 py-2">
              ✓ Reserva casou com estada já importada via iCal. Os dados serão <strong>vinculados</strong> à existente.
              <input type="hidden" name="estada_id_existente" value={analyzeState.matchedEstadaId} />
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg px-3 py-2">
              Sem match no iCal — selecione o imóvel para criar uma nova estada.
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Canal">
              <select name="canal" defaultValue={editable.canal === 'desconhecido' ? 'outro' : editable.canal} className={inputCls}>
                <option value="airbnb">Airbnb</option>
                <option value="booking">Booking</option>
                <option value="direto">Direto</option>
                <option value="outro">Outro</option>
              </select>
            </Field>
            <Field label="ID da reserva no canal">
              <input name="canal_reserva_id" defaultValue={editable.canal_reserva_id ?? ''} className={inputCls} />
            </Field>
          </div>

          {!analyzeState?.matchedEstadaId && (
            <Field label="Imóvel (obrigatório para criar nova estada)">
              <select name="imovel_id_novo" defaultValue={editable.imovel_id_novo ?? ''} className={inputCls} required>
                <option value="">— Selecione —</option>
                {imoveis.map((i) => (
                  <option key={i.id} value={i.id}>{i.codigo} · {i.endereco}</option>
                ))}
              </select>
            </Field>
          )}

          <div className="grid grid-cols-3 gap-3">
            <Field label="Nome do hóspede *">
              <input name="hospede_nome" defaultValue={editable.hospede_nome ?? ''} required className={inputCls} />
            </Field>
            <Field label="Email">
              <input name="hospede_email" type="email" defaultValue={editable.hospede_email ?? ''} className={inputCls} />
            </Field>
            <Field label="Telefone">
              <input name="hospede_telefone" defaultValue={editable.hospede_telefone ?? ''} className={inputCls} />
            </Field>
          </div>

          <div className="grid grid-cols-4 gap-3">
            <Field label="Check-in *">
              <input type="date" name="data_checkin" defaultValue={editable.data_checkin ?? ''} required className={inputCls} />
            </Field>
            <Field label="Check-out *">
              <input type="date" name="data_checkout" defaultValue={editable.data_checkout ?? ''} required className={inputCls} />
            </Field>
            <Field label="Nº hóspedes">
              <input type="number" min={1} name="numero_hospedes" defaultValue={editable.numero_hospedes ?? 1} className={inputCls} />
            </Field>
            <Field label="Valor total (R$)">
              <input type="number" step="0.01" name="valor_total" defaultValue={editable.valor_total ?? 0} className={inputCls} />
            </Field>
          </div>

          {applyState?.ok === false && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg px-3 py-2">
              {applyState.error}
            </div>
          )}

          <details className="text-xs text-ink-500">
            <summary className="cursor-pointer">Trecho bruto extraído</summary>
            <pre className="mt-2 p-2 bg-navy-50/50 rounded whitespace-pre-wrap font-mono text-[11px]">
              {editable.raw_snippet}
            </pre>
          </details>

          <ApplySubmit />
        </form>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-ink-500 uppercase tracking-wide">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function AnalyzeSubmit() {
  const { pending } = useFormStatus();
  return <Button type="submit" disabled={pending}>{pending ? 'Analisando...' : 'Analisar email'}</Button>;
}

function ApplySubmit() {
  const { pending } = useFormStatus();
  return (
    <div className="flex items-center gap-3 pt-2">
      <Button type="submit" disabled={pending}>
        {pending ? 'Aplicando...' : 'Aplicar reserva'}
      </Button>
      <Link href="/admin/estadas" className="text-sm text-ink-500 hover:text-navy-900">Cancelar</Link>
    </div>
  );
}
