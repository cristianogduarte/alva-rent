/**
 * Parser heurístico de emails de reserva Airbnb / Booking.
 * Estratégia: regex em cima do corpo do email colado pelo admin.
 * Não é 100% à prova de bala — mas cobre 90% dos templates atuais
 * e sempre mostra preview antes de aplicar.
 */

export type Canal = 'airbnb' | 'booking' | 'desconhecido';

export interface ReservaExtraida {
  canal: Canal;
  canal_reserva_id: string | null;
  hospede_nome: string | null;
  hospede_email: string | null;
  hospede_telefone: string | null;
  data_checkin: string | null; // YYYY-MM-DD
  data_checkout: string | null;
  numero_hospedes: number | null;
  valor_total: number | null;
  raw_snippet: string;
}

// ---------- helpers ----------
function normalize(txt: string): string {
  return txt
    .replace(/\r/g, '')
    .replace(/\u00a0/g, ' ') // nbsp
    .replace(/[ \t]+/g, ' ')
    .trim();
}

const MES_PT: Record<string, string> = {
  jan: '01', fev: '02', mar: '03', abr: '04', mai: '05', jun: '06',
  jul: '07', ago: '08', set: '09', out: '10', nov: '11', dez: '12',
};
const MES_EN: Record<string, string> = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
};

function parseDataFlexivel(s: string): string | null {
  const t = s.trim().toLowerCase();
  // YYYY-MM-DD
  let m = t.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  // DD/MM/YYYY
  m = t.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  // "12 de abril de 2026" | "12 abr 2026"
  m = t.match(/(\d{1,2})\s*(?:de\s+)?([a-zç]{3,9})\.?\s*(?:de\s+)?(\d{4})/);
  if (m) {
    const mesKey = m[2].slice(0, 3);
    const mes = MES_PT[mesKey] ?? MES_EN[mesKey];
    if (mes) return `${m[3]}-${mes}-${m[1].padStart(2, '0')}`;
  }
  // "Apr 12, 2026"
  m = t.match(/([a-z]{3,9})\s+(\d{1,2}),?\s+(\d{4})/);
  if (m) {
    const mes = MES_EN[m[1].slice(0, 3)];
    if (mes) return `${m[3]}-${mes}-${m[2].padStart(2, '0')}`;
  }
  return null;
}

function parseValorBRL(s: string): number | null {
  const m = s.match(/R?\$?\s*([\d.]+,\d{2}|\d+\.\d{2}|\d+)/);
  if (!m) return null;
  const raw = m[1];
  if (raw.includes(',')) return Number(raw.replace(/\./g, '').replace(',', '.'));
  return Number(raw);
}

