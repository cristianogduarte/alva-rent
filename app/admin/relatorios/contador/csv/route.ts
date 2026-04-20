import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

function csvCell(v: any) {
  if (v == null) return '';
  const s = String(v).replace(/"/g, '""');
  return /[;"\n]/.test(s) ? `"${s}"` : s;
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const ano = Number(sp.get('ano') ?? new Date().getFullYear());
  const de = sp.get('de') ?? `${ano}-01-01`;
  const ate = sp.get('ate') ?? `${ano}-12-31`;

  const supabase = createClient();
  const { data: boletos } = await supabase
    .from('boletos')
    .select(`
      competencia, data_pagamento, valor_total, valor_pago, status,
      contrato:contratos (codigo,
        imovel:imoveis (codigo, endereco, numero, bairro, cidade, uf,
          proprietario:proprietarios (nome, cpf_cnpj)),
        inquilino:inquilinos (nome, cpf))
    `)
    .gte('competencia', de)
    .lte('competencia', ate)
    .order('competencia');

  const header = [
    'competencia', 'contrato', 'imovel', 'endereco', 'proprietario', 'cpf_cnpj_proprietario',
    'inquilino', 'cpf_inquilino', 'valor_bruto', 'valor_pago', 'data_pagamento', 'status',
  ];
  const lines = [header.join(';')];

  for (const b of (boletos ?? []) as any[]) {
    const imv = b.contrato?.imovel;
    const prop = imv?.proprietario;
    const inq = b.contrato?.inquilino;
    lines.push(
      [
        b.competencia,
        b.contrato?.codigo,
        imv?.codigo,
        `${imv?.endereco ?? ''} ${imv?.numero ?? ''} - ${imv?.bairro ?? ''}, ${imv?.cidade ?? ''}/${imv?.uf ?? ''}`,
        prop?.nome,
        prop?.cpf_cnpj,
        inq?.nome,
        inq?.cpf,
        Number(b.valor_total).toFixed(2).replace('.', ','),
        b.valor_pago ? Number(b.valor_pago).toFixed(2).replace('.', ',') : '',
        b.data_pagamento ?? '',
        b.status,
      ].map(csvCell).join(';')
    );
  }

  const csv = '\uFEFF' + lines.join('\n'); // BOM pra Excel BR
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="alva-rent-contabil-${ano}.csv"`,
    },
  });
}
