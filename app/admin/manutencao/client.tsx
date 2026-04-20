'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { criarManutencao, atualizarStatus, excluirManutencao } from './actions';

type Imovel = { id: string; codigo: string; endereco: string };
type Fornecedor = { id: string; nome: string; especialidade?: string | null };

const inputCls = 'w-full border border-navy-100 rounded-lg px-3 py-2 text-sm';

export function NovoTicketForm({
  imoveis,
  fornecedores,
}: {
  imoveis: Imovel[];
  fornecedores: Fornecedor[];
}) {
  const [pending, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [form, setForm] = useState({
    imovel_id: '',
    tipo: 'corretiva' as 'preventiva' | 'corretiva' | 'vistoria' | 'reparo',
    prioridade: 'media' as 'baixa' | 'media' | 'alta' | 'urgente',
    titulo: '',
    descricao: '',
    fornecedor_id: '',
    agendada_para: '',
  });

  function salvar() {
    setErro(null);
    start(async () => {
      const r = await criarManutencao({
        imovel_id: form.imovel_id,
        tipo: form.tipo,
        prioridade: form.prioridade,
        titulo: form.titulo,
        descricao: form.descricao,
        fornecedor_id: form.fornecedor_id || null,
        agendada_para: form.agendada_para || null,
      });
      if (!r.ok) setErro(r.error);
      else setForm({ ...form, titulo: '', descricao: '', agendada_para: '' });
    });
  }

  return (
    <div className="grid grid-cols-6 gap-3 text-sm">
      <select
        value={form.imovel_id}
        onChange={(e) => setForm({ ...form, imovel_id: e.target.value })}
        className={`${inputCls} col-span-2`}
      >
        <option value="">Imóvel…</option>
        {imoveis.map((i) => (
          <option key={i.id} value={i.id}>
            {i.codigo} — {i.endereco}
          </option>
        ))}
      </select>
      <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value as any })} className={inputCls}>
        <option value="corretiva">Corretiva</option>
        <option value="preventiva">Preventiva</option>
        <option value="vistoria">Vistoria</option>
        <option value="reparo">Reparo</option>
      </select>
      <select
        value={form.prioridade}
        onChange={(e) => setForm({ ...form, prioridade: e.target.value as any })}
        className={inputCls}
      >
        <option value="baixa">Baixa</option>
        <option value="media">Média</option>
        <option value="alta">Alta</option>
        <option value="urgente">Urgente</option>
      </select>
      <select
        value={form.fornecedor_id}
        onChange={(e) => setForm({ ...form, fornecedor_id: e.target.value })}
        className={inputCls}
      >
        <option value="">Sem fornecedor</option>
        {fornecedores.map((f) => (
          <option key={f.id} value={f.id}>
            {f.nome} {f.especialidade ? `(${f.especialidade})` : ''}
          </option>
        ))}
      </select>
      <input
        type="datetime-local"
        value={form.agendada_para}
        onChange={(e) => setForm({ ...form, agendada_para: e.target.value })}
        className={inputCls}
        placeholder="Agendar"
      />
      <input
        value={form.titulo}
        onChange={(e) => setForm({ ...form, titulo: e.target.value })}
        className={`${inputCls} col-span-4`}
        placeholder="Título (ex: Ar-condicionado do quarto 1 não gela)"
      />
      <textarea
        value={form.descricao}
        onChange={(e) => setForm({ ...form, descricao: e.target.value })}
        className={`${inputCls} col-span-6 resize-none`}
        placeholder="Descrição detalhada (opcional)"
        rows={2}
      />
      {erro && <div className="col-span-6 text-xs text-rose-700">{erro}</div>}
      <div className="col-span-6 flex justify-end">
        <Button onClick={salvar} disabled={pending || !form.imovel_id || !form.titulo.trim()}>
          Abrir ticket
        </Button>
      </div>
    </div>
  );
}