// ---------- Airbnb ----------
function parseAirbnb(text: string): ReservaExtraida {
  const out: ReservaExtraida = {
    canal: 'airbnb',
    canal_reserva_id: null,
    hospede_nome: null,
    hospede_email: null,
    hospede_telefone: null,
    data_checkin: null,
    data_checkout: null,
    numero_hospedes: null,
    valor_total: null,
    raw_snippet: text.slice(0, 400),
  };

  // Código de confirmação (HM... ou HMABC1234)
  const cod = text.match(/\b(H[A-Z0-9]{8,12})\b/);
  if (cod) out.canal_reserva_id = cod[1];

  // Nome do hóspede — padrões: "Hóspede: X", "Reserva de X", "booking from X"
  const nome =
    text.match(/h[óo]spede[s]?\s*[:\-]\s*([A-Za-zÀ-ÿ][\wÀ-ÿ' .-]{2,60})/i) ||
    text.match(/guest\s*[:\-]\s*([A-Za-z][\w' .-]{2,60})/i) ||
    text.match(/reserva de\s+([A-Za-zÀ-ÿ][\wÀ-ÿ' .-]{2,40})/i) ||
    text.match(/reservation from\s+([A-Z][\w' .-]{2,40})/i);
  if (nome) out.hospede_nome = nome[1].trim();

  // Datas — procura "Check-in ... Check-out ..."
  const ci = text.match(/check[- ]?in[:\s]+([^\n]{5,40})/i);
  const co = text.match(/check[- ]?out[:\s]+([^\n]{5,40})/i);
  if (ci) out.data_checkin = parseDataFlexivel(ci[1]);
  if (co) out.data_checkout = parseDataFlexivel(co[1]);

  // Nº hóspedes
  const pax = text.match(/(\d+)\s*h[óo]spede|(\d+)\s*guest/i);
  if (pax) out.numero_hospedes = Number(pax[1] ?? pax[2]);

  // Valor — "Total R$ 1.234,00"
  const valor = text.match(/total[^R$\d]{0,20}(R?\$\s*[\d.,]+)/i);
  if (valor) out.valor_total = parseValorBRL(valor[1]);

  // Email / tel (se aparecer)
  const em = text.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
  if (em && !em[0].endsWith('@airbnb.com')) out.hospede_email = em[0];

  const tel = text.match(/(\+?\d{2}[\s-]?\(?\d{2}\)?[\s-]?\d{4,5}[\s-]?\d{4})/);
  if (tel) out.hospede_telefone = tel[1];

  return out;
}

// ---------- Booking.com ----------
function parseBooking(text: string): ReservaExtraida {
  const out: ReservaExtraida = {
    canal: 'booking',
    canal_reserva_id: null,
    hospede_nome: null,
    hospede_email: null,
    hospede_telefone: null,
    data_checkin: null,
    data_checkout: null,
    numero_hospedes: null,
    valor_total: null,
    raw_snippet: text.slice(0, 400),
  };

  // Booking: "Confirmation number: 1234567890" (10 dígitos)
  const cod =
    text.match(/confirma[çc][ãa]o[:\s#]*([0-9]{8,12})/i) ||
    text.match(/confirmation[\s#:]+(?:number|code)?[:\s]*([0-9]{8,12})/i) ||
    text.match(/\b([0-9]{10})\b/);
  if (cod) out.canal_reserva_id = cod[1];

  const nome =
    text.match(/nome do h[óo]spede[:\s]+([A-Za-zÀ-ÿ][\wÀ-ÿ' .-]{2,60})/i) ||
    text.match(/guest name[:\s]+([A-Za-z][\w' .-]{2,60})/i) ||
    text.match(/(?:de|from|by)\s+([A-Z][a-zÀ-ÿ]+(?:\s+[A-Z][a-zÀ-ÿ]+){1,3})/);
  if (nome) out.hospede_nome = nome[1].trim();

  const ci =
    text.match(/check[- ]?in[:\s]+([^\n]{5,40})/i) ||
    text.match(/chegada[:\s]+([^\n]{5,40})/i);
  const co =
    text.match(/check[- ]?out[:\s]+([^\n]{5,40})/i) ||
    text.match(/partida[:\s]+([^\n]{5,40})/i);
  if (ci) out.data_checkin = parseDataFlexivel(ci[1]);
  if (co) out.data_checkout = parseDataFlexivel(co[1]);

  const pax = text.match(/(\d+)\s*h[óo]spede|(\d+)\s*guest/i);
  if (pax) out.numero_hospedes = Number(pax[1] ?? pax[2]);

  const valor =
    text.match(/valor total[^R$\d]{0,20}(R?\$\s*[\d.,]+)/i) ||
    text.match(/total price[^$\d]{0,20}(R?\$\s*[\d.,]+)/i);
  if (valor) out.valor_total = parseValorBRL(valor[1]);

  const em = text.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
  if (em && !em[0].includes('@booking.com')) out.hospede_email = em[0];

  const tel = text.match(/(\+?\d{2}[\s-]?\(?\d{2}\)?[\s-]?\d{4,5}[\s-]?\d{4})/);
  if (tel) out.hospede_telefone = tel[1];

  return out;
}

// ---------- entry point ----------
export function parseEmailReserva(raw: string): ReservaExtraida {
  const text = normalize(raw);
  const lower = text.toLowerCase();

  if (lower.includes('airbnb') || /\bH[A-Z0-9]{8,}\b/.test(text)) {
    return parseAirbnb(text);
  }
  if (lower.includes('booking.com') || lower.includes('booking')) {
    return parseBooking(text);
  }
  // fallback: tenta Airbnb (mais comum)
  const tentativa = parseAirbnb(text);
  return { ...tentativa, canal: 'desconhecido' };
}
