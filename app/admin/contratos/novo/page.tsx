import { createClient } from '@/lib/supabase/server';
import { criarContrato } from '../actions';
import { ContratoForm } from '../contrato-form';

export const metadata = { title: 'Novo contrato' };
export const dynamic = 'force-dynamic';

export default async function NovoContratoPage() {
  const supabase = createClient();
  const [{ data: imoveis }, { data: inquilinos }] = await Promise.all([
    supabase.from('imoveis').select('id, codigo, endereco, status').order('codigo'),
    supabase.from('inquilinos').select('id, nome, cpf').order('nome'),
  ]);

  return (
    <div className="px-8 py-6 max-w-5xl">
      <div className="mb-6">
        <div className="text-xs uppercase tracking-wider text-ink-400 font-semibold">
          Contratos
        </div>
        <h1 className="text-2xl font-bold text-navy-900">Novo contrato</h1>
      </div>

      <div className="bg-white rounded-xl shadow-soft p-6">
        <ContratoForm
          action={criarContrato}
          imoveis={imoveis ?? []}
          inquilinos={inquilinos ?? []}
          submitLabel="Cadastrar contrato"
        />
      </div>
    </div>
  );
}
