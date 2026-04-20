'use client';

import { useFormState, useFormStatus } from 'react-dom';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { TIPOS, STATUS, MODALIDADES } from './schema';

type ActionFn = (prev: any, formData: FormData) => Promise<any>;

interface Props {
  action: ActionFn;
  initial?: Partial<Record<string, any>>;
  submitLabel: string;
}

export function ImovelForm({ action, initial = {}, submitLabel }: Props) {
  const [state, formAction] = useFormState(action, null as any);
  const err = (field: string): string | undefined =>
    state?.fieldErrors?.[field]?.[0];

  return (
    <form action={formAction} className="space-y-5">
      {state?.error && !state?.fieldErrors && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg px-3 py-2">
          {state.error}
        </div>
      )}

      <div className="grid grid-cols-4 gap-4">
        <Field label="Código" error={err('codigo')}>
          <input name="codigo" defaultValue={initial.codigo ?? ''} className={inputCls} required />
        </Field>
        <Field label="Tipo" error={err('tipo')}>
          <select name="tipo" defaultValue={initial.tipo ?? 'apartamento'} className={inputCls}>
            {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Modalidade" error={err('modalidade')}>
          <select name="modalidade" defaultValue={initial.modalidade ?? 'long_stay'} className={inputCls}>
            <option value="long_stay">Aluguel mensal</option>
            <option value="short_stay">Temporada (Airbnb/Booking)</option>
          </select>
        </Field>
        <Field label="Status" error={err('status')}>
          <select name="status" defaultValue={initial.status ?? 'vago'} className={inputCls}>
            {STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-6 gap-4">
        <div className="col-span-4">
          <Field label="Endereço" error={err('endereco')}>
            <input name="endereco" defaultValue={initial.endereco ?? ''} className={inputCls} required />
          </Field>
        </div>
        <Field label="Número" error={err('numero')}>
          <input name="numero" defaultValue={initial.numero ?? ''} className={inputCls} />
        </Field>
        <Field label="Complemento" error={err('complemento')}>
          <input name="complemento" defaultValue={initial.complemento ?? ''} className={inputCls} />
        </Field>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Field label="Bairro" error={err('bairro')}>
          <input name="bairro" defaultValue={initial.bairro ?? ''} className={inputCls} />
        </Field>
        <Field label="Cidade" error={err('cidade')}>
          <input name="cidade" defaultValue={initial.cidade ?? 'Cabo Frio'} className={inputCls} required />
        </Field>
        <Field label="UF" error={err('uf')}>
          <input name="uf" defaultValue={initial.uf ?? 'RJ'} maxLength={2} className={inputCls} required />
        </Field>
        <Field label="CEP" error={err('cep')}>
          <input name="cep" defaultValue={initial.cep ?? ''} className={inputCls} />
        </Field>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Field label="Área (m²)" error={err('area_m2')}>
          <input type="number" step="0.01" name="area_m2" defaultValue={initial.area_m2 ?? ''} className={inputCls} />
        </Field>
        <Field label="IPTU anual (R$)" error={err('iptu_anual')}>
          <input type="number" step="0.01" name="iptu_anual" defaultValue={initial.iptu_anual ?? ''} className={inputCls} />
        </Field>
        <Field label="Condomínio mensal (R$)" error={err('cond_mensal')}>
          <input type="number" step="0.01" name="cond_mensal" defaultValue={initial.cond_mensal ?? ''} className={inputCls} />
        </Field>
      </div>

      <fieldset className="border border-navy-100 rounded-lg p-4">
        <legend className="text-xs font-semibold text-ink-500 uppercase tracking-wide px-2">
          Temporada (preencher se modalidade = short stay)
        </legend>
        <div className="grid grid-cols-4 gap-4">
          <Field label="Diária base (R$)" error={err('diaria_base')}>
            <input type="number" step="0.01" name="diaria_base" defaultValue={initial.diaria_base ?? ''} className={inputCls} />
          </Field>
          <Field label="Capacidade (hóspedes)" error={err('capacidade_hospedes')}>
            <input type="number" name="capacidade_hospedes" defaultValue={initial.capacidade_hospedes ?? ''} className={inputCls} />
          </Field>
          <Field label="Check-in" error={err('checkin_time')}>
            <input type="time" name="checkin_time" defaultValue={initial.checkin_time ?? '15:00'} className={inputCls} />
          </Field>
          <Field label="Check-out" error={err('checkout_time')}>
            <input type="time" name="checkout_time" defaultValue={initial.checkout_time ?? '11:00'} className={inputCls} />
          </Field>
        </div>
      </fieldset>

      <Field label="Observações" error={err('observacoes')}>
        <textarea name="observacoes" defaultValue={initial.observacoes ?? ''} rows={3} className={inputCls} />
      </Field>

      <div className="flex items-center gap-3 pt-2">
        <Submit label={submitLabel} />
        <Link href="/admin/imoveis" className="text-sm text-ink-500 hover:text-navy-900">Cancelar</Link>
      </div>
    </form>
  );
}

const inputCls =
  'w-full px-3 py-2 text-sm border border-navy-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-900/20 bg-white';

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
