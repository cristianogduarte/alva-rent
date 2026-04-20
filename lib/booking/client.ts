/**
 * Cliente Booking.com Connectivity API — v1 STUB.
 *
 * Quando a ALVA tiver aprovação Connectivity, substituir as funções abaixo
 * por chamadas XML reais a supply-xml.booking.com. Interface permanece estável.
 *
 * Docs reais: https://developers.booking.com/connectivity/docs
 * Endpoints: bookings, availability, rates (XML sobre HTTPS + basic auth).
 */

export type BookingSyncResult<T = unknown> =
  | { ok: true; data: T; modo: 'real' | 'stub' }
  | { ok: false; error: string };

export interface BookingCreds {
  hotel_id: string;
  username: string | null;
  password: string | null;   // resolvida da env var em tempo de chamada
  base_url: string;
}

function isEnabled(creds: BookingCreds | null): boolean {
  return (
    process.env.BOOKING_CONNECTIVITY_ENABLED === 'true' &&
    !!creds?.hotel_id &&
    !!creds?.username &&
    !!creds?.password
  );
}

/** Pull de novas reservas (últimas 24h). v1: stub vazio. */
export async function pullReservasRecentes(
  creds: BookingCreds | null,
): Promise<BookingSyncResult<{ novas: number }>> {
  if (!isEnabled(creds)) {
    return { ok: true, data: { novas: 0 }, modo: 'stub' };
  }
  // TODO: implementar XML POST para getReservations quando Connectivity entrar
  return { ok: false, error: 'Endpoint real ainda não implementado' };
}

/** Envia calendário de disponibilidade (próximos 180 dias) para um room_id. */
export async function pushDisponibilidade(
  creds: BookingCreds | null,
  _roomId: string,
  _bloqueios: Array<{ data: string; disponivel: boolean }>,
): Promise<BookingSyncResult<{ enviados: number }>> {
  if (!isEnabled(creds)) {
    return { ok: true, data: { enviados: 0 }, modo: 'stub' };
  }
  return { ok: false, error: 'Endpoint real ainda não implementado' };
}

/** Teste de conexão — usado pelo botão "Testar" na tela de configuração. */
export async function testarConexao(
  creds: BookingCreds | null,
): Promise<BookingSyncResult<{ hotel: string }>> {
  if (!creds?.hotel_id) return { ok: false, error: 'hotel_id não configurado' };
  if (!isEnabled(creds)) {
    return {
      ok: true,
      data: { hotel: creds.hotel_id },
      modo: 'stub',
    };
  }
  return { ok: false, error: 'Endpoint real ainda não implementado' };
}
