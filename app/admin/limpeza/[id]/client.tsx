'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { agendarLimpeza } from '../actions';

export function AgendarForm({
  id,
  equipes,
  equipeAtual,
  valorAtual,
  agendadaPara,
}: {
  id: string;
  equipes: { id: string; nome: string; valor_padrao: number | null }[];
  equipeAtual: string | null;
  valorAtual: number | null;
  agendadaPara: string | null;
}) {
  const [equipeId, setEquipeId] = useState(equipeAtual ?? '');
  const [data, setData] = useState(agendadaPara ? agendadaPara.slice(0, 16) : '');
  const [valor, setValor] = useState<string>(valorAtual != null ? String(valorAtual) : '');
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const onSubmit = () => {
    if (!equipeId || !data) {
      setErr('Escolha equipe e data');
      return;
    }
    start(async () => {
      const r = await agendarLimpeza(
        id,
        equipeId,
        new Date(data).toISOString(),
        valor ? Number(valor) : null,
      );
      if (r.ok) {
        setOk(true);
        setErr(null);
      } else {
        setErr(r.error);
      }
    });
  };

  return (
    <div className="grid grid-cols-4 gap-3 items-end">
      <div>
        <label className="text-xs text-ink-500 block mb-1">Equipe</label>
        <select
          value={equipeId}
          onChange={(e) => {
            setEquipeId(e.target.value);
            const eq = equipes.find((x) => x.id === e.target.value);
            if (eq?.valor_padrao && !valor) setValor(String(eq.valor_padrao));
          }}
          className="w-full px-3 py-2 border border-navy-100 rounded-lg text-sm"
        >
          <option value="">—</option>
          {equipes.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nome}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-xs text-ink-500 block mb-1">Data/hora</label>
        <input
          type="datetime-local"
          value={data}
          onChange={(e) => setData(e.target.value)}
          className="w-full px-3 py-2 border border-navy-100 rounded-lg text-sm"
        />
      </div>
      <div>
        <label className="text-xs text-ink-500 block mb-1">Valor (R$)</label>
        <input
          type="number"
          step="0.01"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          className="w-full px-3 py-2 border border-navy-100 rounded-lg text-sm"
        />
      </div>
      <div>
        <Button onClick={onSubmit} disabled={pending} size="sm">
          {pending ? 'Salvando...' : ok ? '✓ Agendado' : 'Agendar'}
        </Button>
      </div>
      {err && <div className="col-span-4 text-xs text-rose-600">{err}</div>}
    </div>
  );
}

export function CopiarLinkMobile({
  token,
  telefone,
  nome,
  imovel,
}: {
  token: string;
  telefone: string | null;
  nome: string;
  imovel: string;
}) {
  const [copiado, setCopiado] = useState(false);
  const url = typeof window !== 'undefined' ? `${window.location.origin}/limpeza/${token}` : `/limpeza/${token}`;

  const copiar = async () => {
    await navigator.clipboard.writeText(url);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const abrirWhats = () => {
    if (!telefone) return;
    const numero = telefone.replace(/\D/g, '');
    const msg = encodeURIComponent(
      `Olá ${nome}, segue o link da limpeza do imóvel ${imovel}: ${url}\n\nAbra no celular, marque o checklist e anexe fotos antes/depois.`,
    );
    window.open(`https://wa.me/55${numero}?text=${msg}`, '_blank');
  };

  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={copiar}
        className="px-3 py-1.5 border border-navy-100 rounded-lg text-xs hover:bg-navy-50"
      >
        {copiado ? '✓ Copiado' : '📋 Copiar link'}
      </button>
      {telefone && (
        <button
          type="button"
          onClick={abrirWhats}
          className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs hover:bg-emerald-700"
        >
          💬 Enviar WhatsApp
        </button>
      )}
    </div>
  );
}
