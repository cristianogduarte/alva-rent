/**
 * Builder de iCalendar (RFC 5545) — sem dependências.
 * Exporta estadas como VEVENTs para Airbnb/Booking importarem e bloquearem datas.
 */

export interface IcalEvento {
  uid: string;
  dataCheckin: string; // YYYY-MM-DD
  dataCheckout: string; // YYYY-MM-DD
  summary: string;
  description?: string;
}

function formatDateAllDay(d: string): string {
  // VALUE=DATE — DTSTART em all-day = YYYYMMDD (sem hora, sem Z)
  return d.replaceAll('-', '');
}

function escape(s: string): string {
  return s
    .replaceAll('\\', '\\\\')
    .replaceAll('\n', '\\n')
    .replaceAll(',', '\\,')
    .replaceAll(';', '\\;');
}

function fold(line: string): string {
  // RFC 5545: linhas > 75 bytes quebradas com CRLF + espaço
  if (line.length <= 75) return line;
  const parts: string[] = [];
  let rest = line;
  parts.push(rest.slice(0, 75));
  rest = rest.slice(75);
  while (rest.length > 74) {
    parts.push(' ' + rest.slice(0, 74));
    rest = rest.slice(74);
  }
  if (rest.length) parts.push(' ' + rest);
  return parts.join('\r\n');
}

export function buildIcal(
  calName: string,
  eventos: IcalEvento[],
  prodId = '-//ALVA Rent//Short Stay//PT-BR'
): string {
  const now = new Date();
  const dtStamp =
    now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:${prodId}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    fold(`X-WR-CALNAME:${escape(calName)}`),
  ];

  for (const e of eventos) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${e.uid}@alvarent.com.br`,
      `DTSTAMP:${dtStamp}`,
      `DTSTART;VALUE=DATE:${formatDateAllDay(e.dataCheckin)}`,
      `DTEND;VALUE=DATE:${formatDateAllDay(e.dataCheckout)}`,
      fold(`SUMMARY:${escape(e.summary)}`),
    );
    if (e.description) lines.push(fold(`DESCRIPTION:${escape(e.description)}`));
    lines.push('TRANSP:OPAQUE', 'END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n') + '\r\n';
}