export function AcoesTicket({
  id,
  status,
  custo,
  obs,
  fornecedores,
  fornecedor_id,
}: {
  id: string;
  status: string;
  custo: number | null;
  obs: string | null;
  fornecedores: Fornecedor[];
  fornecedor_id: string | null;
}) {
  const [pending, start] = useTransition();
  const [custoState, setCusto] = useState(custo?.toString() ?? '');
  const [obsState, setObs] = useState(obs ?? '');
  const [fornState, setForn] = useState(fornecedor_id ?? '');
  const [erro, setErro] = useState<string | null>(null);

  function mudar(novo: 'aberta' | 'agendada' | 'em_andamento' | 'resolvida' | 'cancelada') {
    setErro(null);
    start(async () => {
      const r = await atualizarStatus(id, novo, {
        custo: custoState ? Number(custoState) : null,
        observacoes_resolucao: obsState || null,
        fornecedor_id: fornState || null,
      });
      if (!r.ok) setErro(r.error);
    });
  }

  function excluir() {
    if (!confirm('Excluir este ticket? Essa ação não pode ser desfeita.')) return;
    start(async () => {
      const r = await excluirManutencao(id);
      if (!r.ok) setErro(r.error);
      else window.location.href = '/admin/manutencao';
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <label className="text-xs">
          <div className="font-semibold text-ink-500 uppercase mb-1">Fornecedor</div>
          <select value={fornState} onChange={(e) => setForn(e.target.value)} className={inputCls}>
            <option value="">Sem fornecedor</option>
            {fornecedores.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nome}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs">
          <div className="font-semibold text-ink-500 uppercase mb-1">Custo (R$)</div>
          <input
            type="number"
            step="0.01"
            value={custoState}
            onChange={(e) => setCusto(e.target.value)}
            className={inputCls}
          />
        </label>
      </div>
      <label className="text-xs block">
        <div className="font-semibold text-ink-500 uppercase mb-1">Observações de resolução</div>
        <textarea value={obsState} onChange={(e) => setObs(e.target.value)} className={inputCls} rows={3} />
      </label>

      {erro && <div className="text-xs text-rose-700">{erro}</div>}

      <div className="flex flex-wrap gap-2">
        {status !== 'agendada' && (
          <Button variant="outline" size="sm" onClick={() => mudar('agendada')} disabled={pending}>
            📅 Agendar
          </Button>
        )}
        {status !== 'em_andamento' && (
          <Button variant="outline" size="sm" onClick={() => mudar('em_andamento')} disabled={pending}>
            🔧 Em andamento
          </Button>
        )}
        {status !== 'resolvida' && (
          <Button size="sm" onClick={() => mudar('resolvida')} disabled={pending}>
            ✓ Resolver
          </Button>
        )}
        {status !== 'cancelada' && status !== 'resolvida' && (
          <Button variant="outline" size="sm" onClick={() => mudar('cancelada')} disabled={pending}>
            Cancelar
          </Button>
        )}
        <button
          onClick={excluir}
          disabled={pending}
          className="ml-auto text-xs text-rose-600 hover:underline"
        >
          Excluir ticket
        </button>
      </div>
    </div>
  );
}

export function FornecedorForm({
  inicial,
}: {
  inicial?: {
    id?: string;
    nome?: string;
    especialidade?: string | null;
    telefone?: string | null;
    email?: string | null;
    pix?: string | null;
    observacoes?: string | null;
    ativo?: boolean;
  };
}) {
  const [pending, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [form, setForm] = useState({
    nome: inicial?.nome ?? '',
    especialidade: inicial?.especialidade ?? '',
    telefone: inicial?.telefone ?? '',
    email: inicial?.email ?? '',
    pix: inicial?.pix ?? '',
    observacoes: inicial?.observacoes ?? '',
    ativo: inicial?.ativo ?? true,
  });

  function salvar() {
    setErro(null);
    start(async () => {
      const { salvarFornecedor } = await import('./actions');
      const r = await salvarFornecedor({ id: inicial?.id, ...form });
      if (!r.ok) setErro(r.error);
      else if (!inicial?.id) {
        setForm({ nome: '', especialidade: '', telefone: '', email: '', pix: '', observacoes: '', ativo: true });
      }
    });
  }

  return (
    <div className="grid grid-cols-3 gap-3 text-sm">
      <input placeholder="Nome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className={inputCls} />
      <input placeholder="Especialidade" value={form.especialidade} onChange={(e) => setForm({ ...form, especialidade: e.target.value })} className={inputCls} />
      <input placeholder="Telefone" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} className={inputCls} />
      <input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputCls} />
      <input placeholder="PIX" value={form.pix} onChange={(e) => setForm({ ...form, pix: e.target.value })} className={inputCls} />
      <label className="flex items-center gap-2 text-xs">
        <input type="checkbox" checked={form.ativo} onChange={(e) => setForm({ ...form, ativo: e.target.checked })} />
        Ativo
      </label>
      <textarea
        placeholder="Observações"
        value={form.observacoes}
        onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
        className={`${inputCls} col-span-3 resize-none`}
        rows={2}
      />
      {erro && <div className="col-span-3 text-xs text-rose-700">{erro}</div>}
      <div className="col-span-3 flex justify-end">
        <Button onClick={salvar} disabled={pending || !form.nome.trim()}>
          {inicial?.id ? 'Salvar' : 'Adicionar'}
        </Button>
      </div>
    </div>
  );
}

export function ExcluirFornecedorButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => {
        if (!confirm('Excluir fornecedor?')) return;
        start(async () => {
          const { excluirFornecedor } = await import('./actions');
          await excluirFornecedor(id);
        });
      }}
      className="text-xs text-rose-600 hover:underline"
    >
      Excluir
    </button>
  );
}
