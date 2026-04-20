'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';
import {
  registrarMensagem,
  marcarLida,
  arquivarThread,
  gerarRascunhoIA,
  aprovarRascunho,
  excluirRascunho,
} from './actions';

type Estada = {
  id: string;
  codigo: string;
  canal: string;
  status: string;
  data_checkin: string;
  data_checkout: string;
  hospede_nome: string;
  hospede_telefone: string | null;
  hospede_email: string | null;
  imovel_codigo: string;
  imovel_endereco: string;
  wifi_ssid: string | null;
  wifi_senha: string | null;
  codigo_fechadura: string | null;
  regras_casa: string | null;
};

type Msg = {
  id: string;
  estada_id: string;
  origem: 'hospede' | 'ia' | 'admin';
  canal: string;
  texto: string;
  status: string;
  autor: string | null;
  lida: boolean;
  created_at: string;
};

export function ThreadView({ estada, mensagens }: { estada: Estada; mensagens: Msg[] }) {
  const [pending, start] = useTransition();
  const [texto, setTexto] = useState('');
  const [canal, setCanal] = useState<'whatsapp' | 'email' | 'airbnb' | 'booking' | 'sms' | 'manual'>(
    (estada.canal as any) === 'direto' ? 'whatsapp' : (estada.canal as any) ?? 'whatsapp',
  );
  const [origem, setOrigem] = useState<'hospede' | 'admin'>('admin');
  const [erro, setErro] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagens.length]);

  // Marca não-lidas ao abrir a thread
  useEffect(() => {
    const temNaoLida = mensagens.some((m) => m.origem === 'hospede' && !m.lida);
    if (temNaoLida) void marcarLida(estada.id);
  }, [estada.id, mensagens]);

  function enviar() {
    setErro(null);
    setInfo(null);
    start(async () => {
      const r = await registrarMensagem(estada.id, origem, canal, texto);
      if (!r.ok) setErro(r.error);
      else setTexto('');
    });
  }

  function gerarIA() {
    setErro(null);
    setInfo(null);
    start(async () => {
      const r = await gerarRascunhoIA(estada.id);
      if (!r.ok) setErro(r.error);
      else setInfo(`Rascunho gerado (${r.data?.modo}). Revise abaixo.`);
    });
  }

  function arquivar() {
    if (!confirm('Arquivar toda a conversa?')) return;
    start(async () => {
      const r = await arquivarThread(estada.id);
      if (!r.ok) setErro(r.error);
    });
  }

  const waLink = estada.hospede_telefone
    ? `https://wa.me/${estada.hospede_telefone.replace(/\D/g, '')}`
    : null;

  return (
    <div className="flex-1 flex">
      {/* Thread central */}
      <div className="flex-1 flex flex-col bg-navy-50">
        {/* Header */}
        <div className="bg-white px-5 py-3 border-b border-navy-100 flex items-center justify-between">
          <div>
            <div className="font-bold text-navy-900">{estada.hospede_nome}</div>
            <div className="text-xs text-ink-500 font-mono">
              {estada.imovel_codigo} · {estada.codigo} · {estada.canal}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {waLink && (
              <a href={waLink} target="_blank" rel="noopener">
                <Button variant="outline" size="sm">📱 WhatsApp</Button>
              </a>
            )}
            <Button variant="outline" size="sm" onClick={arquivar} disabled={pending}>
              Arquivar
            </Button>
          </div>
        </div>

        {/* Mensagens */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {mensagens.length === 0 && (
            <div className="text-center text-sm text-ink-400 py-12">
              Nenhuma mensagem ainda. Comece a conversa ou gere um rascunho com IA.
            </div>
          )}
          {mensagens.map((m) => (
            <MensagemBubble key={m.id} msg={m} />
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Erro/info */}
        {erro && <div className="bg-rose-50 text-rose-700 text-sm px-4 py-2">{erro}</div>}
        {info && <div className="bg-emerald-50 text-emerald-700 text-sm px-4 py-2">{info}</div>}

        {/* Composer */}
        <div className="bg-white border-t border-navy-100 p-4">
          <div className="flex items-center gap-2 mb-2">
            <select
              value={origem}
              onChange={(e) => setOrigem(e.target.value as any)}
              className="text-xs border rounded px-2 py-1"
            >
              <option value="admin">✍️ Como admin</option>
              <option value="hospede">👤 Registrar fala do hóspede</option>
            </select>
            <select
              value={canal}
              onChange={(e) => setCanal(e.target.value as any)}
              className="text-xs border rounded px-2 py-1"
            >
              <option value="whatsapp">WhatsApp</option>
              <option value="email">Email</option>
              <option value="airbnb">Airbnb</option>
              <option value="booking">Booking</option>
              <option value="sms">SMS</option>
              <option value="manual">Manual</option>
            </select>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={gerarIA}
              disabled={pending}
              className="ml-auto"
            >
              🤖 Gerar rascunho IA
            </Button>
          </div>
          <div className="flex gap-2">
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Digite a mensagem…"
              rows={2}
              className="flex-1 border rounded-lg px-3 py-2 text-sm resize-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) enviar();
              }}
            />
            <Button onClick={enviar} disabled={pending || !texto.trim()}>
              {pending ? '…' : 'Enviar'}
            </Button>
          </div>
          <div className="text-[10px] text-ink-400 mt-1">Cmd/Ctrl+Enter envia</div>
        </div>
      </div>

      {/* Contexto lateral */}
      <aside className="w-72 bg-white border-l border-navy-100 overflow-y-auto">
        <div className="p-4 space-y-4 text-xs">
          <Bloco label="Estadia">
            <div>{formatDate(estada.data_checkin)} → {formatDate(estada.data_checkout)}</div>
            <div className="text-ink-500 capitalize">Status: {estada.status}</div>
          </Bloco>

          <Bloco label="Hóspede">
            <div className="font-semibold">{estada.hospede_nome}</div>
            {estada.hospede_email && <div className="text-ink-500">{estada.hospede_email}</div>}
            {estada.hospede_telefone && <div className="text-ink-500">{estada.hospede_telefone}</div>}
          </Bloco>

          <Bloco label="Imóvel">
            <div className="font-mono">{estada.imovel_codigo}</div>
            <div className="text-ink-500">{estada.imovel_endereco}</div>
          </Bloco>

          {(estada.wifi_ssid || estada.codigo_fechadura) && (
            <Bloco label="Acesso">
              {estada.wifi_ssid && (
                <div>Wi-Fi: <span className="font-mono">{estada.wifi_ssid}</span> / {estada.wifi_senha ?? '—'}</div>
              )}
              {estada.codigo_fechadura && (
                <div>Fechadura: <span className="font-mono font-bold">{estada.codigo_fechadura}</span></div>
              )}
            </Bloco>
          )}

          {estada.regras_casa && (
            <Bloco label="Regras">
              <p className="whitespace-pre-line text-ink-600">{estada.regras_casa}</p>
            </Bloco>
          )}

          <a
            href={`/admin/estadas/${estada.id}`}
            className="block text-center text-navy-900 font-medium hover:underline pt-2"
          >
            Ver detalhes da estada →
          </a>
        </div>
      </aside>
    </div>
  );
}

