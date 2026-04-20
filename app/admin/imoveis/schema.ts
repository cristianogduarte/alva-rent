import { z } from 'zod';

export const TIPOS = ['apartamento', 'casa', 'sala', 'loja', 'outro'] as const;
export const STATUS = ['vago', 'alugado', 'manutencao', 'vendido'] as const;
export const MODALIDADES = ['long_stay', 'short_stay'] as const;

const opt = (s: z.ZodString) =>
  z.preprocess((v) => (v === '' || v == null ? null : v), s.nullable());

const optNum = z.preprocess(
  (v) => (v === '' || v == null ? null : Number(v)),
  z.number().nonnegative().nullable()
);

export const imovelSchema = z.object({
  codigo: z.string().trim().min(1, 'Código é obrigatório').max(40),
  tipo: z.enum(TIPOS),
  endereco: z.string().trim().min(3, 'Endereço é obrigatório'),
  numero: opt(z.string().trim().max(20)),
  complemento: opt(z.string().trim().max(80)),
  bairro: opt(z.string().trim().max(80)),
  cidade: z.string().trim().min(2),
  uf: z.string().trim().length(2).toUpperCase(),
  cep: opt(z.string().trim().max(10)),
  area_m2: optNum,
  iptu_anual: optNum,
  cond_mensal: optNum,
  status: z.enum(STATUS),
  modalidade: z.enum(MODALIDADES).default('long_stay'),
  diaria_base: optNum,
  capacidade_hospedes: optNum,
  checkin_time: opt(z.string().trim().max(5)),
  checkout_time: opt(z.string().trim().max(5)),
  observacoes: opt(z.string().trim().max(2000)),
});

export type ImovelInput = z.infer<typeof imovelSchema>;
