import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { brl } from '@/lib/utils';

export const metadata = { title: 'Proprietários' };
export const dynamic = 'force-dynamic';

function formatDoc(d: string | null) {
  if (!d) return '—';
  const n = d.replace(/\D/g, '');
  if (n.length === 11) return n.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  if (n.length === 14) return n.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  return d;
}

export default async function ProprietariosPage() {
  const supabase = createClient();

  const [{ data: proprietarios }, { data: imoveis }, { data: contratosAtivos }] =
    await Promise.all([
      supabase
        .from('proprietarios')
        .select('id, nome, cpf_cnpj, email, telefone, comissao_pct')
        .order('nome'),
      supabase.from('imoveis').select('id, proprietario_id'),
      supabase
        .from('contratos')
        .select('valor_aluguel, taxa_administracao_pct, imovel:imoveis(proprietario_id)')
        .eq('status', 'ativo'),
    ]);

  // Agrega por proprietário
  const imoveisPorProp = new Map<string, number>();
  for (const i of imoveis ?? []) {
    if (!i.proprietario_id) continue;
    imoveisPorProp.set(i.proprietario_id, (imoveisPorProp.get(i.proprietario_id) ?? 0) + 1);
  }

  const mrrPorProp = new Map<string, number>();
  let mrrTotal = 0;
  let repasseTotal = 0;
  for (const c of contratosAtivos ?? []) {
    const imv: any = Array.isArray(c.imovel) ? c.imovel[0] : c.imovel;
    if (!imv?.proprietario_id) continue;
    const bruto = Number(c.valor_aluguel);
    const taxa = Number(c.taxa_administracao_pct ?? 10);
    const liquido = bruto * (1 - taxa / 100);
    mrrPorProp.set(imv.proprietario_id, (mrrPorProp.get(imv.proprietario_id) ?? 0) + bruto);
    mrrTotal += bruto;
    repasseTotal += liquido;
  }

  const totalImoveis = imoveis?.length ?? 0;

  return (
    <div className="px-8 py-6">
      {/* Breadcrumb + header */}
      <nav aria-label="Breadcrumb" className="text-xs text-ink-400 mb-2">
        <Link href="/admin/dashboard" className="hover:underline">Admin</Link>
        <span className="mx-1.5">/</span>
        <span className="text-ink-500">Proprietários</span>
      </nav>

      <div className="flex items-end justify-between mb-6">
        <div>
          <div className="text-xs uppercase tracking-wider text-ink-400 font-semibold">
            Cadastros
          </div>
          <h1 className="text-2xl font-bold text-navy-900">Proprietários</h1>
          <p className="text-sm text-ink-500">
            {proprietarios?.length ?? 0} proprietário
            {(proprietarios?.length ?? 0) === 1 ? '' : 's'} administrado
            {(proprietarios?.length ?? 0) === 1 ? '' : 's'} pela ALVA Rent
          </p>
        </div>
        <Link href="/admin/proprietarios/novo">
          <Button>+ Novo proprietário</Button>
        </Link>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <KPI label="Proprietários" value={String(proprietarios?.length ?? 0)} />
        <KPI label="Imóveis administrados" value={String(totalImoveis)} />
        <KPI label="MRR bruto consolidado" value={brl(mrrTotal)} hint="aluguéis ativos" />
        <KPI
          label="A repassar / mês"
          value={brl(repasseTotal)}
          hint={`ALVA retém ${brl(mrrTotal - repasseTotal)}`}
        />
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl shadow-soft overflow-hidden">
        {(proprietarios?.length ?? 0) === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm text-ink-500 mb-3">
              Nenhum proprietário cadastrado.
            </p>
            <Link href="/admin/proprietarios/novo">
              <Button>Cadastrar o primeiro</Button>
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-navy-50/40 text-ink-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Nome / Razão social</th>
                <th className="text-left px-4 py-3 font-semibold">CPF / CNPJ</th>
                <th className="text-left px-4 py-3 font-semibold">Contato</th>
                <th className="text-center px-4 py-3 font-semibold">Imóveis</th>
                <th className="text-right px-4 py-3 font-semibold">MRR bruto</th>
                <th className="text-center px-4 py-3 font-semibold">Taxa</th>
                <th className="text-right px-4 py-3 font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody>
              {proprietarios?.map((p) => {
                const qImv = imoveisPorProp.get(p.id) ?? 0;
                const mrr = mrrPorProp.get(p.id) ?? 0;
                return (
                  <tr key={p.id} className="border-t border-navy-50 hover:bg-navy-50/30">
                    <td className="px-4 py-3 font-semibold text-navy-900">
                      <Link href={`/admin/proprietarios/${p.id}`} className="hover:underline">
                        {p.nome}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-ink-500">
                      {formatDoc(p.cpf_cnpj)}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {p.email && <div>{p.email}</div>}
                      {p.telefone && <div className="text-ink-500">{p.telefone}</div>}
                      {!p.email && !p.telefone && <span className="text-ink-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center tabular-nums">{qImv}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{brl(mrr)}</td>
                    <td className="px-4 py-3 text-center tabular-nums">
                      {Number(p.comissao_pct ?? 0).toFixed(2)}%
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap space-x-3">
                      <Link
                        href={`/admin/proprietarios/${p.id}`}
                        className="text-xs text-navy-900 hover:underline font-semibold"
                      >
                        Ver
                      </Link>
                      <Link
                        href={`/admin/proprietarios/${p.id}/editar`}
                        className="text-xs text-ink-500 hover:text-navy-900"
                      >
                        Editar
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function KPI({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-soft">
      <div className="text-xs text-ink-500 font-semibold uppercase">{label}</div>
      <div className="text-2xl font-bold mt-1 text-navy-900 tabular-nums">{value}</div>
      {hint && <div className="text-xs text-ink-500 mt-1">{hint}</div>}
    </div>
  );
}
