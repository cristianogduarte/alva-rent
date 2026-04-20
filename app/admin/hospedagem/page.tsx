import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export const metadata = { title: 'Hospedagem — Short Stay' };
export const dynamic = 'force-dynamic';

export default async function HospedagemPage() {
  const supabase = createClient();
  const { data: imoveis } = await supabase
    .from('imoveis')
    .select('id, codigo, endereco, numero, bairro, cidade, uf, status, capacidade_hospedes, diaria_base')
    .eq('modalidade', 'short_stay')
    .order('codigo');

  return (
    <div className="px-8 py-6">
      <nav aria-label="Breadcrumb" className="text-xs text-ink-400 mb-2">
        <Link href="/admin/dashboard" className="hover:underline">Admin</Link>
        <span className="mx-1.5">/</span>
        <span className="text-ink-500">Hospedagem</span>
      </nav>

      <div className="mb-6">
        <div className="text-xs uppercase tracking-wider text-ink-400 font-semibold">Short Stay</div>
        <h1 className="text-2xl font-bold text-navy-900">Hospedagem — unidades de temporada</h1>
        <p className="text-sm text-ink-500">
          Ficha operacional das unidades: Wi-Fi, fechadura, regras, manual, contatos.
        </p>
      </div>

      {(!imoveis || imoveis.length === 0) ? (
        <div className="bg-white rounded-xl shadow-soft p-10 text-center">
          <div className="text-5xl mb-3">🏨</div>
          <h2 className="text-lg font-semibold text-navy-900 mb-1">Nenhuma unidade de temporada ainda</h2>
          <p className="text-sm text-ink-500 max-w-md mx-auto mb-4">
            Marque a modalidade <strong>Temporada (Airbnb/Booking)</strong> em um imóvel para ele aparecer aqui.
          </p>
          <Link href="/admin/imoveis" className="text-sm px-4 py-2 bg-navy-900 text-white rounded-md font-semibold inline-block">
            Ir para Imóveis
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-soft overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-navy-50/40 text-ink-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Código</th>
                <th className="text-left px-4 py-3 font-semibold">Endereço</th>
                <th className="text-right px-4 py-3 font-semibold">Capacidade</th>
                <th className="text-right px-4 py-3 font-semibold">Diária base</th>
                <th className="text-left px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3" aria-label="Ações" />
              </tr>
            </thead>
            <tbody>
              {imoveis.map((i: any) => (
                <tr key={i.id} className="border-t border-navy-50 hover:bg-navy-50/30">
                  <td className="px-4 py-3 font-semibold text-navy-900">
                    <Link href={`/admin/hospedagem/${i.id}`} className="hover:underline">{i.codigo}</Link>
                  </td>
                  <td className="px-4 py-3 text-ink-600">
                    {i.endereco}{i.numero ? `, ${i.numero}` : ''} · {i.bairro}, {i.cidade}/{i.uf}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{i.capacidade_hospedes ?? '—'}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {i.diaria_base ? `R$ ${Number(i.diaria_base).toFixed(2)}` : '—'}
                  </td>
                  <td className="px-4 py-3 capitalize">{i.status}</td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/admin/hospedagem/${i.id}`} className="text-xs text-navy-700 hover:underline font-semibold">
                      abrir ficha →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
