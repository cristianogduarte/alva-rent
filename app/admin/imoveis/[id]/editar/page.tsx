import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { atualizarImovel } from '../../actions';
import { ImovelForm } from '../../imovel-form';

export const metadata = { title: 'Editar imóvel' };
export const dynamic = 'force-dynamic';

export default async function EditarImovelPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: imovel } = await supabase
    .from('imoveis')
    .select('*')
    .eq('id', params.id)
    .maybeSingle();

  if (!imovel) notFound();

  const action = atualizarImovel.bind(null, params.id);

  return (
    <div className="px-8 py-6 max-w-4xl">
      <div className="mb-6">
        <div className="text-xs uppercase tracking-wider text-ink-400 font-semibold">
          Imóveis
        </div>
        <h1 className="text-2xl font-bold text-navy-900">
          Editar {imovel.codigo}
        </h1>
      </div>

      <div className="bg-white rounded-xl shadow-soft p-6">
        <ImovelForm action={action} initial={imovel} submitLabel="Salvar alterações" />
      </div>
    </div>
  );
}
