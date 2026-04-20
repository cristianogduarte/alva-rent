import { z } from 'zod';

const opt = (s: z.ZodString) =>
  z.preprocess((v) => (v === '' || v == null ? null : v), s.nullable());

const optNum = z.preprocess(
  (v) => (v === '' || v == null ? null : Number(v)),
  z.number().nonnegative().nullable()
);

const optDate = z.preprocess(
  (v) => (v === '' || v == null ? null : v),
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida').nullable()
);

const cpfDigits = z
  .string()
  .transform((s) => s.replace(/\D/g, ''))
  .refine((s) => s.length === 11, 'CPF deve ter 11 dígitos');

export const inquilinoSchema = z.object({
  cpf: cpfDigits,
  nome: z.string().trim().min(3, 'Nome é obrigatório'),
  rg: opt(z.string().trim().max(20)),
  email: opt(z.string().trim().email('E-mail inválido')),
  telefone: opt(z.string().trim().max(20)),
  whatsapp: opt(z.string().trim().max(20)),
  data_nascimento: optDate,
  profissao: opt(z.string().trim().max(80)),
  renda: optNum,
  fiador_nome: opt(z.string().trim().max(120)),
  fiador_cpf: opt(z.string().trim().max(20)),
  seguro_fianca: z.preprocess((v) => v === 'on' || v === true || v === 'true', z.boolean()),
});

export type InquilinoInput = z.infer<typeof inquilinoSchema>;
