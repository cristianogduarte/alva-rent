import { createClient } from '@/lib/supabase/server';
import { ImportarEmailClient } from './client';

export const metadata = { title: 'Importar reserva por email' };
export const dynamic = 'force-dynamic';

export default async function ImportarEmailPage() {
  const supabase = createClient();
  const { data: imoveis } = await supabase
    .from('imoveis')
    .select('id, codigo, endereco')
    .eq('modalidade', 'short_stay')
    .order('codigo');

  return (
    <div className="px-8 py-6 max-w-4xl">
      <div className="mb-6">
        <div className="text-xs uppercase tracking-wider text-ink-400 font-semibold">Short Stay</div>
        <h1 className="text-2xl font-bold text-navy-900">Importar reserva por email</h1>
        <p className="text-sm text-ink-500 max-w-2xl">
          Cole o corpo do email recebido do Airbnb ou Booking — o sistema extrai nome, datas e valor.
          Se a reserva já foi importada via iCal, os dados são vinculados à estada existente.
        </p>
      </div>

      <ImportarEmailClient imoveis={imoveis ?? []} />
    </div>
  );
}
