import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ProprietarioForm } from '../../proprietario-form';
import { atualizarProprietario } from '../../actions';

export const metadata = { title: 'Editar proprietário' };
export const dynamic = 'force-dynamic';

export default async function EditarProprietarioPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const { data: p } = await supabase
    .from('proprietarios')
    .select('*')
    .eq('id', params.id)
    .maybeSingle();

  if (!p) notFound();

  const action = atualizarProprietario.bind(null, params.id);

  return (
    <div className="px-8 py-6 max-w-4xl">
      <nav aria-label="Breadcrumb" className="text-xs text-ink-400 mb-2">
        <Link href="/admin/dashboard" className="hover:underline">Admin</Link>
        <span className="mx-1.5">/</span>
        <Link href="/admin/proprietarios" className="hover:underline">Proprietários</Link>
        <span className="mx-1.5">/</span>
        <Link href={`/admin/proprietarios/${p.id}`} className="hover:underline">{p.nome}</Link>
        <span className="mx-1.5">/</span>
        <span className="text-ink-500">Editar</span>
      </nav>
      <h1 className="text-2xl font-bold text-navy-900 mb-6">Editar proprietário</h1>
      <div className="bg-white rounded-xl shadow-soft p-6">
        <ProprietarioForm
          action={action}
          initial={p}
          submitLabel="Salvar"
          cancelHref={`/admin/proprietarios/${p.id}`}
        />
      </div>
    </div>
  );
}
