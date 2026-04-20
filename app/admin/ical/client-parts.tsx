'use client';

import { useState, useTransition } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { sincronizarFeed, upsertFeed } from './actions';

const inputCls =
  'w-full px-3 py-2 text-sm border border-navy-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-900/20 bg-white';

export function FeedForm({ imoveis }: { imoveis: { id: string; codigo: string; endereco: string }[] }) {
  const [state, action] = useFormState(upsertFeed, null as any);
  return (
    <form action={action} className="space-y-3">
      {state?.error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg px-3 py-2">
          {state.error}
        </div>
      )}
      {state?.ok && state.msg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-lg px-3 py-2">
          {state.msg}
        </div>
      )}
      <div className="grid grid-cols-[1fr_180px_auto] gap-3">
        <select name="imovel_id" required className={inputCls} defaultValue="">
          <option value="">— Imóvel —</option>
          {imoveis.map((i) => (
            <option key={i.id} value={i.id}>{i.codigo} · {i.endereco}</option>
          ))}
        </select>
        <select name="canal" required className={inputCls} defaultValue="airbnb">
          <option value="airbnb">Airbnb</option>
          <option value="booking">Booking</option>
          <option value="outro">Outro</option>
        </select>
        <label className="flex items-center gap-2 text-sm whitespace-nowrap">
          <input type="checkbox" name="ativo" defaultChecked />
          Ativo
        </label>
      </div>
      <input
        name="url_import"
        type="url"
        placeholder="URL iCal gerada pelo canal (ex: https://www.airbnb.com/calendar/ical/...)"
        className={inputCls}
      />
      <Submit />
    </form>
  );
}

function Submit() {
  const { pending } = useFormStatus();
  return <Button type="submit" disabled={pending}>{pending ? 'Salvando...' : 'Salvar feed'}</Button>;
}

export function SyncButton({ feedId, disabled }: { feedId: string; disabled?: boolean }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="flex items-center gap-2">
      {msg && <span className="text-xs text-ink-500">{msg}</span>}
      <Button
        variant="outline"
        disabled={disabled || pending}
        onClick={() =>
          start(async () => {
            const r = await sincronizarFeed(feedId);
            setMsg(r.ok ? (r.msg ?? 'OK') : r.error);
            setTimeout(() => setMsg(null), 6000);
          })
        }
      >
        {pending ? 'Sincronizando...' : '🔄 Sync agora'}
      </Button>
    </div>
  );
}

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="px-2 py-1.5 text-xs border border-navy-100 rounded hover:bg-navy-50"
    >
      {copied ? '✓' : 'Copiar'}
    </button>
  );
}
