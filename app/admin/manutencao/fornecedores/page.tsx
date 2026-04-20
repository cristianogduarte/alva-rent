import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { FornecedorForm, ExcluirFornecedorButton } from '../client';

export const metadata = { title: 'Fornecedores de manutenção · ALVA Rent' };
export const dynamic = 'force-dynamic';

export default async function FornecedoresPage() {
  const supabase = createClient();
  const { data: fornecedores } = await supabase
    .from('fornecedores_manutencao')
    .select('*')
    .order('ativo', { ascending: false })
    .order('nome');

  return (
    <div className="px-8 py-6 max-w-5xl">
      <Link href="/admin/manutencao" className="text-xs text-ink-500 hover:underline">
        ← Voltar para Manutenção
      </Link>

      <div className="mt-2 mb-6">
        <h1 className="text-2xl font-bold text-navy-900">Fornecedores de manutenção</h1>
        <p className="text-sm text-ink-500 mt-1">
          Cadastro livre. Quando houver uma solicitação, você aciona o contato fora do sistema (WhatsApp/ligação).
        </p>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-soft mb-6">
        <h2 className="font-bold text-navy-900 mb-3">Novo fornecedor</h2>
        <FornecedorForm />
      </div>

      <div className="bg-white rounded-xl shadow-soft overflow-hidden">
        <div className="px-6 py-3 border-b border-navy-100">
          <h2 className="font-bold text-navy-900">Cadastrados ({fornecedores?.length ?? 0})</h2>
        </div>
        {(fornecedores ?? []).length === 0 ? (
          <div className="p-12 text-center text-sm text-ink-400">Nenhum fornecedor cadastrado.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-navy-50 text-xs uppercase text-ink-500">
              <tr>
                <th className="text-left px-4 py-3">Nome</th>
                <th className="text-left px-4 py-3">Especialidade</th>
                <th className="text-left px-4 py-3">Contato</th>
                <th className="text-left px-4 py-3">PIX</th>
                <th className="text-center px-4 py-3">Ativo</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {(fornecedores ?? []).map((f: any) => (
                <tr key={f.id} className="border-t border-navy-50">
                  <td className="px-4 py-3 font-medium">{f.nome}</td>
                  <td className="px-4 py-3 text-ink-600">{f.especialidade ?? '—'}</td>
                  <td className="px-4 py-3 text-xs">
                    {f.telefone && (
                      <a
                        href={`https://wa.me/${f.telefone.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener"
                        className="block text-emerald-700 hover:underline"
                      >
                        📱 {f.telefone}
                      </a>
                    )}
                    {f.email && <div className="text-ink-500">{f.email}</div>}
                  </td>
                  <td className="px-4 py-3 text-xs font-mono text-ink-500">{f.pix ?? '—'}</td>
                  <td className="px-4 py-3 text-center">
                    {f.ativo ? (
                      <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-1 rounded-full">sim</span>
                    ) : (
                      <span className="text-xs bg-ink-100 text-ink-600 px-2 py-1 rounded-full">não</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <ExcluirFornecedorButton id={f.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
