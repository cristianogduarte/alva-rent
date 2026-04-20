import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Formata número como BRL: 1234.5 -> "R$ 1.234,50" */
export function brl(value: number | null | undefined): string {
  if (value == null) return '—';
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  });
}

/** "2026-04-18" -> "18/04/2026" */
export function formatDate(iso: string | Date | null | undefined): string {
  if (!iso) return '—';
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return d.toLocaleDateString('pt-BR');
}

/** Formata CPF/CNPJ */
export function formatCpf(cpf: string): string {
  const digits = cpf.replace(/\D/g, '');
  if (digits.length === 11) {
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
  if (digits.length === 14) {
    return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
  return cpf;
}

/** Calcula próxima data de vencimento com base no dia */
export function nextVencimento(diaVencimento: number, fromDate: Date = new Date()): Date {
  const venc = new Date(fromDate.getFullYear(), fromDate.getMonth(), diaVencimento);
  if (venc < fromDate) {
    venc.setMonth(venc.getMonth() + 1);
  }
  return venc;
}

/** YYYYMM da competência */
export function competenciaCode(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}${m}`;
}

/** Chave idempotente para a API Inter */
export function seuNumero(contratoId: string, competencia: Date): string {
  // Inter aceita até 15 chars no seuNumero. Usamos primeiros 8 chars do uuid + YYYYMM.
  return `${contratoId.replace(/-/g, '').slice(0, 8)}-${competenciaCode(competencia)}`;
}
