'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { CANAIS, STATUS } from './schema';

type ActionFn = (prev: any, formData: FormData) => Promise<any>;

interface ImovelOpt { id: string; codigo: string; endereco: string; diaria_base?: number | null }
interface HospedeOpt { id: string; nome: string; documento?: string | null }

interface Props {
  action: ActionFn;
  initial?: Partial<Record<string, any>>;
  imoveis: ImovelOpt[];
  hospedes: HospedeOpt[];
  submitLabel: string;
  cancelHref?: string;
}

const inputCls =
  'w-full px-3 py-2 text-sm border border-navy-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-900/20 bg-white';

export function EstadaForm({
  action,
  initial = {},
  imoveis,
  hospedes,
  submitLabel,
  cancelHref = '/admin/estadas',
}: Props) {
  const [state, formAction] = useFormState(action, null as any);
  const err = (f: string) => state?.fieldErrors?.[f]?.[0] as string | undefined;

  const [hospedeId, setHospedeId] = useState<string>(initial.hospede_id ?? '');
  const isNovoHospede = hospedeId === 'novo';

  return (
    <form action={formAction} className="space-y-5">
      {state?.error && !state?.fieldErrors && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg px-3 py-2">
          {state.error}
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        <Field label="Código (opcional — auto)" error={err('codigo')}>
          <input name="codigo" defaultValue={initial.codigo ?? ''} className={inputCls} placeholder="EST-JN101-202604-XXXX" />
        </Field>
        <Field label="Status" error={err('status')}>
          <select name="status" defaultValue={initial.status ?? 'pre_reservada'} className={inputCls}>
            {STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Canal" error={err('canal')}>
          <select name="canal" defaultValue={initial.canal ?? 'direto'} className={inputCls}>
            {CANAIS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Imóvel (short stay)" error={err('imovel_id')}>
          <select name="imovel_id" defaultValue={initial.imovel_id ?? ''} className={inputCls} required>
            <option value="">— Selecione —</option>
            {imoveis.map((i) => (
              <option key={i.id} value={i.id}>{i.codigo} · {i.endereco}</option>
            ))}
          </select>
        </Field>
        <Field label="Hóspede" error={err('hospede_id')}>
          <select
            name="hospede_id"
            value={hospedeId}
            onChange={(e) => setHospedeId(e.target.value)}
            className={inputCls}
          >
            <option value="">— Selecione —</option>
            <option value="novo">+ Novo hóspede (criar inline)</option>
            {hospedes.map((h) => (
              <option key={h.id} value={h.id}>{h.nome}{h.documento ? ` · ${h.documento}` : ''}</option>
            ))}
          </select>
        </Field>
      </div>

      {isNovoHospede && (
        <fieldset className="border border-navy-100 rounded-lg p-4">
          <legend className="text-xs font-semibold text-ink-500 uppercase tracking-wide px-2">
            Novo hóspede
          </legend>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Nome" error={err('hospede_novo_nome')}>
              <input name="hospede_novo_nome" defaultValue={initial.hospede_novo_nome ?? ''} className={inputCls} />
            </Field>
            <Field label="Documento (CPF/passaporte)" error={err('hospede_novo_documento')}>
              <input name="hospede_novo_documento" defaultValue={initial.hospede_novo_documento ?? ''} className={inputCls} />
            </Field>
            <Field label="Email" error={err('hospede_novo_email')}>
              <input type="email" name="hospede_novo_email" defaultValue={initial.hospede_novo_email ?? ''} className={inputCls} />
            </Field>
            <Field label="Telefone / WhatsApp" error={err('hospede_novo_telefone')}>
              <input name="hospede_novo_telefone" defaultValue={initial.hospede_novo_telefone ?? ''} className={inputCls} />
            </Field>
          </div>
        </fieldset>
      )}

      <div className="grid grid-cols-3 gap-4">
        <Field label="Check-in" error={err('data_checkin')}>
          <input type="date" name="data_checkin" defaultValue={initial.data_checkin ?? ''} className={inputCls} required />
        </Field>
        <Field label="Check-out" error={err('data_checkout')}>
          <input type="date" name="data_checkout" defaultValue={initial.data_checkout ?? ''} className={inputCls} required />
        </Field>
        <Field label="Nº hóspedes" error={err('numero_hospedes')}>
          <input type="number" min={1} max={30} name="numero_hospedes" defaultValue={initial.numero_hospedes ?? 1} className={inputCls} required />
        </Field>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Field label="Diária (R$)" error={err('valor_diaria')}>
          <input type="number" step="0.01" name="valor_diaria" defaultValue={initial.valor_diaria ?? '0'} className={inputCls} />
        </Field>
        <Field label="Valor total (R$)" error={err('valor_total')}>
          <input type="number" step="0.01" name="valor_total" defaultValue={initial.valor_total ?? '0'} className={inputCls} required />
        </Field>
        <Field label="Taxa limpeza (R$)" error={err('taxa_limpeza')}>
          <input type="number" step="0.01" name="taxa_limpeza" defaultValue={initial.taxa_limpeza ?? '0'} className={inputCls} />
        </Field>
        <Field label="Taxa plataforma (R$)" error={err('taxa_plataforma')}>
          <input type="number" step="0.01" name="taxa_plataforma" defaultValue={initial.taxa_plataforma ?? '0'} className={inputCls} />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="ID da reserva no canal (Airbnb/Booking)" error={err('canal_reserva_id')}>
          <input name="canal_reserva_id" defaultValue={initial.canal_reserva_id ?? ''} className={inputCls} placeholder="HMXXXX..." />
        </Field>
        <Field label="Taxa adm. ALVA (%)" error={err('taxa_administracao_pct')}>
          <input type="number" step="0.01" min="0" max="100" name="taxa_administracao_pct" defaultValue={initial.taxa_administracao_pct ?? 10} className={inputCls} />
        </Field>
      </div>

      <Field label="Observações" error={err('observacoes')}>
        <textarea name="observacoes" defaultValue={initial.observacoes ?? ''} rows={3} className={inputCls} />
      </Field>

      <div className="flex items-center gap-3 pt-2">
        <Submit label={submitLabel} />
        <Link href={cancelHref} className="text-sm text-ink-500 hover:text-navy-900">Cancelar</Link>
      </div>
    </form>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-ink-500 uppercase tracking-wide">{label}</span>
      <div className="mt-1">{children}</div>
      {error && <span className="text-xs text-rose-600 mt-1 block">{error}</span>}
    </label>
  );
}

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return <Button type="submit" disabled={pending}>{pending ? 'Salvando...' : label}</Button>;
}
