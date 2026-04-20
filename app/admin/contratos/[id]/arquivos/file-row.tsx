'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { excluirArquivo, getSignedUrl } from './actions';

const iconMime = (mime: string | null, nome: string) => {
  const ext = nome.split('.').pop()?.toLowerCase();
  if (mime?.startsWith('image/')) return '🖼';
  if (mime === 'application/pdf' || ext === 'pdf') return '📕';
  if (ext === 'doc' || ext === 'docx') return '📄';
  return '📎';
};

const catLabel: Record<string, string> = {
  contrato: 'Contrato',
  aditivo: 'Aditivo',
  vistoria: 'Vistoria',
  comprovante: 'Comprovante',
  rg_cpf: 'RG/CPF',
  outro: 'Outro',
};

const catCls: Record<string, string> = {
  contrato: 'bg-navy-100 text-navy-900',
  aditivo: 'bg-indigo-100 text-indigo-700',
  vistoria: 'bg-teal-100 text-teal-700',
  comprovante: 'bg-emerald-100 text-emerald-700',
  rg_cpf: 'bg-amber-100 text-amber-700',
  outro: 'bg-ink-100 text-ink-600',
};

function formatSize(b: number | null) {
  if (!b) return '';
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

export function FileRow({
  contratoId,
  arquivo,
}: {
  contratoId: string;
  arquivo: {
    id: string;
    nome: string;
    categoria: string;
    mime: string | null;
    tamanho: number | null;
    storage_path: string;
    uploaded_at: string;
  };
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  async function handleDownload() {
    const res = await getSignedUrl(arquivo.storage_path);
    if (res.ok && res.url) window.open(res.url, '_blank');
    else alert(res.error ?? 'Erro ao gerar link');
  }

  function handleDelete() {
    if (!confirm(`Excluir "${arquivo.nome}"?`)) return;
    startTransition(async () => {
      const res = await excluirArquivo(contratoId, arquivo.id);
      if (!res.ok) alert(res.error);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-4 px-4 py-3 border-t border-navy-50 hover:bg-navy-50/30">
      <div className="text-2xl">{iconMime(arquivo.mime, arquivo.nome)}</div>
      <div className="flex-1 min-w-0">
        <button
          type="button"
          onClick={handleDownload}
          className="text-sm font-semibold text-navy-900 hover:underline truncate block text-left w-full"
          title={arquivo.nome}
        >
          {arquivo.nome}
        </button>
        <div className="flex items-center gap-2 mt-0.5">
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase ${catCls[arquivo.categoria]}`}>
            {catLabel[arquivo.categoria] ?? arquivo.categoria}
          </span>
          <span className="text-xs text-ink-500">{formatSize(arquivo.tamanho)}</span>
          <span className="text-xs text-ink-400">
            {new Date(arquivo.uploaded_at).toLocaleDateString('pt-BR')}
          </span>
        </div>
      </div>
      <button
        type="button"
        onClick={handleDownload}
        className="text-xs px-2 py-1 rounded text-navy-900 hover:bg-navy-50 font-semibold"
      >
        baixar
      </button>
      <button
        type="button"
        onClick={handleDelete}
        disabled={isPending}
        className="text-xs px-2 py-1 rounded text-rose-600 hover:bg-rose-50 font-semibold disabled:opacity-50"
      >
        excluir
      </button>
    </div>
  );
}
