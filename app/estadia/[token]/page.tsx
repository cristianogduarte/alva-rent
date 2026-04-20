import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { brl, formatDate } from '@/lib/utils';

export const metadata = { title: 'Sua estadia — ALVA Rent' };
export const dynamic = 'force-dynamic';

export default async function EstadiaPage({ params }: { params: { token: string } }) {
  const supabase = createAdminClient();

  const { data: e } = await supabase
    .from('estadas')
    .select(`
      id, codigo, data_checkin, data_checkout, valor_total, canal, status,
      imovel:imoveis (
        id, codigo, endereco, numero, bairro, cidade, uf, checkin_time, checkout_time,
        hospedagem:imovel_hospedagem (
          wifi_ssid, wifi_senha, codigo_fechadura, instrucoes_acesso,
          regras_casa, manual_url, contatos_emergencia
        )
      ),
      hospede:hospedes (nome, email, telefone)
    `)
    .eq('token_publico', params.token)
    .maybeSingle();

  if (!e) notFound();

  const im: any = Array.isArray(e.imovel) ? e.imovel[0] : e.imovel;
  const hos: any = im && (Array.isArray(im.hospedagem) ? im.hospedagem[0] : im.hospedagem);
  const h: any = Array.isArray(e.hospede) ? e.hospede[0] : e.hospede;

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const checkin = new Date(e.data_checkin);
  const checkout = new Date(e.data_checkout);
  const emEstadia = hoje >= checkin && hoje < checkout;
  const futura = hoje < checkin;
  const passada = hoje >= checkout;
  const diasAte = Math.round((checkin.getTime() - hoje.getTime()) / 86400000);

  const waMsg = encodeURIComponent(
    `Olá! Sou ${h?.nome ?? 'hóspede'} da reserva ${e.codigo} (${im?.codigo}). Preciso de ajuda.`,
  );
  // Número WhatsApp oficial ALVA (configurável via env)
  const waNumero = process.env.NEXT_PUBLIC_ALVA_WHATSAPP ?? '5521000000000';

  return (
    <div className="min-h-dvh bg-navy-50">
      {/* Header */}
      <header className="bg-navy-900 text-white px-5 py-5">
        <div className="max-w-lg mx-auto">
          <div className="text-xs uppercase opacity-70">ALVA Rent</div>
          <h1 className="text-xl font-bold mt-1">Olá, {h?.nome?.split(' ')[0] ?? 'hóspede'}!</h1>
          <p className="text-sm opacity-80 mt-1">
            {futura && diasAte > 0 && `Sua estadia começa em ${diasAte} ${diasAte === 1 ? 'dia' : 'dias'}.`}
            {futura && diasAte === 0 && 'Sua estadia começa hoje! 🎉'}
            {emEstadia && 'Você está hospedado agora.'}
            {passada && 'Esperamos que tenha curtido! 💙'}
          </p>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-5 py-6 space-y-4">
        {/* Info da reserva */}
        <div className="bg-white rounded-xl p-5 shadow-soft">
          <div className="text-xs uppercase text-ink-400 font-semibold">Sua reserva</div>
          <div className="text-sm font-mono text-ink-500">{e.codigo}</div>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <div className="text-[10px] uppercase text-ink-400">Check-in</div>
              <div className="text-sm font-bold">{formatDate(e.data_checkin)}</div>
              <div className="text-xs text-ink-500">a partir das {im?.checkin_time?.slice(0,5) ?? '15:00'}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase text-ink-400">Check-out</div>
              <div className="text-sm font-bold">{formatDate(e.data_checkout)}</div>
              <div className="text-xs text-ink-500">até as {im?.checkout_time?.slice(0,5) ?? '11:00'}</div>
            </div>
          </div>
        </div>

        {/* Endereço + maps */}
        <div className="bg-white rounded-xl p-5 shadow-soft">
          <div className="text-xs uppercase text-ink-400 font-semibold">📍 Endereço</div>
          <div className="text-sm font-medium mt-1">
            {im?.endereco}, {im?.numero}
          </div>
          <div className="text-xs text-ink-500">
            {im?.bairro} · {im?.cidade}/{im?.uf}
          </div>
          <a
            href={`https://www.google.com/maps/search/${encodeURIComponent(`${im?.endereco}, ${im?.numero}, ${im?.bairro}, ${im?.cidade}, ${im?.uf}`)}`}
            target="_blank"
            rel="noopener"
            className="inline-block mt-3 text-xs text-navy-900 hover:underline font-medium"
          >
            Abrir no Google Maps →
          </a>
        </div>

        {/* Acesso — só mostra se já estiver perto/durante */}
        {(emEstadia || (futura && diasAte <= 2)) && (hos?.codigo_fechadura || hos?.instrucoes_acesso) && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5">
            <div className="text-xs uppercase text-emerald-700 font-semibold">🔐 Acesso</div>
            {hos?.codigo_fechadura && (
              <div className="mt-2">
                <div className="text-[10px] text-emerald-700">Código da fechadura</div>
                <div className="text-2xl font-bold font-mono">{hos.codigo_fechadura}</div>
              </div>
            )}
            {hos?.instrucoes_acesso && (
              <p className="text-xs mt-3 whitespace-pre-line text-emerald-900">
                {hos.instrucoes_acesso}
              </p>
            )}
          </div>
        )}

        {/* Wifi — só durante estadia */}
        {emEstadia && hos?.wifi_ssid && (
          <div className="bg-white rounded-xl p-5 shadow-soft">
            <div className="text-xs uppercase text-ink-400 font-semibold">📶 Wi-Fi</div>
            <div className="mt-2 space-y-1">
              <div>
                <div className="text-[10px] text-ink-500">Rede</div>
                <div className="font-mono text-sm font-bold">{hos.wifi_ssid}</div>
              </div>
              {hos.wifi_senha && (
                <div>
                  <div className="text-[10px] text-ink-500">Senha</div>
                  <div className="font-mono text-sm font-bold">{hos.wifi_senha}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Regras */}
        {hos?.regras_casa && (
          <div className="bg-white rounded-xl p-5 shadow-soft">
            <div className="text-xs uppercase text-ink-400 font-semibold">📋 Regras da casa</div>
            <p className="text-xs text-ink-600 mt-2 whitespace-pre-line">{hos.regras_casa}</p>
          </div>
        )}

        {/* Manual */}
        {hos?.manual_url && (
          <a
            href={hos.manual_url}
            target="_blank"
            rel="noopener"
            className="block bg-white rounded-xl p-5 shadow-soft hover:shadow-md transition"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase text-ink-400 font-semibold">📘 Manual do imóvel</div>
                <div className="text-sm text-ink-600 mt-1">Como usar ar-condicionado, TV, cozinha, etc.</div>
              </div>
              <span className="text-navy-900">→</span>
            </div>
          </a>
        )}

        {/* Contatos emergência */}
        {hos?.contatos_emergencia && Array.isArray(hos.contatos_emergencia) && hos.contatos_emergencia.length > 0 && (
          <div className="bg-white rounded-xl p-5 shadow-soft">
            <div className="text-xs uppercase text-ink-400 font-semibold">🚨 Emergência</div>
            <ul className="text-sm mt-2 space-y-1">
              {hos.contatos_emergencia.map((c: any, i: number) => (
                <li key={i} className="flex justify-between">
                  <span>{c.nome ?? c.label}</span>
                  <a href={`tel:${c.telefone}`} className="text-navy-900 font-medium">{c.telefone}</a>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Valor */}
        <div className="bg-white rounded-xl p-5 shadow-soft">
          <div className="flex justify-between items-center">
            <div className="text-xs uppercase text-ink-400 font-semibold">Valor total</div>
            <div className="text-lg font-bold text-navy-900">{brl(Number(e.valor_total ?? 0))}</div>
          </div>
        </div>
      </main>

      {/* Botão ajuda fixo */}
      <a
        href={`https://wa.me/${waNumero.replace(/\D/g, '')}?text=${waMsg}`}
        target="_blank"
        rel="noopener"
        className="fixed bottom-5 right-5 bg-emerald-600 text-white px-4 py-3 rounded-full shadow-lg flex items-center gap-2 active:scale-95 transition"
      >
        <span className="text-lg">💬</span>
        <span className="text-sm font-bold">Preciso de ajuda</span>
      </a>
      <div className="h-20" /> {/* spacer pro botão */}
    </div>
  );
}
