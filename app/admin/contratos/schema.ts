import { z } from 'zod';

export const INDICES = ['IGPM', 'IPCA', 'INPC', 'fixo'] as const;
export const STATUS = ['ativo', 'encerrado', 'rescindido', 'suspenso'] as const;
export const CANAIS = ['whatsapp', 'email', 'push'] as const;
export const RESPONSAVEIS = ['locatario', 'locador'] as const;

const opt = (s: z.ZodString) =>
  z.preprocess((v) => (v === '' || v == null ? null : v), s.nullable());

const num = (min = 0) =>
  z.preprocess((v) => Number(v ?? 0), z.number().min(min));

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida');

export const contratoSchema = z
  .object({
    codigo: z.string().trim().min(1, 'Código é obrigatório').max(40),
    imovel_id: z.string().uuid('Selecione um imóvel'),
    inquilino_id: z.string().uuid('Selecione um inquilino'),
    valor_aluguel: num(0.01),
    valor_condominio: num(),
    condominio_responsavel: z.enum(RESPONSAVEIS).default('locatario'),
    valor_iptu_mensal: num(),
    iptu_responsavel: z.enum(RESPONSAVEIS).default('locatario'),
    taxa_administracao_pct: z.preprocess(
      (v) => (v === '' || v == null ? 10 : Number(v)),
      z.number().min(0).max(100)
    ),
    outras_taxas: num(),
    dia_vencimento: z.preprocess(
      (v) => Number(v),
      z.number().int().min(1).max(28)
    ),
    indice_reajuste: z.enum(INDICES),
    multa_atraso_pct: num(),
    juros_dia_pct: num(),
    data_inicio: date,
    data_fim: date,
    canal_envio: z.preprocess(
      (v) => (Array.isArray(v) ? v : v ? [v] : []),
      z.array(z.enum(CANAIS)).min(1, 'Selecione ao menos um canal')
    ),
    status: z.enum(STATUS),
    observacoes: opt(z.string().trim().max(2000)),
  })
  .refine((d) => d.data_fim > d.data_inicio, {
    message: 'Data final deve ser após a inicial',
    path: ['data_fim'],
  });

export type ContratoInput = z.infer<typeof contratoSchema>;
