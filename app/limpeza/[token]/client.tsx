'use client';

import { useState, useTransition } from 'react';
import {
  atualizarChecklistPublico,
  iniciarLimpezaPublico,
  concluirLimpezaPublico,
} from '@/app/admin/limpeza/actions';

export function LimpezaMobile({
  token,
  status: statusIni,
  imovel,
  equipe,
  checklist: checklistIni,
  observacoes: obsIni,
  instrucoes,
  fechadura,
  obsLimpeza,
}: {
  token: string;
  status: string;
  imovel: { codigo: string; endereco: string; bairro: string };
  equipe: string | null;
  checklist: { item: string; ok: boolean }[];
  observacoes: string;
  instrucoes: string | null;
  fechadura: string | null;
  obsLimpeza: string | null;
}) {
  const [status, setStatus] = useState(statusIni);
  const [checklist, setChecklist] = useState(checklistIni);
  const [obs, setObs] = useState(obsIni);
  const [pending, start] = useTransition();
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const feitos = checklist.filter((c) => c.ok).length;
  const concluida = status === 'concluida';

  const toggle = (i: number) => {
    if (concluida) return;
    setChecklist((prev) =>
      prev.map((c, idx) => (idx === i ? { ...c, ok: !c.ok } : c)),
    );
  };

  const salvarProgresso = () => {
    start(async () => {
      const r = await atualizarChecklistPublico(token, checklist, obs);
      if (r.ok) {
        setSavedAt(new Date());
        setErr(null);
      } else {
        setErr(r.error);
      }
    });
  };

  const iniciar = () => {
    start(async () => {
      const r = await iniciarLimpezaPublico(token);
      if (r.ok) setStatus('em_andamento');
      else setErr(r.error);
    });
  };

  const concluir = () => {
    if (feitos < checklist.length) {
      if (!confirm(`Ainda faltam ${checklist.length - feitos} itens. Concluir mesmo assim?`)) return;
    }
    start(async () => {
      // salva antes de concluir
      await atualizarChecklistPublico(token, checklist, obs);
      const r = await concluirLimpezaPublico(token);
      if (r.ok) setStatus('concluida');
      else setErr(r.error);
    });
  };

  return (
    <div className="min-h-dvh bg-navy-50">
      {/* Header fixo */}
      <div className="sticky top-0 bg-white border-b border-navy-100 px-5 py-4 shadow-sm z-10">
        <div className="text-xs uppercase text-ink-400 font-semibold">ALVA Rent · Limpeza</div>
        <div className="text-lg font-bold text-navy-900">{imovel.codigo}</div>
        <div className="text-xs text-ink-500">{imovel.endereco}</div>
        <div className="text-xs text-ink-500">{imovel.bairro}</div>
        {equipe && <div className="text-xs text-indigo-700 mt-1">👤 {equipe}</div>}
      </div>

      <div className="px-5 py-5 space-y-5 pb-24">
        {/* Info de acesso */}
        {(instrucoes || fechadura) && (
          <div className="bg-indigo-50 rounded-xl p-4 text-sm">
            <div className="font-semibold text-indigo-900 mb-2">🔐 Acesso</div>
            {fechadura && (
              <div className="mb-1">
                Código fechadura: <span className="font-mono font-bold">{fechadura}</span>
              </div>
            )}
            {instrucoes && <p className="text-xs text-indigo-900 whitespace-pre-line">{instrucoes}</p>}
          </div>
        )}

        {obsLimpeza && (
          <div className="bg-amber-50 rounded-xl p-4 text-sm">
            <div className="font-semibold text-amber-900 mb-1">⚠ Observações de limpeza</div>
            <p className="text-xs whitespace-pre-line">{obsLimpeza}</p>
          </div>
        )}

        {/* Status */}
        {status === 'pendente' && (
          <button
            onClick={iniciar}
            disabled={pending}
            className="w-full py-4 rounded-xl bg-navy-900 text-white font-bold text-base active:scale-[0.98]"
          >
            {pending ? 'Iniciando...' : '▶ Iniciar limpeza'}
          </button>
        )}
        {status === 'agendada' && (
          <button
            onClick={iniciar}
            disabled={pending}
            className="w-full py-4 rounded-xl bg-navy-900 text-white font-bold text-base active:scale-[0.98]"
          >
            {pending ? 'Iniciando...' : '▶ Cheguei — iniciar'}
          </button>
        )}
        {concluida && (
          <div className="bg-emerald-50 border-2 border-emerald-200 rounded-xl p-4 text-center">
            <div className="text-4xl">✅</div>
            <div className="font-bold text-emerald-900 mt-2">Limpeza concluída!</div>
            <div className="text-xs text-emerald-700">Obrigado pelo trabalho.</div>
          </div>
        )}

        {/* Checklist */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="font-semibold">Checklist</div>
            <div className="text-xs text-ink-500">{feitos}/{checklist.length}</div>
          </div>
          <div className="w-full h-1.5 bg-ink-100 rounded-full mb-4 overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all"
              style={{ width: `${(feitos / Math.max(checklist.length, 1)) * 100}%` }}
            />
          </div>
          <ul className="space-y-1">
            {checklist.map((c, i) => (
              <li key={i}>
                <button
                  onClick={() => toggle(i)}
                  disabled={concluida}
                  className={`w-full flex items-center gap-3 py-3 px-2 rounded-lg text-left text-sm active:bg-navy-50 ${
                    c.ok ? 'text-ink-400 line-through' : ''
                  }`}
                >
                  <span
                    className={`w-6 h-6 rounded-md border-2 flex items-center justify-center shrink-0 ${
                      c.ok
                        ? 'bg-emerald-500 border-emerald-500 text-white'
                        : 'border-ink-300'
                    }`}
                  >
                    {c.ok && '✓'}
                  </span>
                  <span className="flex-1">{c.item}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Observações */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <label className="text-sm font-semibold block mb-2">Observações / avarias encontradas</label>
          <textarea
            value={obs}
            onChange={(e) => setObs(e.target.value)}
            disabled={concluida}
            rows={4}
            placeholder="Ex: vaso rachado no banheiro, lâmpada queimada na sala..."
            className="w-full px-3 py-2 border border-navy-100 rounded-lg text-sm"
          />
        </div>

        {err && <div className="text-sm text-rose-600 text-center">{err}</div>}
        {savedAt && !err && (
          <div className="text-xs text-emerald-700 text-center">
            ✓ Progresso salvo às {savedAt.toLocaleTimeString('pt-BR')}
          </div>
        )}
      </div>

      {/* Footer fixo com ações */}
      {!concluida && status !== 'pendente' && status !== 'agendada' && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-navy-100 px-5 py-3 flex gap-2 shadow-[0_-2px_8px_rgba(0,0,0,0.05)]">
          <button
            onClick={salvarProgresso}
            disabled={pending}
            className="flex-1 py-3 rounded-xl border border-navy-200 font-medium text-sm active:bg-navy-50"
          >
            {pending ? 'Salvando...' : '💾 Salvar'}
          </button>
          <button
            onClick={concluir}
            disabled={pending}
            className="flex-1 py-3 rounded-xl bg-emerald-600 text-white font-bold text-sm active:bg-emerald-700"
          >
            ✓ Concluir
          </button>
        </div>
      )}
    </div>
  );
}
