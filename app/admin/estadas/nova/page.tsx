import { createClient } from '@/lib/supabase/server';
import { criarEstada } from '../actions';
import { EstadaForm } from '../estada-form';

export const metadata = { title: 'Nova estada' };
export const dynamic = 'force-dynamic';

export default async function NovaEstadaPage() {
  const supabase = createClient();
  const [{ data: imoveis }, { data: hospedes }] = await Promise.all([
    supabase
      .from('imoveis')
      .select('id, codigo, endereco, diaria_base')
      .eq('modalidade', 'short_stay')
      .order('codigo'),
    supabase.from('hospedes').select('id, nome, documento').order('nome'),
  ]);

  return (
    <div className="px-8 py-6 max-w-5xl">
      <div className="mb-6">
        <div className="text-xs uppercase tracking-wider text-ink-400 font-semibold">Short Stay</div>
        <h1 className="text-2xl font-bold text-navy-900">Nova estada</h1>
      </div>

      <div className="bg-white rounded-xl shadow-soft p-6">
        <EstadaForm
          action={criarEstada}
          imoveis={imoveis ?? []}
          hospedes={hospedes ?? []}
          submitLabel="Cadastrar estada"
        />
      </div>
    </div>
  );
}
