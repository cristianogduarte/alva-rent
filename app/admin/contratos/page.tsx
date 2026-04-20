import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { brl, formatDate } from '@/lib/utils';

export const metadata = { title: 'Contratos' };
export const dynamic = 'force-dynamic';

const statusTone: Record<string, string> = {
  ativo: 'bg-emerald-50 text-emerald-700',
  encerrado: 'bg-ink-100 text-ink-600',
  rescindido: 'bg-rose-50 text-rose-700',
  suspenso: 'bg-amber-50 text-amber-700',
};

export default async function ContratosPage() {
  const supabase = createClient();
  const { data: contratos, error } = await supabase
    .from('contratos')
    .select(`
      id, codigo, valor_aluguel, valor_condominio, dia_vencimento,
      data_inicio, data_fim, status,
      imovel:imoveis (codigo, endereco, bairro, cidade),
      inquilino:inquilinos (nome, cpf)
    `)
    .order('status', { ascending: true })
    .order('codigo', { ascending: true });

  return (
    <div className="px-8 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-xs uppercase tracking-wider text-ink-400 font-semibold">
            Cadastros
          </div>
          <h1 className="text-2xl font-bold text-navy-900">Contratos</h1>
          <p className="text-sm text-ink-500">
            {contratos?.length ?? 0} contratos na carteira
          </p>
        </div>
        <Link href="/admin/contratos/novo">
          <Button>+ Novo contrato</Button>
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
              <th className="text-left px-4 py-3 font-semibold">Imóvel</th>
              <th className="text-left px-4 py-3 font-semibold">Inquilino</th>
              <th className="text-right px-4 py-3 font-semibold">Aluguel</th>
              <th className="text-center px-4 py-3 font-semibold">Venc.</th>
              <th className="text-left px-4 py-3 font-semibold">Vigência</th>
              <th className="text-center px-4 py-3 font-semibold">Status</th>
              <th className="text-right px-4 py-3 font-semibold">Ações</th>
            </tr>
          </thead>
          <tbody>
            {(!contratos || contratos.length === 0) && (
              <tr>
                <td colSpan={8} className="text-center text-ink-500 py-10">
                  Nenhum contrato cadastrado.{' '}
                  <Link href="/admin/contratos/novo" className="text-navy-900 underline">
                    Crie o primeiro
                  </Link>.
                </td>
              </tr>
            )}
            {contratos?.map((c: any) => {
              const total = Number(c.valor_aluguel) + Number(c.valor_condominio ?? 0);
              return (
                <tr key={c.id} className="border-t border-navy-50 hover:bg-navy-50/40">
                  <td className="px-4 py-3 font-mono text-xs text-navy-900">{c.codigo}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{c.imovel?.codigo ?? '—'}</div>
                    <div className="text-xs text-ink-500">{c.imovel?.endereco}{c.imovel?.bairro ? ` · ${c.imovel.bairro}` : ''}</div>
                  </td>
                  <td className="px-4 py-3">{c.inquilino?.nome ?? '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <div>{brl(total)}</div>
                    <div className="text-xs text-ink-500">aluguel + cond.</div>
                  </td>
                  <td className="px-4 py-3 text-center">dia {c.dia_vencimento}</td>
                  <td className="px-4 py-3 text-xs">
                    <div>{formatDate(c.data_inicio)}</div>
                    <div className="text-ink-500">até {formatDate(c.data_fim)}</div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs px-2 py-1 rounded-full capitalize ${statusTone[c.status] ?? ''}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                    <Link href={`/admin/contratos/${c.id}`} className="text-xs text-navy-900 hover:underline">
                      Abrir
                    </Link>
                    <Link href={`/admin/contratos/${c.id}/editar`} className="text-xs text-navy-900 hover:underline">
                      Editar
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
