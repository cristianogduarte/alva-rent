/**
 * Parsers de CSV de payouts OTA — sem dependências.
 * Airbnb e Booking expõem extratos CSV com colunas distintas. O parser
 * genérico abaixo lida com aspas duplas, vírgulas dentro de campos e
 * quebra de linha em cell.
 */

export type Canal = 'airbnb' | 'booking';

export interface LinhaPayout {
  canal: Canal;
  data_payout: string;      // YYYY-MM-DD
  valor_bruto: number;
  valor_liquido: number;
  taxa_plataforma: number;
  referencia_externa: string | null; // ID do payout (não da reserva)
  canal_reserva_id: string | null;   // ID da reserva que gerou este payout
  hospede_nome: string | null;       // hint para match fallback
  data_checkin_hint: string | null;  // idem
  observacoes: string | null;
}

// ---------- CSV parser (RFC 4180-ish) ----------
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let inQuotes = false;
  const src = text.replace(/\r\n/g, '\n');

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"' && src[i + 1] === '"') { field += '"'; i++; continue; }
      if (ch === '"') { inQuotes = false; continue; }
      field += ch;
    } else {
      if (ch === '"') { inQuotes = true; continue; }
      if (ch === ',') { row.push(field); field = ''; continue; }
      if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; continue; }
      field += ch;
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.length > 1 || (r[0] && r[0].trim()));
}

function parseNumero(s: string | undefined): number {
  if (!s) return 0;
  // Suporta "1,234.56" (US) e "1.234,56" (BR)
  const t = s.replace(/[R$\s]/g, '').trim();
  if (!t) return 0;
  const lastComma = t.lastIndexOf(',');
  const lastDot = t.lastIndexOf('.');
  let n: string;
  if (lastComma > lastDot) {
    n = t.replace(/\./g, '').replace(',', '.');
  } else {
    n = t.replace(/,/g, '');
  }
  const v = Number(n);
  return isNaN(v) ? 0 : v;
}

function parseDataPt(s: string | undefined): string {
  if (!s) return '';
  const t = s.trim();
  let m = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/); // DD/MM/YYYY ou MM/DD/YYYY
  if (m) {
    const a = Number(m[1]), b = Number(m[2]);
    // heurística: se a > 12 é DD/MM; se b > 12 é MM/DD; senão assume DD/MM (BR)
    if (a > 12) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    if (b > 12) return `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`;
    return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  }
  return '';
}

function col(row: string[], headers: string[], ...nomes: string[]): string | undefined {
  for (const n of nomes) {
    const idx = headers.findIndex((h) => h.toLowerCase().trim() === n.toLowerCase());
    if (idx >= 0) return row[idx]?.trim();
  }
  return undefined;
}

// ---------- Airbnb ----------
/**
 * Formato típico (pode variar levemente por idioma/região):
 * Date, Type, Confirmation Code, Start Date, Nights, Guest, Listing,
 * Details, Reference, Currency, Amount, Paid Out, Host Fee, Cleaning Fee
 *
 * Interessa: Type=Reservation OR Payout (aí vem líquido),
 * Confirmation Code, Start Date, Guest, Amount, Paid Out, Host Fee.
 */
export function parseAirbnbCsv(text: string): LinhaPayout[] {
  const rows = parseCsv(text);
  if (rows.length < 2) return [];
  const headers = rows[0].map((h) => h.trim());

  const out: LinhaPayout[] = [];
  for (const r of rows.slice(1)) {
    const type = col(r, headers, 'Type', 'Tipo')?.toLowerCase() ?? '';
    // Ignora linhas de ajuste/adjustment puras
    if (!type || type.includes('adjustment') && !type.includes('reservation')) continue;

    const code = col(r, headers, 'Confirmation Code', 'Código de confirmação');
    if (!code) continue;

    const dataPayout =
      parseDataPt(col(r, headers, 'Date', 'Data')) ||
      parseDataPt(col(r, headers, 'Paid Out Date'));
    const valorBruto = parseNumero(col(r, headers, 'Amount', 'Valor'));
    const hostFee = parseNumero(col(r, headers, 'Host Fee', 'Taxa de host', 'Service Fee'));
    const liquido = parseNumero(col(r, headers, 'Paid Out', 'Valor líquido', 'Net')) || (valorBruto - hostFee);

    out.push({
      canal: 'airbnb',
      data_payout: dataPayout,
      valor_bruto: valorBruto,
      valor_liquido: liquido,
      taxa_plataforma: hostFee || Math.max(0, valorBruto - liquido),
      referencia_externa: col(r, headers, 'Reference', 'Referência') ?? null,
      canal_reserva_id: code,
      hospede_nome: col(r, headers, 'Guest', 'Hóspede') ?? null,
      data_checkin_hint: parseDataPt(col(r, headers, 'Start Date', 'Data de início')) || null,
      observacoes: col(r, headers, 'Details', 'Detalhes') ?? null,
    });
  }
  return out;
}

// ---------- Booking ----------
/**
 * Booking gera relatórios diversos (Reservations Statement, Financial report).
 * Colunas comuns: "Book number", "Guest name", "Arrival", "Departure",
 * "Total price", "Commission amount", "Payout date".
 */
export function parseBookingCsv(text: string): LinhaPayout[] {
  const rows = parseCsv(text);
  if (rows.length < 2) return [];
  const headers = rows[0].map((h) => h.trim());

  const out: LinhaPayout[] = [];
  for (const r of rows.slice(1)) {
    const code =
      col(r, headers, 'Book number', 'Reservation number', 'Número da reserva');
    if (!code) continue;

    const total = parseNumero(col(r, headers, 'Total price', 'Preço total', 'Amount'));
    const commission = parseNumero(col(r, headers, 'Commission amount', 'Comissão'));
    const liquido = total - commission;

    out.push({
      canal: 'booking',
      data_payout:
        parseDataPt(col(r, headers, 'Payout date', 'Invoice date', 'Data do pagamento')) ||
        parseDataPt(col(r, headers, 'Departure', 'Partida')) ||
        '',
      valor_bruto: total,
      valor_liquido: liquido,
      taxa_plataforma: commission,
      referencia_externa: col(r, headers, 'Invoice number', 'Nota fiscal') ?? null,
      canal_reserva_id: code,
      hospede_nome: col(r, headers, 'Guest name', 'Nome do hóspede') ?? null,
      data_checkin_hint: parseDataPt(col(r, headers, 'Arrival', 'Chegada')) || null,
      observacoes: null,
    });
  }
  return out;
}

export function parseOtaCsv(canal: Canal, text: string): LinhaPayout[] {
  return canal === 'airbnb' ? parseAirbnbCsv(text) : parseBookingCsv(text);
}
