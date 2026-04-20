import { z } from 'zod';

const optStr = (max = 2000) =>
  z.preprocess((v) => (v === '' || v == null ? null : v), z.string().trim().max(max).nullable());

const optInt = z.preprocess(
  (v) => (v === '' || v == null ? null : Number(v)),
  z.number().int().nonnegative().nullable()
);

const optBool = z.preprocess(
  (v) => v === 'on' || v === 'true' || v === true,
  z.boolean()
);

export const hospedagemSchema = z.object({
  // Acesso
  endereco_completo: optStr(500),
  ponto_referencia: optStr(500),
  maps_url: optStr(500),
  vagas_garagem: optInt,
  vaga_numero: optStr(30),
  portaria_info: optStr(1000),
  sindico_nome: optStr(120),
  sindico_telefone: optStr(30),
  tipo_acesso: z.enum(['chave', 'fechadura_digital', 'tag', 'app', 'porteiro', 'outro']).default('chave'),
  codigo_fechadura: optStr(40),
  instrucoes_acesso: optStr(2000),

  // Vídeos principais
  video_checkin_url: optStr(500),
  video_checkout_url: optStr(500),
  video_tour_url: optStr(500),

  // Wi-Fi
  wifi_ssid: optStr(120),
  wifi_senha: optStr(120),

  // Regras
  aceita_pets: optBool,
  permite_fumar: optBool,
  permite_festa: optBool,
  permite_criancas: optBool,
  horario_silencio_inicio: optStr(5),
  horario_silencio_fim: optStr(5),
  regras_casa: optStr(2000),

  // Estrutura
  qtd_quartos: optInt,
  qtd_banheiros: optInt,
  qtd_camas_casal: optInt,
  qtd_camas_solteiro: optInt,
  qtd_sofa_cama: optInt,

  // Limpeza
  observacoes_limpeza: optStr(2000),
  manual_url: optStr(500),
  notas_operacionais: optStr(2000),
});

export type HospedagemInput = z.infer<typeof hospedagemSchema>;

// Chaves padrão — garantimos consistência entre unidades
export const AMENITIES_PADRAO = [
  { key: 'sabonete', label: 'Sabonete', unidade: 'un' },
  { key: 'shampoo', label: 'Shampoo', unidade: 'un' },
  { key: 'condicionador', label: 'Condicionador', unidade: 'un' },
  { key: 'papel_higienico_rolos', label: 'Papel higiênico', unidade: 'rolos' },
  { key: 'detergente', label: 'Detergente', unidade: 'un' },
  { key: 'sabao_em_po', label: 'Sabão em pó', unidade: 'un' },
] as const;

export const ENXOVAL_PADRAO = [
  { key: 'toalha_banho', label: 'Toalhas de banho' },
  { key: 'toalha_rosto', label: 'Toalhas de rosto' },
  { key: 'toalha_piscina', label: 'Toalhas de piscina' },
  { key: 'jogo_cama_casal', label: 'Jogos de cama (casal)' },
  { key: 'jogo_cama_solteiro', label: 'Jogos de cama (solteiro)' },
  { key: 'travesseiros', label: 'Travesseiros' },
  { key: 'edredom', label: 'Edredons' },
  { key: 'cobertor', label: 'Cobertores' },
] as const;

export const COZINHA_PADRAO = [
  { key: 'pratos', label: 'Pratos' },
  { key: 'talheres_jogos', label: 'Jogos de talheres' },
  { key: 'copos', label: 'Copos' },
  { key: 'tacas', label: 'Taças' },
  { key: 'canecas', label: 'Canecas' },
  { key: 'panelas', label: 'Panelas' },
] as const;
