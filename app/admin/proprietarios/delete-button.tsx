'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { excluirProprietario } from './actions';

export function DeleteButton({
  id,
  nome,
  variant = 'inline',
  onDeleted,
}: {
  id: string;
  nome: string;
  variant?: 'inline' | 'button';
  onDeleted?: () => void;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();

  function handle() {
    if (!confirm(`Excluir "${nome}"?\nEssa ação não pode ser desfeita.`)) return;
    start(async () => {
      const res = await excluirProprietario(id);
      if (!res.ok) {
        alert(res.error);
        return;
      }
      if (onDeleted) onDeleted();
      else {
        router.push('/admin/proprietarios');
        router.refresh();
      }
    });
  }

  if (variant === 'button') {
    return (
      <button
        onClick={handle}
        disabled={pending}
        className="text-sm px-3 py-2 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 disabled:opacity-50 font-semibold"
      >
        {pending ? 'Excluindo…' : 'Excluir'}
      </button>
    );
  }

  return (
    <button
      onClick={handle}
      disabled={pending}
      aria-label={`Excluir ${nome}`}
      className="text-xs text-rose-600 hover:underline disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-rose-200 rounded"
    >
      {pending ? 'Excluindo…' : 'Excluir'}
    </button>
  );
}
