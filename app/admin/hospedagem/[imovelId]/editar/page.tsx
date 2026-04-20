import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { HospedagemForm } from '../hospedagem-form';
import { salvarHospedagem } from '../../actions';

export const metadata = { title: 'Editar ficha de hospedagem' };
export const dynamic = 'force-dynamic';

export default async function EditarHospedagem({ params }: { params: { imovelId: string } }) {
  const supabase = createClient();

  const { data: imovel } = await supabase
    .from('imoveis')
    .select('id, codigo, endereco, numero, bairro, cidade, uf, capacidade_hospedes')
    .eq('id', params.imovelId)
    .single();

  if (!imovel) notFound();

  const { data: ficha } = await supabase
    .from('imovel_hospedagem')
    .select('*')
    .eq('imovel_id', params.imovelId)
    .maybeSingle();

  const action = salvarHospedagem.bind(null, params.imovelId);

  return (
    <div className="px-8 py-6 max-w-5xl">
      <nav aria-label="Breadcrumb" className="text-xs text-ink-400 mb-2">
        <Link href="/admin/dashboard" className="hover:underline">Admin</Link>
        <span className="mx-1.5">/</span>
        <Link href="/admin/hospedagem" className="hover:underline">Hospedagem</Link>
        <span className="mx-1.5">/</span>
        <Link href={`/admin/hospedagem/${imovel.id}`} className="hover:underline">{imovel.codigo}</Link>
        <span className="mx-1.5">/</span>
        <span className="text-ink-500">Editar</span>
      </nav>

      <div className="mb-6">
        <div className="text-xs uppercase tracking-wider text-ink-400 font-semibold">Ficha de hospedagem</div>
        <h1 className="text-2xl font-bold text-navy-900">{imovel.codigo}</h1>
        <p className="text-sm text-ink-500">
          {imovel.endereco}{imovel.numero ? `, ${imovel.numero}` : ''} · {imovel.bairro}, {imovel.cidade}/{imovel.uf}
        </p>
      </div>

      <HospedagemForm
        imovelId={imovel.id}
        capacidade={imovel.capacidade_hospedes ?? 2}
        action={action}
        initial={ficha ?? {}}
      />
    </div>
  );
}
