/**
 * Algoritmo v1 de precificação dinâmica — transparente e auditável.
 *
 * preço = base × mult_dia × mult_estacao × mult_evento × (1 + gap_ocupacao × 0.3)
 *
 * Onde:
 *  - base: diaria_base do imóvel
 *  - mult_dia: seg-qui = 0.9 | sex-sáb = 1.20 | dom = 1.05
 *  - mult_estacao (Brasil): dez-mar = 1.25 | jun-ago = 1.10 | resto = 1.0
 *  - mult_evento: vem da tabela eventos_cidade (ex: Réveillon 2.0, Carnaval 1.8)
 *  - gap_ocupacao: (ocupação desejada - ocupação projetada dos próximos 14 dias)
 *    ex: desejada 80%, projetada 50% → gap 0.30 → acréscimo de +9%
 *
 * Resultado é arredondado pra múltiplo de R$5 (fica mais "vendável").
 * Limites: respeita diaria_minima/diaria_maxima do imóvel quando definidos.
 */

export interface Imovel {
  id: string;
  codigo: string;
  cidade: string | null;
  uf: string | null;
  diaria_base: number | null;
  diaria_minima?: number | null;
  diaria_maxima?: number | null;
}

export interface Evento {
  data_inicio: string;
  data_fim: string;
  multiplicador: number;
  nome: string;
}

export interface RegraAplicada {
  base: number;
  mult_dia: number;
  mult_estacao: number;
  mult_evento: number;
  gap_ocupacao: number;
  evento?: string;
  dia_semana: string;
  estacao: string;
}

export interface PrecoCalculado {
  data: string;
  diaria_calculada: number;
  diaria_final: number;
  regra: RegraAplicada;
}

const DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];

function multDia(dow: number): { mult: number; label: string } {
  // 0=dom 1=seg ... 6=sab
  if (dow >= 1 && dow <= 4) return { mult: 0.9, label: `${DIAS[dow]} (semana)` };
  if (dow === 5 || dow === 6) return { mult: 1.2, label: `${DIAS[dow]} (fim de semana)` };
  return { mult: 1.05, label: 'dom (domingo)' };
}

function multEstacao(mes: number): { mult: number; label: string } {
  // mes: 1-12
  if (mes === 12 || mes <= 3) return { mult: 1.25, label: 'alta (verão/Réveillon)' };
  if (mes >= 6 && mes <= 8) return { mult: 1.1, label: 'média (inverno)' };
  return { mult: 1.0, label: 'baixa' };
}

function multEvento(data: string, eventos: Evento[]): { mult: number; nome?: string } {
  for (const e of eventos) {
    if (data >= e.data_inicio && data <= e.data_fim) {
      return { mult: Number(e.multiplicador), nome: e.nome };
    }
  }
  return { mult: 1.0 };
}

function arredondarPara5(v: number): number {
  return Math.round(v / 5) * 5;
}

function aplicarLimites(v: number, min?: number | null, max?: number | null): number {
  if (min != null && v < min) return min;
  if (max != null && v > max) return max;
  return v;
}

/**
 * Calcula preço sugerido para uma data.
 * @param ocupacaoProjetada 0..1 — fração de noites ocupadas nos próximos 14d
 * @param ocupacaoDesejada 0..1 — alvo configurável (default 0.75)
 */
export function calcularPreco(
  imovel: Imovel,
  data: string,
  eventos: Evento[],
  ocupacaoProjetada: number,
  ocupacaoDesejada = 0.75,
): PrecoCalculado {
  const base = Number(imovel.diaria_base ?? 0);
  const d = new Date(data + 'T12:00:00');
  const mDia = multDia(d.getDay());
  const mEst = multEstacao(d.getMonth() + 1);
  const mEv = multEvento(data, eventos);

  const gap = Math.max(-0.3, Math.min(0.5, ocupacaoDesejada - ocupacaoProjetada));
  const multOcup = 1 + gap * 0.3;

  const bruto = base * mDia.mult * mEst.mult * mEv.mult * multOcup;
  const arred = arredondarPara5(bruto);
  const final = aplicarLimites(arred, imovel.diaria_minima, imovel.diaria_maxima);

  return {
    data,
    diaria_calculada: arred,
    diaria_final: final,
    regra: {
      base,
      mult_dia: mDia.mult,
      mult_estacao: mEst.mult,
      mult_evento: mEv.mult,
      gap_ocupacao: gap,
      evento: mEv.nome,
      dia_semana: mDia.label,
      estacao: mEst.label,
    },
  };
}

/** Gera intervalo de N datas a partir de hoje (YYYY-MM-DD). */
export function gerarDatas(n: number): string[] {
  const out: string[] = [];
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  for (let i = 0; i < n; i++) {
    const d = new Date(hoje.getTime() + i * 86400000);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

/**
 * Dado o array de estadas confirmadas do imóvel, calcula fração ocupada
 * nos próximos 14 dias (pra usar no gap_ocupacao).
 */
export function calcularOcupacaoProjetada(
  estadas: Array<{ data_checkin: string; data_checkout: string }>,
  diasJanela = 14,
): number {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const fim = new Date(hoje.getTime() + diasJanela * 86400000);
  const diasOcupados = new Set<string>();
  for (const e of estadas) {
    const ci = new Date(e.data_checkin);
    const co = new Date(e.data_checkout);
    const inicio = ci > hoje ? ci : hoje;
    const termino = co < fim ? co : fim;
    for (let t = inicio.getTime(); t < termino.getTime(); t += 86400000) {
      diasOcupados.add(new Date(t).toISOString().slice(0, 10));
    }
  }
  return Math.min(1, diasOcupados.size / diasJanela);
}
