import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { atualizarEstada } from '../../actions';
import { EstadaForm } from '../../estada-form';

export const metadata = { title: 'Editar estada' };
export const dynamic = 'force-dynamic';

export default async function EditarEstadaPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const [{ data: estada }, { data: imoveis }, { data: hospedes }] = await Promise.all([
    supabase.from('estadas').select('*').eq('id', params.id).maybeSingle(),
    supabase.from('imoveis').select('id, codigo, endereco, diaria_base').eq('modalidade', 'short_stay').order('codigo'),
    supabase.from('hospedes').select('id, nome, documento').order('nome'),
  ]);

  if (!estada) notFound();

  const action = atualizarEstada.bind(null, params.id);

  return (
    <div className="px-8 py-6 max-w-5xl">
      <div className="mb-6">
        <div className="text-xs uppercase tracking-wider text-ink-400 font-semibold">Estada</div>
        <h1 className="text-2xl font-bold text-navy-900">Editar {estada.codigo}</h1>
      </div>

      <div className="bg-white rounded-xl shadow-soft p-6">
        <EstadaForm
          action={action}
          initial={estada}
          imoveis={imoveis ?? []}
          hospedes={hospedes ?? []}
          submitLabel="Salvar alterações"
          cancelHref={`/admin/estadas/${params.id}`}
        />
      </div>
    </div>
  );
}
