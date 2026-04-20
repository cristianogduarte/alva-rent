'use client';

import { useState, useMemo, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { brl } from '@/lib/utils';
import { criarReservaDireta } from './actions';

export function ReservarForm({
  imovelId,
  codigo,
  diariaBase,
  capacidade,
  bloqueadas,
}: {
  imovelId: string;
  codigo: string;
  diariaBase: number;
  capacidade: number;
  bloqueadas: string[];
}) {
  const router = useRouter();
  const [dataIn, setDataIn] = useState('');
  const [dataOut, setDataOut] = useState('');
  const [hospedes, setHospedes] = useState(2);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [documento, setDocumento] = useState('');
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const bloqSet = useMemo(() => new Set(bloqueadas), [bloqueadas]);

  const noites = useMemo(() => {
    if (!dataIn || !dataOut) return 0;
    const d = (new Date(dataOut).getTime() - new Date(dataIn).getTime()) / 86400000;
    return d > 0 ? Math.round(d) : 0;
  }, [dataIn, dataOut]);

  const total = noites * diariaBase;

  // Checa se algum dia selecionado bate com bloqueadas
  const conflito = useMemo(() => {
    if (!dataIn || !dataOut) return false;
    for (
      const d = new Date(dataIn);
      d < new Date(dataOut);
      d.setDate(d.getDate() + 1)
    ) {
      if (bloqSet.has(d.toISOString().slice(0, 10))) return true;
    }
    return false;
  }, [dataIn, dataOut, bloqSet]);

  const hojeISO = new Date().toISOString().slice(0, 10);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (conflito) {
      setErr('Algumas datas do período escolhido estão indisponíveis');
      return;
    }
    start(async () => {
      const r = await criarReservaDireta({
        imovel_id: imovelId,
        nome,
        email,
        telefone,
        documento,
        data_checkin: dataIn,
        data_checkout: dataOut,
        num_hospedes: hospedes,
      });
      if (r.ok) {
        router.push(`/reservar/${codigo}/confirmacao?pag=${r.pagamentoId}`);
      } else {
        setErr(r.error);
      }
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-ink-500 block mb-1">Check-in</label>
          <input
            type="date"
            required
            min={hojeISO}
            value={dataIn}
            onChange={(e) => setDataIn(e.target.value)}
            className="w-full px-2 py-1.5 border border-navy-100 rounded-lg text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-ink-500 block mb-1">Check-out</label>
          <input
            type="date"
            required
            min={dataIn || hojeISO}
            value={dataOut}
            onChange={(e) => setDataOut(e.target.value)}
            className="w-full px-2 py-1.5 border border-navy-100 rounded-lg text-sm"
          />
        </div>
      </div>
      <div>
        <label className="text-xs text-ink-500 block mb-1">Hóspedes</label>
        <input
          type="number"
          min={1}
          max={capacidade}
          value={hospedes}
          onChange={(e) => setHospedes(Number(e.target.value))}
          className="w-full px-2 py-1.5 border border-navy-100 rounded-lg text-sm"
        />
      </div>

      {noites > 0 && !conflito && (
        <div className="bg-navy-50 rounded-lg p-3 text-sm">
          <div className="flex justify-between text-xs text-ink-500">
            <span>{brl(diariaBase)} × {noites} {noites === 1 ? 'noite' : 'noites'}</span>
            <span>{brl(total)}</span>
          </div>
          <div className="flex justify-between font-bold mt-2 pt-2 border-t border-navy-100">
            <span>Total</span>
            <span>{brl(total)}</span>
          </div>
        </div>
      )}

      {conflito && (
        <div className="bg-rose-50 text-rose-700 text-xs rounded-lg p-2">
          Algumas datas do período estão indisponíveis. Escolha outro.
        </div>
      )}

      <hr className="border-navy-100" />

      <input required placeholder="Nome completo" value={nome} onChange={(e) => setNome(e.target.value)} className="w-full px-2 py-1.5 border border-navy-100 rounded-lg text-sm" />
      <input required type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-2 py-1.5 border border-navy-100 rounded-lg text-sm" />
      <input required type="tel" placeholder="Telefone (WhatsApp)" value={telefone} onChange={(e) => setTelefone(e.target.value)} className="w-full px-2 py-1.5 border border-navy-100 rounded-lg text-sm" />
      <input placeholder="CPF (opcional, recomendado)" value={documento} onChange={(e) => setDocumento(e.target.value)} className="w-full px-2 py-1.5 border border-navy-100 rounded-lg text-sm" />

      {err && <div className="text-xs text-rose-600">{err}</div>}

      <button
        type="submit"
        disabled={pending || noites === 0 || conflito}
        className="w-full py-3 bg-navy-900 text-white rounded-lg font-bold text-sm hover:bg-navy-800 disabled:opacity-50"
      >
        {pending ? 'Processando...' : noites === 0 ? 'Escolha as datas' : `Reservar por ${brl(total)}`}
      </button>
      <p className="text-[10px] text-ink-400 text-center">
        Pagamento via PIX (Banco Inter). Confirmação imediata após aprovação.
      </p>
    </form>
  );
}
