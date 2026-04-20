'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { uploadArquivo } from './actions';

const categorias = [
  { value: 'contrato', label: 'Contrato' },
  { value: 'aditivo', label: 'Aditivo' },
  { value: 'vistoria', label: 'Vistoria' },
  { value: 'comprovante', label: 'Comprovante' },
  { value: 'rg_cpf', label: 'RG/CPF' },
  { value: 'outro', label: 'Outro' },
];

export function UploadForm({ contratoId }: { contratoId: string }) {
  const [isPending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const categoriaRef = useRef<HTMLSelectElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setErr(null);
    const categoria = categoriaRef.current?.value ?? 'contrato';

    startTransition(async () => {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('categoria', categoria);
        const res = await uploadArquivo(contratoId, fd);
        if (!res.ok) {
          setErr(`${file.name}: ${res.error}`);
          break;
        }
      }
      if (fileInput.current) fileInput.current.value = '';
      router.refresh();
    });
  }

  return (
    <div
      className={`rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
        dragging ? 'border-navy-900 bg-navy-50' : 'border-navy-100 bg-white'
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        handleFiles(e.dataTransfer.files);
      }}
    >
      <div className="flex items-center justify-center gap-3 mb-3">
        <label className="text-xs text-ink-500 font-semibold uppercase">Categoria:</label>
        <select
          ref={categoriaRef}
          defaultValue="contrato"
          disabled={isPending}
          className="text-sm border border-navy-100 rounded-md px-2 py-1 bg-white"
        >
          {categorias.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      <p className="text-sm text-ink-500 mb-3">
        Arraste arquivos aqui ou{' '}
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          disabled={isPending}
          className="text-navy-900 font-semibold hover:underline"
        >
          escolha do computador
        </button>
      </p>
      <p className="text-xs text-ink-400">PDF, DOC, DOCX, JPG, PNG · até 50MB · múltiplos arquivos</p>

      <input
        ref={fileInput}
        type="file"
        multiple
        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {isPending && <div className="text-xs text-navy-900 mt-3">Enviando…</div>}
      {err && <div className="text-xs text-rose-600 mt-3">{err}</div>}
    </div>
  );
}
