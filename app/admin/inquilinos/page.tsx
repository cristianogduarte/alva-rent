import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { formatCpf, brl } from '@/lib/utils';
import { DeleteButton } from './delete-button';

export const metadata = { title: 'Inquilinos' };
export const dynamic = 'force-dynamic';

export default async function InquilinosPage() {
  const supabase = createClient();
  const { data: inquilinos, error } = await supabase
    .from('inquilinos')
    .select('id, cpf, nome, email, telefone, profissao, renda, seguro_fianca')
    .order('nome', { ascending: true });

  return (
    <div className="px-8 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-xs uppercase tracking-wider text-ink-400 font-semibold">
            Cadastros
          </div>
          <h1 className="text-2xl font-bold text-navy-900">Inquilinos</h1>
          <p className="text-sm text-ink-500">
            {inquilinos?.length ?? 0} inquilinos cadastrados
          </p>
        </div>
        <Link href="/admin/inquilinos/novo">
          <Button>+ Novo inquilino</Button>
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
              <th className="text-left px-4 py-3 font-semibold">Nome</th>
              <th className="text-left px-4 py-3 font-semibold">CPF</th>
              <th className="text-left px-4 py-3 font-semibold">Contato</th>
              <th className="text-left px-4 py-3 font-semibold">Profissão</th>
              <th className="text-right px-4 py-3 font-semibold">Renda</th>
              <th className="text-center px-4 py-3 font-semibold">Garantia</th>
              <th className="text-right px-4 py-3 font-semibold">Ações</th>
            </tr>
          </thead>
          <tbody>
            {(!inquilinos || inquilinos.length === 0) && (
              <tr>
                <td colSpan={7} className="text-center text-ink-500 py-10">
                  Nenhum inquilino cadastrado.{' '}
                  <Link href="/admin/inquilinos/novo" className="text-navy-900 underline">
                    Cadastre o primeiro
                  </Link>.
                </td>
              </tr>
            )}
            {inquilinos?.map((i) => (
              <tr key={i.id} className="border-t border-navy-50 hover:bg-navy-50/40">
                <td className="px-4 py-3 font-medium text-navy-900">{i.nome}</td>
                <td className="px-4 py-3 font-mono text-xs">{formatCpf(i.cpf)}</td>
                <td className="px-4 py-3 text-xs">
                  {i.email && <div>{i.email}</div>}
                  {i.telefone && <div className="text-ink-500">{i.telefone}</div>}
                </td>
                <td className="px-4 py-3">{i.profissao ?? '—'}</td>
                <td className="px-4 py-3 text-right">{brl(i.renda ? Number(i.renda) : null)}</td>
                <td className="px-4 py-3 text-center">
                  {i.seguro_fianca ? (
                    <span className="text-xs px-2 py-1 rounded-full bg-emerald-50 text-emerald-700">Seguro</span>
                  ) : (
                    <span className="text-xs text-ink-500">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                  <Link href={`/admin/inquilinos/${i.id}/editar`} className="text-xs text-navy-900 hover:underline">
                    Editar
                  </Link>
                  <DeleteButton id={i.id} nome={i.nome} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
