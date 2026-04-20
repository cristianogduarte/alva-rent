import { z } from 'zod';

const opt = (s: z.ZodString) =>
  z.preprocess((v) => (v === '' || v == null ? null : v), s.nullable());

const docDigits = z.preprocess(
  (v) => (v === '' || v == null ? null : String(v).replace(/\D/g, '')),
  z
    .string()
    .nullable()
    .refine(
      (s) => s === null || s.length === 11 || s.length === 14,
      'CPF (11) ou CNPJ (14) dígitos'
    )
);

export const proprietarioSchema = z.object({
  nome: z.string().trim().min(3, 'Nome é obrigatório'),
  cpf_cnpj: docDigits,
  email: opt(z.string().trim().email('E-mail inválido')),
  telefone: opt(z.string().trim().max(20)),
  comissao_pct: z.preprocess(
    (v) => (v === '' || v == null ? 0 : Number(v)),
    z.number().min(0, 'Mínimo 0%').max(100, 'Máximo 100%')
  ),
  observacoes: opt(z.string().trim().max(2000)),
});

export type ProprietarioInput = z.infer<typeof proprietarioSchema>;
