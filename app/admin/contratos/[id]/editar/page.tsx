import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { atualizarContrato } from '../../actions';
import { ContratoForm } from '../../contrato-form';

export const metadata = { title: 'Editar contrato' };
export const dynamic = 'force-dynamic';

export default async function EditarContratoPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const [{ data: contrato }, { data: imoveis }, { data: inquilinos }] = await Promise.all([
    supabase.from('contratos').select('*').eq('id', params.id).maybeSingle(),
    supabase.from('imoveis').select('id, codigo, endereco, status').order('codigo'),
    supabase.from('inquilinos').select('id, nome, cpf').order('nome'),
  ]);

  if (!contrato) notFound();

  const action = atualizarContrato.bind(null, params.id);

  return (
    <div className="px-8 py-6 max-w-5xl">
      <div className="mb-6">
        <div className="text-xs uppercase tracking-wider text-ink-400 font-semibold">
          Contratos
        </div>
        <h1 className="text-2xl font-bold text-navy-900">Editar {contrato.codigo}</h1>
      </div>

      <div className="bg-white rounded-xl shadow-soft p-6">
        <ContratoForm
          action={action}
          initial={contrato}
          imoveis={imoveis ?? []}
          inquilinos={inquilinos ?? []}
          submitLabel="Salvar alterações"
        />
      </div>
    </div>
  );
}
