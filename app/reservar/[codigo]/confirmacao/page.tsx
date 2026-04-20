import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { brl, formatDate } from '@/lib/utils';

export const metadata = { title: 'Reserva confirmada — ALVA Rent' };
export const dynamic = 'force-dynamic';

export default async function ConfirmacaoPage({
  params,
  searchParams,
}: {
  params: { codigo: string };
  searchParams: { pag?: string };
}) {
  if (!searchParams.pag) notFound();

  const supabase = createAdminClient();
  const { data: pagto } = await supabase
    .from('estada_pagamentos')
    .select(`
      id, valor, status, forma, inter_cobranca_id,
      estada:estadas (id, codigo, data_checkin, data_checkout, valor_total, status,
        hospede:hospedes (nome, email, telefone),
        imovel:imoveis (codigo, endereco, numero, bairro, cidade, uf)
      )
    `)
    .eq('id', searchParams.pag)
    .maybeSingle();

  if (!pagto) notFound();

  const est: any = Array.isArray(pagto.estada) ? pagto.estada[0] : pagto.estada;
  const h: any = Array.isArray(est?.hospede) ? est.hospede[0] : est?.hospede;
  const im: any = Array.isArray(est?.imovel) ? est.imovel[0] : est?.imovel;
  const pago = pagto.status === 'pago';

  return (
    <div className="min-h-dvh bg-navy-50 px-5 py-8">
      <div className="max-w-lg mx-auto">
        <div className="bg-white rounded-xl p-6 shadow-soft text-center mb-5">
          {pago ? (
            <>
              <div className="text-5xl mb-3">✅</div>
              <h1 className="text-xl font-bold text-emerald-900">Reserva confirmada!</h1>
              <p className="text-sm text-ink-500 mt-1">
                Pagamento recebido. Enviamos os detalhes por email.
              </p>
            </>
          ) : (
            <>
              <div className="text-5xl mb-3">⏳</div>
              <h1 className="text-xl font-bold text-navy-900">Reserva em processamento</h1>
              <p className="text-sm text-ink-500 mt-1">
                {pagto.inter_cobranca_id
                  ? 'Pague o PIX abaixo para confirmar sua reserva.'
                  : 'Em breve enviaremos o PIX por email. Reserva pré-registrada.'}
              </p>
            </>
          )}
        </div>

        <div className="bg-white rounded-xl p-5 shadow-soft space-y-3">
          <div>
            <div className="text-xs uppercase text-ink-400 font-semibold">Reserva</div>
            <div className="text-sm font-mono">{est?.codigo}</div>
          </div>
          <hr className="border-navy-100" />
          <div>
            <div className="text-xs uppercase text-ink-400 font-semibold">Imóvel</div>
            <div className="text-sm font-medium">{im?.endereco}, {im?.numero}</div>
            <div className="text-xs text-ink-500">{im?.bairro} · {im?.cidade}/{im?.uf}</div>
          </div>
          <div>
            <div className="text-xs uppercase text-ink-400 font-semibold">Período</div>
            <div className="text-sm">
              {formatDate(est?.data_checkin)} → {formatDate(est?.data_checkout)}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase text-ink-400 font-semibold">Hóspede</div>
            <div className="text-sm">{h?.nome}</div>
            <div className="text-xs text-ink-500">{h?.email}</div>
          </div>
          <hr className="border-navy-100" />
          <div className="flex justify-between items-center">
            <div className="text-sm font-semibold">Valor total</div>
            <div className="text-lg font-bold text-navy-900">{brl(Number(est?.valor_total ?? pagto.valor))}</div>
          </div>
          {!pago && pagto.inter_cobranca_id && (
            <div className="bg-navy-50 rounded-lg p-3 text-center">
              <div className="text-xs text-ink-500 mb-1">Código da cobrança</div>
              <div className="font-mono text-xs">{pagto.inter_cobranca_id}</div>
              <p className="text-xs text-ink-500 mt-2">
                Abra o app do seu banco, vá em <strong>PIX → Copia e Cola</strong> ou <strong>QR Code</strong>.
                O link completo foi enviado pro seu email.
              </p>
            </div>
          )}
        </div>

        <div className="text-center mt-5">
          <Link href={`/reservar/${params.codigo}`} className="text-xs text-ink-500 hover:underline">
            ← Voltar
          </Link>
        </div>
      </div>
    </div>
  );
}
