import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { brl, formatDate } from '@/lib/utils';
import { CopyButton } from './copy-button';

export const metadata = { title: 'Boleto' };
export const dynamic = 'force-dynamic';

export default async function BoletoDetalhePage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirect=/portal/boletos/${params.id}`);

  const { data: boletoRaw } = await supabase
    .from('boletos')
    .select(`
      id, competencia, data_vencimento, valor_total, status,
      linha_digitavel, pix_copia_cola, pdf_url,
      contrato:contratos!inner (id, codigo, inquilino_id, imovel:imoveis(endereco, numero, bairro, cidade, uf))
    `)
    .eq('id', params.id)
    .maybeSingle();

  if (!boletoRaw) notFound();

  // Supabase tipa joins 1:1 como array — flatten manual
  const contratoRaw = Array.isArray(boletoRaw.contrato) ? boletoRaw.contrato[0] : boletoRaw.contrato;
  const imovelRaw = contratoRaw
    ? Array.isArray(contratoRaw.imovel) ? contratoRaw.imovel[0] : contratoRaw.imovel
    : null;
  const boleto = {
    ...boletoRaw,
    contrato: contratoRaw ? { ...contratoRaw, imovel: imovelRaw } : null,
  };

  return (
    <div className="min-h-screen bg-navy-50 pb-10">
      <header className="bg-navy-900 text-white px-5 pt-6 pb-5">
        <Link href="/portal/boletos" className="text-xs opacity-70 hover:opacity-100">
          ← Meus boletos
        </Link>
        <div className="text-[10px] uppercase opacity-60 mt-2 font-semibold tracking-wider">
          {boleto.competencia}
        </div>
        <div className="text-3xl font-bold mt-1">{brl(boleto.valor_total)}</div>
        <div className="text-xs opacity-80 mt-1">
          Vencimento: {formatDate(boleto.data_vencimento)} · Status: {boleto.status}
        </div>
      </header>

      <div className="px-5 py-4 space-y-3">
        {boleto.pdf_url && (
          <a
            href={boleto.pdf_url}
            target="_blank"
            rel="noopener noreferrer"
            className="block bg-gold-500 text-navy-900 py-3 rounded-xl font-semibold text-center hover:bg-gold-400 transition"
          >
            📄 Baixar PDF do boleto
          </a>
        )}

        {boleto.pix_copia_cola && (
          <div className="bg-white rounded-xl p-4 border border-navy-100">
            <div className="text-xs font-semibold uppercase text-ink-500 tracking-wider mb-2">
              PIX copia e cola
            </div>
            <div className="bg-navy-50 rounded-lg p-3 font-mono text-[11px] break-all">
              {boleto.pix_copia_cola}
            </div>
            <CopyButton text={boleto.pix_copia_cola} label="Copiar PIX" />
          </div>
        )}

        {boleto.linha_digitavel && (
          <div className="bg-white rounded-xl p-4 border border-navy-100">
            <div className="text-xs font-semibold uppercase text-ink-500 tracking-wider mb-2">
              Linha digitável
            </div>
            <div className="bg-navy-50 rounded-lg p-3 font-mono text-[11px] break-all">
              {boleto.linha_digitavel}
            </div>
            <CopyButton text={boleto.linha_digitavel} label="Copiar linha digitável" />
          </div>
        )}

        <div className="bg-white rounded-xl p-4 border border-navy-100 text-xs text-ink-500">
          Contrato <span className="font-semibold text-navy-900">{boleto.contrato?.codigo}</span>
          {boleto.contrato?.imovel && (
            <div className="mt-1">
              {boleto.contrato.imovel.endereco}
              {boleto.contrato.imovel.numero ? `, ${boleto.contrato.imovel.numero}` : ''}
              {' · '}
              {boleto.contrato.imovel.bairro}, {boleto.contrato.imovel.cidade}/{boleto.contrato.imovel.uf}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

