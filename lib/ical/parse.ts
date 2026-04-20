/**
 * Parser mínimo de iCalendar (RFC 5545) para importar bloqueios
 * Airbnb/Booking → ALVA. Extrai apenas o que precisamos: UID, DTSTART,
 * DTEND, SUMMARY, DESCRIPTION.
 */

export interface IcalVevent {
  uid: string;
  dtstart: string; // YYYY-MM-DD
  dtend: string; // YYYY-MM-DD
  summary?: string;
  description?: string;
}

function unfold(raw: string): string {
  // Junta linhas continuadas (CRLF + espaço/tab)
  return raw.replace(/\r?\n[ \t]/g, '');
}

function unescape(s: string): string {
  return s
    .replaceAll('\\n', '\n')
    .replaceAll('\\,', ',')
    .replaceAll('\\;', ';')
    .replaceAll('\\\\', '\\');
}

function parseDate(val: string): string {
  // aceita YYYYMMDD, YYYYMMDDTHHMMSSZ
  const clean = val.replace(/[TZ].*$/, '');
  if (clean.length < 8) return '';
  return `${clean.slice(0, 4)}-${clean.slice(4, 6)}-${clean.slice(6, 8)}`;
}

export function parseIcal(raw: string): IcalVevent[] {
  const text = unfold(raw);
  const lines = text.split(/\r?\n/);
  const events: IcalVevent[] = [];
  let current: Partial<IcalVevent> | null = null;

  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      current = {};
      continue;
    }
    if (line === 'END:VEVENT') {
      if (current?.uid && current.dtstart && current.dtend) {
        events.push(current as IcalVevent);
      }
      current = null;
      continue;
    }
    if (!current) continue;

    const colonIdx = line.indexOf(':');
    if (colonIdx < 0) continue;
    const rawKey = line.slice(0, colonIdx); // pode ter params (ex DTSTART;VALUE=DATE)
    const value = line.slice(colonIdx + 1);
    const key = rawKey.split(';')[0].toUpperCase();

    switch (key) {
      case 'UID':
        current.uid = value.trim();
        break;
      case 'DTSTART':
        current.dtstart = parseDate(value.trim());
        break;
      case 'DTEND':
        current.dtend = parseDate(value.trim());
        break;
      case 'SUMMARY':
        current.summary = unescape(value.trim());
        break;
      case 'DESCRIPTION':
        current.description = unescape(value.trim());
        break;
    }
  }
  return events;
}
