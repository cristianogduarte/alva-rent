import { createClient } from '@/lib/supabase/server';
import { BookingClient } from './client';

export const metadata = { title: 'Booking Connectivity · ALVA Rent' };
export const dynamic = 'force-dynamic';

export default async function BookingPage() {
  const supabase = createClient();

  const [{ data: cred }, { data: imoveis }, { data: mapeamentos }, { data: logs }] = await Promise.all([
    supabase.from('booking_credentials').select('*').limit(1).maybeSingle(),
    supabase
      .from('imoveis')
      .select('id, codigo, endereco')
      .eq('modalidade', 'short_stay')
      .order('codigo'),
    supabase
      .from('booking_room_mapping')
      .select('*, imovel:imoveis(codigo, endereco)')
      .order('created_at', { ascending: false }),
    supabase
      .from('booking_sync_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  const senhaResolvida = cred?.password_secret_ref
    ? !!process.env[cred.password_secret_ref]
    : false;

  return (
    <div className="px-8 py-6 max-w-6xl">
      <div className="mb-6">
        <div className="text-xs uppercase tracking-wider text-ink-400 font-semibold">Integrações</div>
        <h1 className="text-2xl font-bold text-navy-900">Booking Connectivity</h1>
        <p className="text-sm text-ink-500 mt-1">
          API oficial da Booking.com para pull de reservas e push de disponibilidade.
          Requer aprovação da Booking (processo de certificação). Enquanto não estiver ativo,
          o sistema roda em <strong>modo stub</strong> — grava configuração mas não chama a API.
        </p>
      </div>

      <BookingClient
        credenciais={cred ?? null}
        senhaConfigurada={senhaResolvida}
        imoveis={imoveis ?? []}
        mapeamentos={(mapeamentos ?? []) as any}
        logs={logs ?? []}
      />
    </div>
  );
}
