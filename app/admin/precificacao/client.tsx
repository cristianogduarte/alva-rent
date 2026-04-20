'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { brl } from '@/lib/utils';
import { recalcularTarifas, definirOverride, criarEvento, excluirEvento } from './actions';

const DIAS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const inputCls = 'w-full border border-navy-100 rounded-lg px-3 py-2 text-sm';

export function RecalcularButton({ imovelId }: { imovelId: string }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function go() {
    setMsg(null);
    start(async () => {
      const r = await recalcularTarifas(imovelId);
      setMsg(r.ok ? `✓ ${r.data?.gravadas} datas recalculadas` : r.error);
    });
  }

  return (
    <div className="flex items-center gap-2">
      {msg && <span className="text-xs text-ink-600">{msg}</span>}
      <Button size="sm" onClick={go} disabled={pending}>
        {pending ? 'Calculando…' : '🔄 Recalcular 90 dias'}
      </Button>
    </div>
  );
}

export function OverrideCell({
  imovelId,
  data,
  calculada,
  final,
  override,
  regra,
}: {
  imovelId: string;
  data: string;
  calculada: number;
  final: number;
  override: boolean;
  regra: any;
}) {
  const [editing, setEditing] = useState(false);
  const [valor, setValor] = useState(final.toString());
  const [pending, start] = useTransition();

  const d = new Date(data + 'T12:00:00');
  const dow = d.getDay();
  const eFimSemana = dow === 5 || dow === 6;
  const tooltip = [
    `${data} · ${DIAS[dow]}`,
    `Base: ${brl(regra?.base ?? 0)}`,
    `Dia: ×${regra?.mult_dia?.toFixed(2) ?? '—'} (${regra?.dia_semana ?? ''})`,
    `Estação: ×${regra?.mult_estacao?.toFixed(2) ?? '—'} (${regra?.estacao ?? ''})`,
    regra?.evento ? `Evento: ×${regra?.mult_evento?.toFixed(2)} (${regra.evento})` : null,
    `Ocupação: ${((regra?.ocupacao_projetada ?? 0) * 100).toFixed(0)}% (gap ${((regra?.gap_ocupacao ?? 0) * 100).toFixed(0)}%)`,
  ]
    .filter(Boolean)
    .join('\n');

  function salvar() {
    const n = Number(valor);
    if (!isFinite(n) || n <= 0) return;
    start(async () => {
      await definirOverride(imovelId, data, n);
      setEditing(false);
    });
  }
  function reverter() {
    start(async () => {
      await definirOverride(imovelId, data, null);
    });
  }

  const bg = override
    ? 'bg-amber-50 border-amber-300'
    : eFimSemana
      ? 'bg-sky-50 border-sky-100'
      : 'bg-white border-navy-100';

  if (editing) {
    return (
      <div className={`border rounded p-1 ${bg}`}>
        <div className="text-[10px] text-ink-500">{d.getDate()}/{d.getMonth() + 1}</div>
        <input
          type="number"
          autoFocus
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') salvar();
            if (e.key === 'Escape') setEditing(false);
          }}
          onBlur={salvar}
          className="w-full text-xs font-bold bg-transparent outline-none"
        />
      </div>
    );
  }

  return (
    <div className={`border rounded p-1 cursor-pointer hover:ring-1 hover:ring-navy-900 ${bg}`} title={tooltip}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-ink-500">
          {DIAS[dow]} {d.getDate()}/{d.getMonth() + 1}
        </span>
        {override && (
          <button
            onClick={reverter}
            disabled={pending}
            className="text-[10px] text-amber-700 hover:underline"
            title="Remover override"
          >
            ×
          </button>
        )}
      </div>
      <button
        onClick={() => {
          setValor(final.toString());
          setEditing(true);
        }}
        className="w-full text-left font-bold text-sm"
      >
        {brl(final)}
      </button>
      {override && calculada !== final && (
        <div className="text-[10px] text-ink-400 line-through">{brl(calculada)}</div>
      )}
    </div>
  );
}

export function EventosPanel({ eventos }: { eventos: any[] }) {
  const [pending, start] = useTransition();
  const [form, setForm] = useState({
    cidade: 'Cabo Frio',
    uf: 'RJ',
    nome: '',
    data_inicio: '',
    data_fim: '',
    multiplicador: '1.50',
  });
  const [erro, setErro] = useState<string | null>(null);

  function salvar() {
    setErro(null);
    start(async () => {
      const r = await criarEvento({
        ...form,
        multiplicador: Number(form.multiplicador),
      });
      if (!r.ok) setErro(r.error);
      else setForm({ ...form, nome: '', data_inicio: '', data_fim: '' });
    });
  }

  return (
    <div className="bg-white rounded-xl shadow-soft p-6">
      <h2 className="font-bold text-navy-900 mb-1">Eventos e datas especiais</h2>
      <p className="text-xs text-ink-500 mb-4">
        Feriados, shows, Réveillon, Carnaval. Aplicados automaticamente no cálculo quando a cidade do imóvel bate.
      </p>

      <div className="grid grid-cols-6 gap-2 mb-4">
        <input placeholder="Cidade" value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })} className={inputCls} />
        <input placeholder="UF" value={form.uf} maxLength={2} onChange={(e) => setForm({ ...form, uf: e.target.value.toUpperCase() })} className={inputCls} />
        <input placeholder="Nome (Réveillon, etc.)" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className={`${inputCls} col-span-2`} />
        <input type="date" value={form.data_inicio} onChange={(e) => setForm({ ...form, data_inicio: e.target.value })} className={inputCls} />
        <input type="date" value={form.data_fim} onChange={(e) => setForm({ ...form, data_fim: e.target.value })} className={inputCls} />
        <input
          type="number"
          step="0.05"
          placeholder="Multiplicador (ex 1.5)"
          value={form.multiplicador}
          onChange={(e) => setForm({ ...form, multiplicador: e.target.value })}
          className={`${inputCls} col-span-2`}
        />
        <div className="col-span-4 flex items-center justify-end gap-3">
          {erro && <span className="text-xs text-rose-700">{erro}</span>}
          <Button onClick={salvar} disabled={pending || !form.nome || !form.data_inicio || !form.data_fim}>
            Adicionar
          </Button>
        </div>
      </div>

      {eventos.length === 0 ? (
        <div className="text-sm text-ink-400 italic">Nenhum evento cadastrado.</div>
      ) : (
        <table className="w-full text-sm">
          <thead className="text-xs uppercase text-ink-500 border-b border-navy-100">
            <tr>
              <th className="text-left py-2">Cidade</th>
              <th className="text-left py-2">Evento</th>
              <th className="text-left py-2">Período</th>
              <th className="text-right py-2">Mult.</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {eventos.map((e) => (
              <tr key={e.id} className="border-b border-navy-50">
                <td className="py-2 text-xs">{e.cidade}/{e.uf}</td>
                <td className="py-2">{e.nome}</td>
                <td className="py-2 text-xs">{e.data_inicio} → {e.data_fim}</td>
                <td className="py-2 text-right font-mono">×{Number(e.multiplicador).toFixed(2)}</td>
                <td className="py-2 text-right">
                  <button
                    onClick={() => {
                      if (!confirm('Excluir evento?')) return;
                      start(async () => { await excluirEvento(e.id); });
                    }}
                    className="text-xs text-rose-600 hover:underline"
                  >
                    Excluir
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
