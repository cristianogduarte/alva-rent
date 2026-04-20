import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PrintButton } from '@/app/admin/relatorios/print-button';

export const metadata = { title: 'Cartão do hóspede' };
export const dynamic = 'force-dynamic';

const WHATSAPP_ALVA = '5521000000000'; // TODO: mover para configurações

function wifiQrPayload(ssid: string | null, senha: string | null) {
  if (!ssid) return '';
  const esc = (s: string) => s.replace(/([\\;,:"])/g, '\\$1');
  return `WIFI:T:WPA;S:${esc(ssid)};P:${senha ? esc(senha) : ''};;`;
}

function qrImgUrl(data: string, size = 260) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}&margin=0`;
}

export default async function CartaoHospede({ params }: { params: { imovelId: string } }) {
  const supabase = createClient();

  const { data: imovel } = await supabase
    .from('imoveis')
    .select('id, codigo, endereco, numero, bairro, cidade, uf, checkin_time, checkout_time, capacidade_hospedes')
    .eq('id', params.imovelId)
    .single();

  if (!imovel) notFound();

  const { data: h } = await supabase
    .from('imovel_hospedagem')
    .select('*')
    .eq('imovel_id', params.imovelId)
    .maybeSingle();

  const wifiQr = wifiQrPayload(h?.wifi_ssid ?? null, h?.wifi_senha ?? null);
  const waMsg = `Olá! Estou na unidade ${imovel.codigo}.`;
  const waLink = `https://wa.me/${WHATSAPP_ALVA}?text=${encodeURIComponent(waMsg)}`;

  const lembretes: string[] = Array.isArray(h?.checkout_lembretes) && h.checkout_lembretes.length > 0
    ? h.checkout_lembretes
    : ['Louça lavada', 'Lixo no hall', 'Ar e luzes desligados', 'Chaves em cima da mesa'];

  const regras: string[] = [];
  if (h?.permite_fumar === false || h?.permite_fumar == null) regras.push('🚭 Não fumar');
  if (h?.permite_festa === false || h?.permite_festa == null) regras.push('🎉 Sem festas');
  if (h?.aceita_pets) regras.push('🐾 Pets permitidos');
  else regras.push('🐾 Sem pets');
  if (h?.horario_silencio_inicio) {
    regras.push(`🔇 Silêncio ${String(h.horario_silencio_inicio).slice(0, 5)}–${String(h.horario_silencio_fim ?? '08:00').slice(0, 5)}`);
  }

  return (
    <>
      {/* Toolbar (não imprime) */}
      <div className="print:hidden px-8 py-4 bg-white border-b border-navy-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/admin/hospedagem/${imovel.id}`} className="text-sm text-navy-700 hover:underline">← voltar</Link>
          <span className="text-sm text-ink-500">Cartão do hóspede — {imovel.codigo}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-ink-400">A4 · paisagem · bordas finas</span>
          <PrintButton label="imprimir" />
        </div>
      </div>

      {/* Documento A4 paisagem */}
      <div className="bg-navy-50 py-6 print:bg-white print:py-0">
        <div className="mx-auto bg-white print:shadow-none shadow-lg" style={{ width: '297mm', minHeight: '210mm' }}>
          <div className="p-10 h-full flex flex-col">
            {/* Cabeçalho */}
            <header className="flex items-start justify-between pb-6 border-b-2 border-navy-900">
              <div className="flex items-center gap-4">
                <Image src="/brand/alva-mark.png" alt="ALVA" width={64} height={64} className="rounded-lg" />
                <div>
                  <div className="text-[11px] uppercase tracking-[0.2em] text-ink-400 font-semibold">Bem-vindo · ALVA Rent</div>
                  <h1 className="text-3xl font-bold text-navy-900 leading-tight">{imovel.codigo}</h1>
                  <p className="text-sm text-ink-600 mt-0.5">
                    {imovel.endereco}{imovel.numero ? `, ${imovel.numero}` : ''} · {imovel.bairro}, {imovel.cidade}/{imovel.uf}
                  </p>
                </div>
              </div>
              <div className="text-right text-xs text-ink-500">
                <div>Check-in a partir das <strong>{String(imovel.checkin_time ?? '15:00').slice(0, 5)}</strong></div>
                <div>Check-out até as <strong>{String(imovel.checkout_time ?? '11:00').slice(0, 5)}</strong></div>
                <div>Capacidade: <strong>{imovel.capacidade_hospedes ?? '—'}</strong> hóspedes</div>
              </div>
            </header>

            {/* Corpo — 3 colunas */}
            <div className="grid grid-cols-3 gap-8 py-6 flex-1">
              {/* COL 1 — Wi-Fi */}
              <section className="flex flex-col">
                <div className="text-xs uppercase tracking-[0.2em] text-emerald-700 font-bold mb-3">🌐 Wi-Fi</div>
                {h?.wifi_ssid ? (
                  <>
                    <div className="text-xs text-ink-500">Rede</div>
                    <div className="text-xl font-bold text-navy-900 leading-tight mb-2">{h.wifi_ssid}</div>
                    <div className="text-xs text-ink-500">Senha</div>
                    <div className="text-xl font-mono font-bold text-navy-900 mb-4 break-all">{h.wifi_senha ?? '—'}</div>
                    <div className="bg-navy-50/50 rounded-lg p-3 flex flex-col items-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={qrImgUrl(wifiQr, 200)} alt="QR do Wi-Fi" width={200} height={200} />
                      <div className="text-[10px] text-ink-500 mt-2">Aponte a câmera e conecte automaticamente</div>
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-ink-400 italic">Wi-Fi não configurado</div>
                )}
              </section>

              {/* COL 2 — WhatsApp ALVA */}
              <section className="flex flex-col items-center text-center">
                <div className="text-xs uppercase tracking-[0.2em] text-emerald-700 font-bold mb-3 self-start">💬 Precisa de ajuda?</div>
                <p className="text-sm text-ink-700 mb-3">
                  Nossa equipe está no WhatsApp <strong className="text-navy-900">24 horas por dia</strong>.
                  Resposta em segundos. Dúvidas sobre equipamentos, dicas da região, emergências.
                </p>
                <div className="bg-emerald-50 border-2 border-emerald-600 rounded-xl p-4 w-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrImgUrl(waLink, 220)} alt="QR WhatsApp ALVA" width={220} height={220} className="mx-auto" />
                  <div className="text-xs text-emerald-900 font-semibold mt-2">Aponte a câmera</div>
                  <div className="text-[10px] text-emerald-900/80 mt-0.5">ou envie mensagem para</div>
                  <div className="text-sm font-bold text-emerald-900">+55 (21) 00000-0000</div>
                </div>
              </section>

              {/* COL 3 — Regras + Checkout */}
              <section className="flex flex-col">
                <div className="text-xs uppercase tracking-[0.2em] text-emerald-700 font-bold mb-3">📏 Regras da casa</div>
                <ul className="space-y-1.5 text-sm text-ink-800 mb-6">
                  {regras.map((r, i) => <li key={i}>{r}</li>)}
                </ul>

                <div className="text-xs uppercase tracking-[0.2em] text-emerald-700 font-bold mb-3">🚪 Antes de sair</div>
                <ul className="space-y-1 text-sm text-ink-800">
                  {lembretes.map((l, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-ink-400">☐</span>
                      <span>{l}</span>
                    </li>
                  ))}
                </ul>
              </section>
            </div>

            {/* Rodapé */}
            <footer className="border-t border-navy-100 pt-4 flex items-center justify-between text-[10px] text-ink-500">
              <div className="flex items-center gap-2">
                <Image src="/brand/alva-mark.png" alt="" width={20} height={20} className="rounded" />
                <span>Administrado por <strong className="text-navy-700">ALVA Rent</strong> · ALVA ONE</span>
              </div>
              <div>alvarent.com.br · Esta unidade é gerenciada profissionalmente</div>
            </footer>
          </div>
        </div>
      </div>

      {/* Print CSS */}
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 0; }
          body { background: white !important; }
        }
      `}</style>
    </>
  );
}
