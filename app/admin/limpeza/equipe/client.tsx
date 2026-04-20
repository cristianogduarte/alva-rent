'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { salvarEquipe } from '../actions';

const initial = { ok: false as const, error: '' };

export function EquipeForm() {
  const [state, action] = useFormState(salvarEquipe, initial as any);

  return (
    <form action={action} className="grid grid-cols-2 gap-3">
      <div>
        <label className="text-xs text-ink-500 block mb-1">Nome *</label>
        <input name="nome" required className="w-full px-3 py-2 border border-navy-100 rounded-lg text-sm" />
      </div>
      <div>
        <label className="text-xs text-ink-500 block mb-1">Telefone (WhatsApp)</label>
        <input name="telefone" placeholder="(21) 99999-9999" className="w-full px-3 py-2 border border-navy-100 rounded-lg text-sm" />
      </div>
      <div>
        <label className="text-xs text-ink-500 block mb-1">Chave PIX</label>
        <input name="chave_pix" className="w-full px-3 py-2 border border-navy-100 rounded-lg text-sm" />
      </div>
      <div>
        <label className="text-xs text-ink-500 block mb-1">Valor padrão (R$)</label>
        <input name="valor_padrao" type="number" step="0.01" className="w-full px-3 py-2 border border-navy-100 rounded-lg text-sm" />
      </div>
      <div className="col-span-2">
        <label className="text-xs text-ink-500 block mb-1">Observações</label>
        <textarea name="observacoes" rows={2} className="w-full px-3 py-2 border border-navy-100 rounded-lg text-sm" />
      </div>
      <label className="col-span-2 flex items-center gap-2 text-sm">
        <input type="checkbox" name="ativo" defaultChecked /> Equipe ativa
      </label>
      <div className="col-span-2 flex items-center gap-3">
        <Submit />
        {state && 'ok' in state && state.ok && (
          <span className="text-xs text-emerald-700">✓ Equipe salva</span>
        )}
        {state && 'ok' in state && !state.ok && state.error && (
          <span className="text-xs text-rose-600">{state.error}</span>
        )}
      </div>
    </form>
  );
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} size="sm">
      {pending ? 'Salvando...' : 'Salvar equipe'}
    </Button>
  );
}
