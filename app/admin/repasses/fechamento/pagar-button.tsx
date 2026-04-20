'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { brl } from '@/lib/utils';
import { pagarRepasseProprietario } from './actions';

export function PagarButton({
  proprietarioId,
  mes,
  valor,
  nome,
  temChave,
}: {
  proprietarioId: string;
  mes: string;
  valor: number;
  nome: string;
  temChave: boolean;
}) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onClick = () => {
    if (!temChave) {
      setError('Cadastre a chave PIX do proprietário primeiro');
      return;
    }
    const ok = confirm(
      `Confirmar PIX de ${brl(valor)} para ${nome} (competência ${mes})?\n\n` +
      `Todos os repasses pendentes serão marcados como pagos.`
    );
    if (!ok) return;

    start(async () => {
      const r = await pagarRepasseProprietario(proprietarioId, mes);
      if (r.ok) {
        setResult(`✓ ${r.modo === 'stub' ? 'STUB' : 'PIX'} — e2e ${r.e2e}`);
        setError(null);
      } else {
        setError(r.error);
      }
    });
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <Button size="sm" onClick={onClick} disabled={pending || !!result}>
        {pending ? 'Enviando...' : result ? '✓ Pago' : '💸 Pagar via PIX'}
      </Button>
      {result && <span className="text-[10px] text-emerald-700 font-mono">{result}</span>}
      {error && <span className="text-[10px] text-rose-600 max-w-[180px] text-right">{error}</span>}
    </div>
  );
}
