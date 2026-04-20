'use client';

import { useState, useTransition } from 'react';
import { anonimizarHospede, atualizarOptIn } from './actions';

export function OptInToggle({ id, checked }: { id: string; checked: boolean }) {
  const [on, setOn] = useState(checked);
  const [pending, start] = useTransition();
  const toggle = () => {
    const novo = !on;
    setOn(novo);
    start(async () => {
      const r = await atualizarOptIn(id, novo);
      if (!r.ok) setOn(!novo); // rollback
    });
  };
  return (
    <button
      onClick={toggle}
      disabled={pending}
      className={`w-10 h-5 rounded-full relative transition ${on ? 'bg-emerald-500' : 'bg-ink-200'}`}
      aria-label="Alternar opt-in"
    >
      <span
        className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition ${
          on ? 'left-5' : 'left-0.5'
        }`}
      />
    </button>
  );
}

export function AnonimizarButton({ id, nome }: { id: string; nome: string }) {
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);

  const onClick = () => {
    const ok = confirm(
      `Anonimizar "${nome}"?\n\nNome/email/telefone serão removidos (substituídos por "Removido (LGPD)"). As métricas de estadas e receita ficam preservadas. Ação irreversível.`,
    );
    if (!ok) return;
    start(async () => {
      const r = await anonimizarHospede(id);
      if (r.ok) setDone(true);
      else alert(r.error);
    });
  };

  if (done) return <span className="text-xs text-ink-400">removido</span>;
  return (
    <button
      onClick={onClick}
      disabled={pending}
      className="text-xs text-rose-600 hover:underline"
    >
      {pending ? '...' : '🗑️ anonimizar'}
    </button>
  );
}
