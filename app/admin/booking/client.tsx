'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import {
  salvarCredenciais,
  testarConexaoAction,
  vincularImovel,
  removerVinculo,
  sincronizarAgora,
} from './actions';

type Cred = {
  id: string;
  hotel_id: string;
  username: string | null;
  password_secret_ref: string | null;
  base_url: string;
  ativo: boolean;
  ultimo_teste_em: string | null;
  ultimo_status: string | null;
};

type Imovel = { id: string; codigo: string; endereco: string };
type Mapeamento = {
  id: string;
  room_id: string;
  rate_plan_id: string | null;
  sincronizar_calendario: boolean;
  ultima_sync_em: string | null;
  ultimo_erro: string | null;
  imovel?: { codigo: string; endereco: string };
};
type Log = {
  id: string;
  operacao: string;
  status: string;
  detalhes: any;
  created_at: string;
};

export function BookingClient({
  credenciais,
  senhaConfigurada,
  imoveis,
  mapeamentos,
  logs,
}: {
  credenciais: Cred | null;
  senhaConfigurada: boolean;
  imoveis: Imovel[];
  mapeamentos: Mapeamento[];
  logs: Log[];
}) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);

  const [form, setForm] = useState({
    hotel_id: credenciais?.hotel_id ?? '',
    username: credenciais?.username ?? '',
    password_secret_ref: credenciais?.password_secret_ref ?? 'BOOKING_PASSWORD',
    base_url: credenciais?.base_url ?? 'https://supply-xml.booking.com',
    ativo: credenciais?.ativo ?? false,
  });

  const [vinc, setVinc] = useState({ imovel_id: '', room_id: '', rate_plan_id: '' });

  function salvar() {
    setMsg(null);
    start(async () => {
      const r = await salvarCredenciais(form);
      setMsg(r.ok ? { tipo: 'ok', texto: 'Credenciais salvas' } : { tipo: 'erro', texto: r.error });
    });
  }
  function testar() {
    setMsg(null);
    start(async () => {
      const r = await testarConexaoAction();
      setMsg(
        r.ok
          ? { tipo: 'ok', texto: `Conexão ${r.data?.modo === 'stub' ? 'em modo stub (sem API real)' : 'OK'}` }
          : { tipo: 'erro', texto: r.error },
      );
    });
  }
  function vincular() {
    setMsg(null);
    start(async () => {
      const r = await vincularImovel(vinc);
      if (r.ok) {
        setVinc({ imovel_id: '', room_id: '', rate_plan_id: '' });
        setMsg({ tipo: 'ok', texto: 'Imóvel vinculado' });
      } else setMsg({ tipo: 'erro', texto: r.error });
    });
  }
  function sincronizar() {
    setMsg(null);
    start(async () => {
      const r = await sincronizarAgora();
      setMsg(
        r.ok
          ? { tipo: 'ok', texto: `Sync ${r.data?.modo} — ${r.data?.novas} novas · ${r.data?.pushes} pushes` }
          : { tipo: 'erro', texto: r.error },
      );
    });
  }

  return (
    <div className="space-y-6">
      {msg && (
        <div
          className={`rounded-lg px-4 py-3 text-sm ${
            msg.tipo === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
          }`}
        >
          {msg.texto}
        </div>
      )}

      {/* Credenciais */}
      <section className="bg-white rounded-xl p-6 shadow-soft">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-bold text-navy-900">1. Credenciais</h2>
            <p className="text-xs text-ink-500">Dados da conta Booking Connectivity da ALVA.</p>
          </div>
          <div className="flex items-center gap-2">
            {credenciais?.ultimo_status && (
              <span
                className={`text-xs px-2 py-1 rounded-full ${
                  credenciais.ultimo_status === 'stub'
                    ? 'bg-amber-50 text-amber-700'
                    : credenciais.ultimo_status === 'erro'
                      ? 'bg-rose-50 text-rose-700'
                      : 'bg-emerald-50 text-emerald-700'
                }`}
              >
                {credenciais.ultimo_status}
              </span>
            )}
            <Button variant="outline" size="sm" onClick={testar} disabled={pending}>
              Testar conexão
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <Campo label="Hotel ID">
            <input
              value={form.hotel_id}
              onChange={(e) => setForm({ ...form, hotel_id: e.target.value })}
              className="w-full border border-navy-100 rounded-lg px-3 py-2 text-sm"
              placeholder="12345678"
            />
          </Campo>
          <Campo label="Username (basic auth)">
            <input
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              className="w-full border border-navy-100 rounded-lg px-3 py-2 text-sm"
            />
          </Campo>
          <Campo label="Env var da senha" hint={senhaConfigurada ? '✓ resolvida' : '⚠ não definida no .env'}>
            <input
              value={form.password_secret_ref}
              onChange={(e) => setForm({ ...form, password_secret_ref: e.target.value })}
              className="w-full border border-navy-100 rounded-lg px-3 py-2 text-sm font-mono"
              placeholder="BOOKING_PASSWORD"
            />
          </Campo>
          <Campo label="Base URL">
            <input
              value={form.base_url}
              onChange={(e) => setForm({ ...form, base_url: e.target.value })}
              className="w-full border border-navy-100 rounded-lg px-3 py-2 text-sm"
            />
          </Campo>
        </div>

        <div className="flex items-center justify-between mt-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.ativo}
              onChange={(e) => setForm({ ...form, ativo: e.target.checked })}
            />
            Integração ativa
          </label>
          <Button onClick={salvar} disabled={pending}>
            Salvar
          </Button>
        </div>
      </section>

      {/* Mapeamento */}
      <section className="bg-white rounded-xl p-6 shadow-soft">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-bold text-navy-900">2. Vincular imóveis ao Booking</h2>
            <p className="text-xs text-ink-500">
              Cole o <span className="font-mono">room_id</span> que a Booking fornece no extranet de cada acomodação.
            </p>
          </div>
          <Button onClick={sincronizar} disabled={pending || mapeamentos.length === 0}>
            🔄 Sincronizar agora
          </Button>
        </div>

        <div className="grid grid-cols-4 gap-2 mb-4 text-sm">
          <select
            value={vinc.imovel_id}
            onChange={(e) => setVinc({ ...vinc, imovel_id: e.target.value })}
            className="w-full border border-navy-100 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">Imóvel…</option>
            {imoveis.map((i) => (
              <option key={i.id} value={i.id}>
                {i.codigo} — {i.endereco}
              </option>
            ))}
          </select>
          <input
            placeholder="room_id"
            value={vinc.room_id}
            onChange={(e) => setVinc({ ...vinc, room_id: e.target.value })}
            className="w-full border border-navy-100 rounded-lg px-3 py-2 text-sm font-mono"
          />
          <input
            placeholder="rate_plan_id (opcional)"
            value={vinc.rate_plan_id}
            onChange={(e) => setVinc({ ...vinc, rate_plan_id: e.target.value })}
            className="w-full border border-navy-100 rounded-lg px-3 py-2 text-sm font-mono"
          />
          <Button onClick={vincular} disabled={pending}>
            Vincular
          </Button>
        </div>

        {mapeamentos.length === 0 ? (
          <div className="text-sm text-ink-400 italic text-center py-6">Nenhum imóvel vinculado.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-ink-500 border-b border-navy-100">
              <tr>
                <th className="text-left py-2">Imóvel</th>
                <th className="text-left py-2">room_id</th>
                <th className="text-left py-2">rate_plan</th>
                <th className="text-left py-2">Última sync</th>
                <th className="text-right py-2"></th>
              </tr>
            </thead>
            <tbody>
              {mapeamentos.map((m) => (
                <tr key={m.id} className="border-b border-navy-50">
                  <td className="py-2">
                    <div className="font-mono text-xs">{m.imovel?.codigo}</div>
                    <div className="text-xs text-ink-500">{m.imovel?.endereco}</div>
                  </td>
                  <td className="font-mono text-xs">{m.room_id}</td>
                  <td className="font-mono text-xs">{m.rate_plan_id ?? '—'}</td>
                  <td className="text-xs">
                    {m.ultima_sync_em
                      ? new Date(m.ultima_sync_em).toLocaleString('pt-BR')
                      : <span className="text-ink-400">nunca</span>}
                    {m.ultimo_erro && (
                      <div className="text-rose-600 text-[10px]">{m.ultimo_erro}</div>
                    )}
                  </td>
                  <td className="text-right">
                    <button
                      onClick={() => {
                        if (confirm('Remover vínculo?')) {
                          start(async () => {
                            await removerVinculo(m.id);
                          });
                        }
                      }}
                      className="text-rose-600 text-xs hover:underline"
                    >
                      Remover
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Logs */}
      <section className="bg-white rounded-xl p-6 shadow-soft">
        <h2 className="font-bold text-navy-900 mb-3">3. Últimas 20 operações</h2>
        {logs.length === 0 ? (
          <div className="text-sm text-ink-400 italic">Nenhuma operação registrada ainda.</div>
        ) : (
          <ul className="text-xs space-y-1 font-mono">
            {logs.map((l) => (
              <li key={l.id} className="flex gap-3 py-1 border-b border-navy-50">
                <span className="text-ink-400">
                  {new Date(l.created_at).toLocaleString('pt-BR')}
                </span>
                <span
                  className={`px-2 rounded ${
                    l.status === 'ok'
                      ? 'bg-emerald-50 text-emerald-700'
                      : l.status === 'stub'
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-rose-50 text-rose-700'
                  }`}
                >
                  {l.status}
                </span>
                <span>{l.operacao}</span>
                <span className="text-ink-500 truncate flex-1">
                  {l.detalhes?.error ?? JSON.stringify(l.detalhes)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

    </div>
  );
}

function Campo({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold text-ink-500 uppercase">{label}</span>
        {hint && <span className="text-[10px] text-ink-400">{hint}</span>}
      </div>
      {children}
    </label>
  );
}
