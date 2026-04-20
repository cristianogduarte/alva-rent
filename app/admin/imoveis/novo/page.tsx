import { criarImovel } from '../actions';
import { ImovelForm } from '../imovel-form';

export const metadata = { title: 'Novo imóvel' };

export default function NovoImovelPage() {
  return (
    <div className="px-8 py-6 max-w-4xl">
      <div className="mb-6">
        <div className="text-xs uppercase tracking-wider text-ink-400 font-semibold">
          Imóveis
        </div>
        <h1 className="text-2xl font-bold text-navy-900">Novo imóvel</h1>
      </div>

      <div className="bg-white rounded-xl shadow-soft p-6">
        <ImovelForm action={criarImovel} submitLabel="Cadastrar imóvel" />
      </div>
    </div>
  );
}
