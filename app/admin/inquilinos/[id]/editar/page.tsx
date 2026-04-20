import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { atualizarInquilino } from '../../actions';
import { InquilinoForm } from '../../inquilino-form';

export const metadata = { title: 'Editar inquilino' };
export const dynamic = 'force-dynamic';

export default async function EditarInquilinoPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: inquilino } = await supabase
    .from('inquilinos')
    .select('*')
    .eq('id', params.id)
    .maybeSingle();

  if (!inquilino) notFound();

  const action = atualizarInquilino.bind(null, params.id);

  return (
    <div className="px-8 py-6 max-w-4xl">
      <div className="mb-6">
        <div className="text-xs uppercase tracking-wider text-ink-400 font-semibold">
          Inquilinos
        </div>
        <h1 className="text-2xl font-bold text-navy-900">
          Editar {inquilino.nome}
        </h1>
      </div>

      <div className="bg-white rounded-xl shadow-soft p-6">
        <InquilinoForm action={action} initial={inquilino} submitLabel="Salvar alterações" />
      </div>
    </div>
  );
}
