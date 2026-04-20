'use client';

import { useFormState, useFormStatus } from 'react-dom';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { INDICES, STATUS, CANAIS, RESPONSAVEIS } from './schema';

type ActionFn = (prev: any, formData: FormData) => Promise<any>;

interface ImovelOpt { id: string; codigo: string; endereco: string; status: string }
interface InquilinoOpt { id: string; nome: string; cpf: string }

interface Props {
  action: ActionFn;
  initial?: Partial<Record<string, any>>;
  imoveis: ImovelOpt[];
  inquilinos: InquilinoOpt[];
  submitLabel: string;
}

const inputCls =
  'w-full px-3 py-2 text-sm border border-navy-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-900/20 bg-white';

export function ContratoForm({ action, initial = {}, imoveis, inquilinos, submitLabel }: Props) {
  const [state, formAction] = useFormState(action, null as any);
  const err = (f: string) => state?.fieldErrors?.[f]?.[0] as string | undefined;
  const canais: string[] = initial.canal_envio ?? ['whatsapp', 'email'];

  return (
    <form action={formAction} className="space-y-5">
      {state?.error && !state?.fieldErrors && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg px-3 py-2">
          {state.error}
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        <Field label="Código" error={err('codigo')}>
          <input name="codigo" defaultValue={initial.codigo ?? ''} className={inputCls} required />
        </Field>
        <Field label="Status" error={err('status')}>
          <select name="status" defaultValue={initial.status ?? 'ativo'} className={inputCls}>
            {STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Índice de reajuste" error={err('indice_reajuste')}>
          <select name="indice_reajuste" defaultValue={initial.indice_reajuste ?? 'IGPM'} className={inputCls}>
            {INDICES.map((i) => <option key={i} value={i}>{i}</option>)}
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Imóvel" error={err('imovel_id')}>
          <select name="imovel_id" defaultValue={initial.imovel_id ?? ''} className={inputCls} required>
            <option value="">— Selecione —</option>
            {imoveis.map((i) => (
              <option key={i.id} value={i.id}>
                {i.codigo} · {i.endereco} {i.status === 'alugado' && initial.imovel_id !== i.id ? '(alugado)' : ''}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Inquilino" error={err('inquilino_id')}>
          <select name="inquilino_id" defaultValue={initial.inquilino_id ?? ''} className={inputCls} required>
            <option value="">— Selecione —</option>
            {inquilinos.map((i) => (
              <option key={i.id} value={i.id}>{i.nome} · {i.cpf}</option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Field label="Aluguel (R$)" error={err('valor_aluguel')}>
          <input type="number" step="0.01" name="valor_aluguel" defaultValue={initial.valor_aluguel ?? ''} className={inputCls} required />
        </Field>
        <Field label="Outras taxas (R$)" error={err('outras_taxas')}>
          <input type="number" step="0.01" name="outras_taxas" defaultValue={initial.outras_taxas ?? '0'} className={inputCls} />
        </Field>
        <Field label="Taxa adm. ALVA (%)" error={err('taxa_administracao_pct')}>
          <input type="number" step="0.01" min="0" max="100" name="taxa_administracao_pct" defaultValue={initial.taxa_administracao_pct ?? 10} className={inputCls} />
        </Field>
        <div />
      </div>

      <fieldset className="border border-navy-100 rounded-lg p-4">
        <legend className="text-xs font-semibold text-ink-500 uppercase tracking-wide px-2">
          IPTU e Condomínio
        </legend>
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <div className="text-xs font-semibold text-navy-900">IPTU mensal</div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Valor (R$)" error={err('valor_iptu_mensal')}>
                <input type="number" step="0.01" name="valor_iptu_mensal" defaultValue={initial.valor_iptu_mensal ?? '0'} className={inputCls} />
              </Field>
              <Field label="Responsável" error={err('iptu_responsavel')}>
                <select name="iptu_responsavel" defaultValue={initial.iptu_responsavel ?? 'locatario'} className={inputCls}>
                  {RESPONSAVEIS.map((r) => (
                    <option key={r} value={r}>{r === 'locatario' ? 'Locatário (inquilino)' : 'Locador (proprietário)'}</option>
                  ))}
                </select>
              </Field>
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-xs font-semibold text-navy-900">Condomínio</div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Valor (R$)" error={err('valor_condominio')}>
                <input type="number" step="0.01" name="valor_condominio" defaultValue={initial.valor_condominio ?? '0'} className={inputCls} />
              </Field>
              <Field label="Responsável" error={err('condominio_responsavel')}>
                <select name="condominio_responsavel" defaultValue={initial.condominio_responsavel ?? 'locatario'} className={inputCls}>
                  {RESPONSAVEIS.map((r) => (
                    <option key={r} value={r}>{r === 'locatario' ? 'Locatário (inquilino)' : 'Locador (proprietário)'}</option>
                  ))}
                </select>
              </Field>
            </div>
          </div>
        </div>
        <p className="text-xs text-ink-500 mt-3">
          Valores marcados como <strong>locatário</strong> são somados ao boleto mensal.
          Valores do <strong>locador</strong> são custos do proprietário (não cobrados do inquilino).
        </p>
      </fieldset>

      <div className="grid grid-cols-3 gap-4">
        <Field label="Dia do vencimento" error={err('dia_vencimento')}>
          <input type="number" min={1} max={28} name="dia_vencimento" defaultValue={initial.dia_vencimento ?? 10} className={inputCls} required />
        </Field>
        <Field label="Multa por atraso (%)" error={err('multa_atraso_pct')}>
          <input type="number" step="0.01" name="multa_atraso_pct" defaultValue={initial.multa_atraso_pct ?? '2'} className={inputCls} />
        </Field>
        <Field label="Juros ao dia (%)" error={err('juros_dia_pct')}>
          <input type="number" step="0.0001" name="juros_dia_pct" defaultValue={initial.juros_dia_pct ?? '0.0333'} className={inputCls} />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Data início" error={err('data_inicio')}>
          <input type="date" name="data_inicio" defaultValue={initial.data_inicio ?? ''} className={inputCls} required />
        </Field>
        <Field label="Data fim" error={err('data_fim')}>
          <input type="date" name="data_fim" defaultValue={initial.data_fim ?? ''} className={inputCls} required />
        </Field>
      </div>

      <div>
        <span className="text-xs font-semibold text-ink-500 uppercase tracking-wide">Canais de envio</span>
        <div className="flex gap-4 mt-2">
          {CANAIS.map((c) => (
            <label key={c} className="flex items-center gap-2 text-sm capitalize">
              <input type="checkbox" name="canal_envio" value={c} defaultChecked={canais.includes(c)} />
              {c}
            </label>
          ))}
        </div>
        {err('canal_envio') && <span className="text-xs text-rose-600 mt-1 block">{err('canal_envio')}</span>}
      </div>

      <Field label="Observações" error={err('observacoes')}>
        <textarea name="observacoes" defaultValue={initial.observacoes ?? ''} rows={3} className={inputCls} />
      </Field>

      <div className="flex items-center gap-3 pt-2">
        <Submit label={submitLabel} />
        <Link href="/admin/contratos" className="text-sm text-ink-500 hover:text-navy-900">Cancelar</Link>
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
