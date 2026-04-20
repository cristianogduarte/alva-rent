import Link from 'next/link';
import { ProprietarioForm } from '../proprietario-form';
import { criarProprietario } from '../actions';

export const metadata = { title: 'Novo proprietário' };

export default function NovoProprietarioPage() {
  return (
    <div className="px-8 py-6 max-w-4xl">
      <nav aria-label="Breadcrumb" className="text-xs text-ink-400 mb-2">
        <Link href="/admin/dashboard" className="hover:underline">Admin</Link>
        <span className="mx-1.5">/</span>
        <Link href="/admin/proprietarios" className="hover:underline">Proprietários</Link>
        <span className="mx-1.5">/</span>
        <span className="text-ink-500">Novo</span>
      </nav>
      <h1 className="text-2xl font-bold text-navy-900 mb-6">Novo proprietário</h1>
      <div className="bg-white rounded-xl shadow-soft p-6">
        <ProprietarioForm action={criarProprietario} submitLabel="Cadastrar" />
      </div>
    </div>
  );
}
