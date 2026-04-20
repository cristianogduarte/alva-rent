'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { excluirContrato } from './actions';

export function DeleteButton({ id, codigo }: { id: string; codigo: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();

  function handle() {
    if (!confirm(`Excluir o contrato ${codigo}? Só é permitido se não houver boletos pagos/enviados.`)) return;
    start(async () => {
      const res = await excluirContrato(id);
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
