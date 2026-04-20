import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { brl, formatDate } from '@/lib/utils';

export const metadata = { title: 'Estadas — Short Stay' };
export const dynamic = 'force-dynamic';

const statusTone: Record<string, string> = {
  pre_reservada: 'bg-amber-50 text-amber-700',
  confirmada: 'bg-emerald-50 text-emerald-700',
  checkin: 'bg-sky-50 text-sky-700',
  checkout: 'bg-indigo-50 text-indigo-700',
  cancelada: 'bg-rose-50 text-rose-700',
};

const canalTone: Record<string, string> = {
  airbnb: 'bg-rose-50 text-rose-700',
  booking: 'bg-sky-50 text-sky-700',
  direto: 'bg-emerald-50 text-emerald-700',
  outro: 'bg-ink-100 text-ink-600',
};

export default async function EstadasPage({
  searchParams,
}: {
  searchParams: { canal?: string; status?: string; mes?: string };
}) {
  const supabase = createClient();
  let q = supabase
    .from('estadas')
    .select(`
      id, codigo, data_checkin, data_checkout, numero_hospedes,
      valor_total, canal, status,
      imovel:imoveis (codigo, endereco, bairro, cidade),
      hospede:hospedes (nome)
    `)
    .order('data_checkin', { ascending: false });

  if (searchParams.canal) q = q.eq('canal', searchParams.canal);
  if (searchParams.status) q = q.eq('status', searchParams.status);
  if (searchParams.mes) {
    const ini = `${searchParams.mes}-01`;
    const [y, m] = searchParams.mes.split('-').map(Number);
    const fim = new Date(y, m, 1).toISOString().slice(0, 10);
    q = q.gte('data_checkin', ini).lt('data_checkin', fim);
  }

  const { data: estadas, error } = await q;

  return (
    <div className="px-8 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-xs uppercase tracking-wider text-ink-400 font-semibold">Short Stay</div>
          <h1 className="text-2xl font-bold text-navy-900">Estadas</h1>
          <p className="text-sm text-ink-500">{estadas?.length ?? 0} reservas</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/estadas/calendario">
            <Button variant="outline">🗓️ Calendário</Button>
          </Link>
          <Link href="/admin/estadas/importar-email">
            <Button variant="outline">📧 Importar email</Button>
          </Link>
          <Link href="/admin/estadas/nova">
            <Button>+ Nova estada</Button>
          </Link>
        </div>
      </div>

      <form className="flex gap-3 mb-4 text-sm" method="GET">
        <select name="canal" defaultValue={searchParams.canal ?? ''} className="px-3 py-2 border border-navy-100 rounded-lg bg-white">
          <option value="">Todos os canais</option>
          <option value="airbnb">Airbnb</option>
          <option value="booking">Booking</option>
          <option value="direto">Direto</option>
          <option value="outro">Outro</option>
        </select>
        <select name="status" defaultValue={searchParams.status ?? ''} className="px-3 py-2 border border-navy-100 rounded-lg bg-white">
          <option value="">Todos status</option>
          <option value="pre_reservada">Pré-reservada</option>
          <option value="confirmada">Confirmada</option>
          <option value="checkin">Check-in</option>
          <option value="checkout">Check-out</option>
          <option value="cancelada">Cancelada</option>
        </select>
        <input type="month" name="mes" defaultValue={searchParams.mes ?? ''} className="px-3 py-2 border border-navy-100 rounded-lg bg-white" />
        <Button type="submit" variant="outline">Filtrar</Button>
        {(searchParams.canal || searchParams.status || searchParams.mes) && (
          <Link href="/admin/estadas" className="text-ink-500 hover:text-navy-900 self-center text-xs">limpar</Link>
        )}
      </form>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg p-3 mb-4">
          Erro ao carregar: {error.message}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-soft overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-navy-50 text-ink-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-3 font-semibold">Código</th>
              <th className="text-left px-4 py-3 font-semibold">Imóvel</th>
              <th className="text-left px-4 py-3 font-semibold">Hóspede</th>
              <th className="text-left px-4 py-3 font-semibold">Período</th>
              <th className="text-center px-4 py-3 font-semibold">Pax</th>
              <th className="text-right px-4 py-3 font-semibold">Total</th>
              <th className="text-center px-4 py-3 font-semibold">Canal</th>
              <th className="text-center px-4 py-3 font-semibold">Status</th>
              <th className="text-right px-4 py-3 font-semibold">Ações</th>
            </tr>
          </thead>
          <tbody>
            {(!estadas || estadas.length === 0) && (
              <tr>
                <td colSpan={9} className="text-center text-ink-500 py-10">
                  Nenhuma estada.{' '}
                  <Link href="/admin/estadas/nova" className="text-navy-900 underline">Criar primeira</Link>.
                </td>
              </tr>
            )}
            {estadas?.map((e: any) => (
              <tr key={e.id} className="border-t border-navy-50 hover:bg-navy-50/40">
                <td className="px-4 py-3 font-mono text-xs text-navy-900">{e.codigo}</td>
                <td className="px-4 py-3">
                  <div className="font-medium">{e.imovel?.codigo ?? '—'}</div>
                  <div className="text-xs text-ink-500">{e.imovel?.endereco}</div>
                </td>
                <td className="px-4 py-3">{e.hospede?.nome ?? <span className="text-ink-400 italic">sem nome</span>}</td>
                <td className="px-4 py-3 text-xs">
                  <div>{formatDate(e.data_checkin)}</div>
                  <div className="text-ink-500">→ {formatDate(e.data_checkout)}</div>
                </td>
                <td className="px-4 py-3 text-center">{e.numero_hospedes}</td>
                <td className="px-4 py-3 text-right tabular-nums">{brl(Number(e.valor_total ?? 0))}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`text-xs px-2 py-1 rounded-full capitalize ${canalTone[e.canal] ?? ''}`}>{e.canal}</span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`text-xs px-2 py-1 rounded-full capitalize ${statusTone[e.status] ?? ''}`}>
                    {e.status.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                  <Link href={`/admin/estadas/${e.id}`} className="text-xs text-navy-900 hover:underline">Abrir</Link>
                  <Link href={`/admin/estadas/${e.id}/editar`} className="text-xs text-navy-900 hover:underline">Editar</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