function Bloco({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase font-semibold text-ink-400 mb-1">{label}</div>
      <div className="text-ink-700 space-y-0.5">{children}</div>
    </div>
  );
}

function MensagemBubble({ msg }: { msg: Msg }) {
  const [pending, start] = useTransition();
  const isHospede = msg.origem === 'hospede';
  const isIA = msg.origem === 'ia';
  const isRascunho = msg.status === 'rascunho';

  const align = isHospede ? 'justify-start' : 'justify-end';
  const bg = isRascunho
    ? 'bg-amber-50 border border-amber-300'
    : isHospede
      ? 'bg-white border border-navy-100'
      : isIA
        ? 'bg-violet-50 border border-violet-200'
        : 'bg-navy-900 text-white';

  function aprovar() {
    start(async () => { await aprovarRascunho(msg.id); });
  }
  function excluir() {
    if (!confirm('Excluir rascunho?')) return;
    start(async () => { await excluirRascunho(msg.id); });
  }

  return (
    <div className={`flex ${align}`}>
      <div className={`max-w-[70%] rounded-2xl px-4 py-2 ${bg}`}>
        <div className="text-[10px] opacity-70 mb-1 flex items-center gap-2">
          <span>{isHospede ? '👤 Hóspede' : isIA ? '🤖 IA' : '✍️ Admin'}</span>
          {isRascunho && <span className="font-bold text-amber-700">RASCUNHO</span>}
          <span>· {new Date(msg.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <div className="text-sm whitespace-pre-wrap">{msg.texto}</div>
        {isRascunho && (
          <div className="flex gap-2 mt-2 pt-2 border-t border-amber-200">
            <button
              onClick={aprovar}
              disabled={pending}
              className="text-xs font-semibold text-emerald-700 hover:underline"
            >
              ✓ Aprovar e marcar como enviada
            </button>
            <button
              onClick={excluir}
              disabled={pending}
              className="text-xs text-rose-700 hover:underline ml-auto"
            >
              Excluir
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
