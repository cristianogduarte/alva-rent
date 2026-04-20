import { z } from 'zod';

export const CANAIS = ['airbnb', 'booking', 'direto', 'outro'] as const;
export const STATUS = [
  'pre_reservada',
  'confirmada',
  'checkin',
  'checkout',
  'cancelada',
] as const;
export const TIPOS_PAGAMENTO = [
  'sinal',
  'saldo',
  'caucao',
  'limpeza',
  'total',
] as const;

const opt = (s: z.ZodString) =>
  z.preprocess((v) => (v === '' || v == null ? null : v), s.nullable());

const num = (min = 0) =>
  z.preprocess((v) => Number(v ?? 0), z.number().min(min));

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida');

// ==========================================================
// Hóspede (pode ser criado inline a partir do formulário de estada)
// ==========================================================
export const hospedeSchema = z.object({
  nome: z.string().trim().min(2, 'Nome obrigatório').max(120),
  documento: opt(z.string().trim().max(40)),
  email: opt(z.string().trim().email('Email inválido')),
  telefone: opt(z.string().trim().max(30)),
  pais: z.string().trim().max(2).default('BR'),
  origem: z.enum(CANAIS).default('direto'),
  observacoes: opt(z.string().trim().max(2000)),
});
export type HospedeInput = z.infer<typeof hospedeSchema>;

// ==========================================================
// Estada
// ==========================================================
export const estadaSchema = z
  .object({
    codigo: z.string().trim().max(40).optional().default(''), // auto-gerado se vazio
    imovel_id: z.string().uuid('Selecione um imóvel'),
    hospede_id: z.preprocess(
      (v) => (v === '' || v === 'novo' ? null : v),
      z.string().uuid().nullable()
    ),
    // Hóspede inline (quando hospede_id = "novo")
    hospede_novo_nome: opt(z.string().trim().max(120)),
    hospede_novo_email: opt(z.string().trim().email('Email inválido')),
    hospede_novo_telefone: opt(z.string().trim().max(30)),
    hospede_novo_documento: opt(z.string().trim().max(40)),

    data_checkin: date,
    data_checkout: date,
    numero_hospedes: z.preprocess(
      (v) => Number(v ?? 1),
      z.number().int().min(1).max(30)
    ),
    valor_diaria: num(0),
    valor_total: num(0),
    taxa_limpeza: num(0),
    taxa_plataforma: num(0),
    canal: z.enum(CANAIS),
    canal_reserva_id: opt(z.string().trim().max(80)),
    status: z.enum(STATUS),
    taxa_administracao_pct: z.preprocess(
      (v) => (v === '' || v == null ? 10 : Number(v)),
      z.number().min(0).max(100)
    ),
    observacoes: opt(z.string().trim().max(2000)),
  })
  .refine((d) => d.data_checkout > d.data_checkin, {
    message: 'Check-out deve ser após check-in',
    path: ['data_checkout'],
  });

export type EstadaInput = z.infer<typeof estadaSchema>;

// ==========================================================
// Pagamento de estada
// ==========================================================
export const STATUS_PAGAMENTO = [
  'pendente',
  'pago',
  'cancelado',
  'reembolsado',
] as const;
export const FORMAS_PAGAMENTO = [
  'pix',
  'boleto',
  'airbnb_payout',
  'booking_payout',
  'cartao_externo',
  'outro',
] as const;

export const pagamentoSchema = z.object({
  tipo: z.enum(TIPOS_PAGAMENTO),
  valor: num(0.01),
  data_vencimento: opt(date),
  data_pagamento: opt(date),
  forma: z.preprocess(
    (v) => (v === '' ? null : v),
    z.enum(FORMAS_PAGAMENTO).nullable()
  ),
  status: z.enum(STATUS_PAGAMENTO),
  payout_ref: opt(z.string().trim().max(80)),
  observacoes: opt(z.string().trim().max(500)),
});
export type PagamentoInput = z.infer<typeof pagamentoSchema>;

// ==========================================================
// Helpers
// ==========================================================
export function gerarCodigoEstada(imovelCodigo: string, dataCheckin: string) {
  const yyyymm = dataCheckin.slice(0, 7).replace('-', '');
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `EST-${imovelCodigo}-${yyyymm}-${rand}`;
}
