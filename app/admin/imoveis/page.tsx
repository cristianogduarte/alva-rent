import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { brl } from '@/lib/utils';
import { DeleteButton } from './delete-button';

export const metadata = { title: 'Imóveis' };
export const dynamic = 'force-dynamic';

const statusTone: Record<string, string> = {
  alugado: 'bg-emerald-50 text-emerald-700',
  vago: 'bg-amber-50 text-amber-700',
  manutencao: 'bg-sky-50 text-sky-700',
  vendido: 'bg-ink-100 text-ink-600',
};

export default async function ImoveisPage() {
  const supabase = createClient();
  const { data: imoveis, error } = await supabase
    .from('imoveis')
    .select('id, codigo, tipo, endereco, numero, bairro, cidade, uf, cond_mensal, status')
    .order('codigo', { ascending: true });

  return (
    <div className="px-8 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-xs uppercase tracking-wider text-ink-400 font-semibold">
            Cadastros
          </div>
          <h1 className="text-2xl font-bold text-navy-900">Imóveis</h1>
          <p className="text-sm text-ink-500">
            {imoveis?.length ?? 0} imóveis na carteira
          </p>
        </div>
        <Link href="/admin/imoveis/novo">
          <Button>+ Novo imóvel</Button>
        </Link>
      </div>

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
              <th className="text-left px-4 py-3 font-semibold">Tipo</th>
              <th className="text-left px-4 py-3 font-semibold">Endereço</th>
              <th className="text-left px-4 py-3 font-semibold">Cidade/UF</th>
              <th className="text-right px-4 py-3 font-semibold">Condomínio</th>
              <th className="text-center px-4 py-3 font-semibold">Status</th>
              <th className="text-right px-4 py-3 font-semibold">Ações</th>
            </tr>
          </thead>
          <tbody>
            {(!imoveis || imoveis.length === 0) && (
              <tr>
                <td colSpan={7} className="text-center text-ink-500 py-10">
                  Nenhum imóvel cadastrado.{' '}
                  <Link href="/admin/imoveis/novo" className="text-navy-900 underline">
                    Cadastre o primeiro
                  </Link>
                  .
                </td>
              </tr>
            )}
            {imoveis?.map((im) => (
              <tr key={im.id} className="border-t border-navy-50 hover:bg-navy-50/40">
                <td className="px-4 py-3 font-mono text-xs text-navy-900">{im.codigo}</td>
                <td className="px-4 py-3 capitalize">{im.tipo}</td>
                <td className="px-4 py-3">
                  {im.endereco}{im.numero ? `, ${im.numero}` : ''}
                  {im.bairro && <div className="text-xs text-ink-500">{im.bairro}</div>}
                </td>
                <td className="px-4 py-3">{im.cidade}/{im.uf}</td>
                <td className="px-4 py-3 text-right">{brl(Number(im.cond_mensal))}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`text-xs px-2 py-1 rounded-full capitalize ${statusTone[im.status] ?? ''}`}>
                    {im.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                  <Link
                    href={`/admin/imoveis/${im.id}/editar`}
                    className="text-xs text-navy-900 hover:underline"
                  >
                    Editar
                  </Link>
                  <DeleteButton id={im.id} codigo={im.codigo} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
