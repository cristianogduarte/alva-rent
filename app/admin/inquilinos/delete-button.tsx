'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { excluirInquilino } from './actions';

export function DeleteButton({ id, nome }: { id: string; nome: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();

  function handle() {
    if (!confirm(`Excluir ${nome}? Essa ação não pode ser desfeita.`)) return;
    start(async () => {
      const res = await excluirInquilino(id);
      if (!res.ok) {
        alert(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <button
      onClick={handle}
      disabled={pending}
      className="text-xs text-rose-600 hover:underline disabled:opacity-50"
    >
      {pending ? 'Excluindo...' : 'Excluir'}
    </button>
  );
}
