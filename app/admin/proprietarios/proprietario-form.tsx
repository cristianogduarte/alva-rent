'use client';

import { useFormState, useFormStatus } from 'react-dom';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

type ActionFn = (prev: any, formData: FormData) => Promise<any>;

interface Props {
  action: ActionFn;
  initial?: Partial<Record<string, any>>;
  submitLabel: string;
  cancelHref?: string;
}

const inputCls =
  'w-full px-3 py-2 text-sm border border-navy-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-900/20 bg-white tabular-nums';

export function ProprietarioForm({
  action,
  initial = {},
  submitLabel,
  cancelHref = '/admin/proprietarios',
}: Props) {
  const [state, formAction] = useFormState(action, null as any);
  const err = (f: string) => state?.fieldErrors?.[f]?.[0] as string | undefined;

  return (
    <form action={formAction} className="space-y-6" aria-describedby={state?.error ? 'form-error' : undefined}>
      {state?.error && !state?.fieldErrors && (
        <div
          id="form-error"
          role="alert"
          className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg px-3 py-2"
        >
          {state.error}
        </div>
      )}

      <fieldset className="space-y-4">
        <legend className="text-xs font-semibold text-ink-500 uppercase tracking-wider mb-2">
          Identificação
        </legend>

        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <Field label="Nome / Razão social" error={err('nome')} required>
              <input
                name="nome"
                defaultValue={initial.nome ?? ''}
                className={inputCls}
                required
                autoComplete="organization"
              />
            </Field>
          </div>
          <Field label="CPF ou CNPJ" error={err('cpf_cnpj')} hint="Somente números ou formatado">
            <input
              name="cpf_cnpj"
              defaultValue={initial.cpf_cnpj ?? ''}
              className={inputCls}
              placeholder="00.000.000/0000-00"
              inputMode="numeric"
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="E-mail" error={err('email')}>
            <input
              type="email"
              name="email"
              defaultValue={initial.email ?? ''}
              className={inputCls}
              autoComplete="email"
            />
          </Field>
          <Field label="Telefone" error={err('telefone')}>
            <input
              name="telefone"
              defaultValue={initial.telefone ?? ''}
              className={inputCls}
              autoComplete="tel"
              inputMode="tel"
            />
          </Field>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-xs font-semibold text-ink-500 uppercase tracking-wider mb-2">
          Cobrança e repasse
        </legend>

        <div className="grid grid-cols-3 gap-4">
          <Field
            label="Taxa de administração (%)"
            error={err('comissao_pct')}
            hint="Retida pela ALVA sobre cada aluguel"
            required
          >
            <input
              type="number"
              step="0.01"
              min="0"
              max="100"
              name="comissao_pct"
              defaultValue={initial.comissao_pct ?? 10}
              className={inputCls}
              required
            />
          </Field>
        </div>

        <Field label="Observações" error={err('observacoes')}>
          <textarea
            name="observacoes"
            defaultValue={initial.observacoes ?? ''}
            rows={3}
            className={inputCls}
          />
        </Field>
      </fieldset>

      <div className="flex items-center gap-3 pt-2 border-t border-navy-50">
        <Submit label={submitLabel} />
        <Link href={cancelHref} className="text-sm text-ink-500 hover:text-navy-900">
          Cancelar
        </Link>
      </div>
    </form>
  );
}

function Field({
  label,
  error,
  hint,
  required,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-ink-500 uppercase tracking-wide">
        {label}
        {required && <span className="text-rose-500 ml-0.5" aria-label="obrigatório">*</span>}
      </span>
      <div className="mt-1">{children}</div>
      {hint && !error && <span className="text-xs text-ink-400 mt-1 block">{hint}</span>}
      {error && (
        <span className="text-xs text-rose-600 mt-1 block" role="alert">
          {error}
        </span>
      )}
    </label>
  );
}

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} aria-busy={pending}>
      {pending ? 'Salvando…' : label}
    </Button>
  );
}
