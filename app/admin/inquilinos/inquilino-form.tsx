'use client';

import { useFormState, useFormStatus } from 'react-dom';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

type ActionFn = (prev: any, formData: FormData) => Promise<any>;

interface Props {
  action: ActionFn;
  initial?: Partial<Record<string, any>>;
  submitLabel: string;
}

const inputCls =
  'w-full px-3 py-2 text-sm border border-navy-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-900/20 bg-white';

export function InquilinoForm({ action, initial = {}, submitLabel }: Props) {
  const [state, formAction] = useFormState(action, null as any);
  const err = (f: string) => state?.fieldErrors?.[f]?.[0] as string | undefined;

  return (
    <form action={formAction} className="space-y-5">
      {state?.error && !state?.fieldErrors && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg px-3 py-2">
          {state.error}
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2">
          <Field label="Nome completo" error={err('nome')}>
            <input name="nome" defaultValue={initial.nome ?? ''} className={inputCls} required />
          </Field>
        </div>
        <Field label="CPF" error={err('cpf')}>
          <input name="cpf" defaultValue={initial.cpf ?? ''} className={inputCls} required placeholder="000.000.000-00" />
        </Field>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Field label="RG" error={err('rg')}>
          <input name="rg" defaultValue={initial.rg ?? ''} className={inputCls} />
        </Field>
        <Field label="Data de nascimento" error={err('data_nascimento')}>
          <input type="date" name="data_nascimento" defaultValue={initial.data_nascimento ?? ''} className={inputCls} />
        </Field>
        <Field label="Profissão" error={err('profissao')}>
          <input name="profissao" defaultValue={initial.profissao ?? ''} className={inputCls} />
        </Field>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Field label="E-mail" error={err('email')}>
          <input type="email" name="email" defaultValue={initial.email ?? ''} className={inputCls} />
        </Field>
        <Field label="Telefone" error={err('telefone')}>
          <input name="telefone" defaultValue={initial.telefone ?? ''} className={inputCls} />
        </Field>
        <Field label="WhatsApp" error={err('whatsapp')}>
          <input name="whatsapp" defaultValue={initial.whatsapp ?? ''} className={inputCls} />
        </Field>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Field label="Renda mensal (R$)" error={err('renda')}>
          <input type="number" step="0.01" name="renda" defaultValue={initial.renda ?? ''} className={inputCls} />
        </Field>
        <Field label="Fiador (nome)" error={err('fiador_nome')}>
          <input name="fiador_nome" defaultValue={initial.fiador_nome ?? ''} className={inputCls} />
        </Field>
        <Field label="Fiador (CPF)" error={err('fiador_cpf')}>
          <input name="fiador_cpf" defaultValue={initial.fiador_cpf ?? ''} className={inputCls} />
        </Field>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="seguro_fianca" defaultChecked={!!initial.seguro_fianca} />
        <span>Possui seguro fiança</span>
      </label>

      <div className="flex items-center gap-3 pt-2">
        <Submit label={submitLabel} />
        <Link href="/admin/inquilinos" className="text-sm text-ink-500 hover:text-navy-900">Cancelar</Link>
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
