import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';
import { brl } from '@/lib/utils';
import { ReservarForm } from './client';

export const metadata = { title: 'Reservar — ALVA Rent' };
export const dynamic = 'force-dynamic';

export default async function ReservarPage({
  params,
}: {
  params: { codigo: string };
}) {
  const supabase = createAdminClient();

  const { data: imovel } = await supabase
    .from('imoveis')
    .select(`
      id, codigo, tipo, endereco, numero, bairro, cidade, uf,
      modalidade, diaria_base, capacidade_hospedes, checkin_time, checkout_time,
      hospedagem:imovel_hospedagem (regras_casa, observacoes_limpeza)
    `)
    .eq('codigo', params.codigo)
    .maybeSingle();

  if (!imovel || imovel.modalidade !== 'short_stay') notFound();

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const daqui120 = new Date(hoje);
  daqui120.setDate(daqui120.getDate() + 120);

  const { data: estadasBloq } = await supabase
    .from('estadas')
    .select('data_checkin, data_checkout')
    .eq('imovel_id', imovel.id)
    .neq('status', 'cancelada')
    .gte('data_checkout', hoje.toISOString().slice(0, 10))
    .lte('data_checkin', daqui120.toISOString().slice(0, 10));

  const bloqueadas: string[] = [];
  for (const e of estadasBloq ?? []) {
    const ini = new Date(e.data_checkin);
    const fim = new Date(e.data_checkout);
    for (const d = new Date(ini); d < fim; d.setDate(d.getDate() + 1)) {
      bloqueadas.push(d.toISOString().slice(0, 10));
    }
  }

  const hosp: any = Array.isArray(imovel.hospedagem) ? imovel.hospedagem[0] : imovel.hospedagem;

  return (
    <div className="min-h-dvh bg-navy-50">
      <header className="bg-white border-b border-navy-100 px-5 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-lg font-bold text-navy-900">ALVA Rent</Link>
          <Link href="/login" className="text-xs text-ink-500 hover:underline">Entrar</Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-5 py-8 grid md:grid-cols-5 gap-6">
        <section className="md:col-span-3 space-y-5">
          <div>
            <div className="text-xs uppercase text-ink-400 font-semibold">{imovel.tipo}</div>
            <h1 className="text-2xl md:text-3xl font-bold text-navy-900 mt-1">
              {imovel.endereco}, {imovel.numero}
            </h1>
            <p className="text-sm text-ink-500">
              {imovel.bairro} · {imovel.cidade}/{imovel.uf}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 text-sm">
            <Info label="Diária base" value={brl(Number(imovel.diaria_base ?? 0))} />
            <Info label="Hóspedes" value={`até ${imovel.capacidade_hospedes ?? '—'}`} />
            <Info label="Horário" value={`${imovel.checkin_time?.slice(0,5) ?? '15:00'} → ${imovel.checkout_time?.slice(0,5) ?? '11:00'}`} />
          </div>

          {hosp?.regras_casa && (
            <div className="bg-white rounded-xl p-4 shadow-soft">
              <div className="text-sm font-semibold mb-2">Regras da casa</div>
              <p className="text-xs text-ink-600 whitespace-pre-line">{hosp.regras_casa}</p>
            </div>
          )}

          <div className="bg-white rounded-xl p-4 shadow-soft">
            <div className="text-sm font-semibold mb-2">Garantia ALVA</div>
            <ul className="text-xs text-ink-600 space-y-1">
              <li>✓ Reserva direta sem taxas abusivas</li>
              <li>✓ Pagamento via PIX seguro (Banco Inter)</li>
              <li>✓ Confirmação imediata após pagamento</li>
              <li>✓ Atendimento por WhatsApp durante toda a estada</li>
            </ul>
          </div>
        </section>

        <aside className="md:col-span-2">
          <div className="bg-white rounded-xl p-5 shadow-soft sticky top-4">
            <div className="text-xs uppercase text-ink-400 font-semibold">Reservar</div>
            <div className="text-lg font-bold text-navy-900 mb-4">
              {brl(Number(imovel.diaria_base ?? 0))} <span className="text-xs font-normal text-ink-500">/ noite</span>
            </div>
            <ReservarForm
              imovelId={imovel.id}
              codigo={imovel.codigo}
              diariaBase={Number(imovel.diaria_base ?? 0)}
              capacidade={imovel.capacidade_hospedes ?? 2}
              bloqueadas={bloqueadas}
            />
          </div>
        </aside>
      </main>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl p-3 shadow-soft">
      <div className="text-[10px] uppercase text-ink-400 font-semibold">{label}</div>
      <div className="text-sm font-bold mt-1">{value}</div>
    </div>
  );
}
