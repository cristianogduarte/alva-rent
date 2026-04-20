import { criarInquilino } from '../actions';
import { InquilinoForm } from '../inquilino-form';

export const metadata = { title: 'Novo inquilino' };

export default function NovoInquilinoPage() {
  return (
    <div className="px-8 py-6 max-w-4xl">
      <div className="mb-6">
        <div className="text-xs uppercase tracking-wider text-ink-400 font-semibold">
          Inquilinos
        </div>
        <h1 className="text-2xl font-bold text-navy-900">Novo inquilino</h1>
      </div>

      <div className="bg-white rounded-xl shadow-soft p-6">
        <InquilinoForm action={criarInquilino} submitLabel="Cadastrar inquilino" />
      </div>
    </div>
  );
}
