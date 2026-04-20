import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { brl } from '@/lib/utils';
import { EquipeForm } from './client';

export const metadata = { title: 'Equipes de limpeza' };
export const dynamic = 'force-dynamic';

export default async function EquipePage() {
  const supabase = createClient();
  const { data: equipes } = await supabase
    .from('equipe_limpeza')
    .select('*')
    .order('ativo', { ascending: false })
    .order('nome');

  return (
    <div className="px-8 py-6 max-w-4xl">
      <div className="mb-6">
        <Link href="/admin/limpeza" className="text-xs text-ink-500 hover:underline">
          ← Limpezas
        </Link>
        <h1 className="text-2xl font-bold text-navy-900 mt-1">Equipes de limpeza</h1>
        <p className="text-sm text-ink-500">
          Cadastre equipes/freelas e o valor padrão de cada serviço.
        </p>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-soft mb-6">
        <div className="text-sm font-semibold mb-4">Nova equipe</div>
        <EquipeForm />
      </div>

      <div className="bg-white rounded-xl shadow-soft overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-navy-50 text-ink-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-3 font-semibold">Nome</th>
              <th className="text-left px-4 py-3 font-semibold">Telefone</th>
              <th className="text-left px-4 py-3 font-semibold">Chave PIX</th>
              <th className="text-right px-4 py-3 font-semibold">Valor padrão</th>
              <th className="text-center px-4 py-3 font-semibold">Ativo</th>
            </tr>
          </thead>
          <tbody>
            {(equipes ?? []).length === 0 && (
              <tr><td colSpan={5} className="text-center text-ink-500 py-10">
                Nenhuma equipe cadastrada.
              </td></tr>
            )}
            {(equipes ?? []).map((e) => (
              <tr key={e.id} className="border-t border-navy-50">
                <td className="px-4 py-3 font-medium">{e.nome}</td>
                <td className="px-4 py-3 text-xs">{e.telefone ?? '—'}</td>
                <td className="px-4 py-3 text-xs font-mono">{e.chave_pix ?? '—'}</td>
                <td className="px-4 py-3 text-right tabular-nums">{brl(e.valor_padrao ?? 0)}</td>
                <td className="px-4 py-3 text-center">
                  {e.ativo ? (
                    <span className="text-emerald-700">✓</span>
                  ) : (
                    <span className="text-ink-400">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
