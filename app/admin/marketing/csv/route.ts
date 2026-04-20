import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

function csvCell(v: unknown): string {
  if (v == null) return '';
  const s = String(v);
  if (/[,;"\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(req: NextRequest) {
  const supabase = createClient();
  const sp = req.nextUrl.searchParams;

  let query = supabase
    .from('hospedes')
    .select(
      'nome, email, telefone, pais, cidade, origem_primeira_estada, aceita_marketing, qtd_estadas, receita_total_gerada, ultima_estada_em, primeira_estada_em, segmento, tags',
    )
    .is('anonimizado_em', null);

  if (sp.get('segmento')) query = query.eq('segmento', sp.get('segmento')!);
  if (sp.get('origem')) query = query.eq('origem_primeira_estada', sp.get('origem')!);
  if (sp.get('optin') === 'sim') query = query.eq('aceita_marketing', true);
  if (sp.get('optin') === 'nao') query = query.eq('aceita_marketing', false);
  if (sp.get('q')) query = query.ilike('nome', `%${sp.get('q')}%`);

  const { data, error } = await query;
  if (error) return new NextResponse(error.message, { status: 500 });

  const headers = [
    'nome',
    'email',
    'telefone',
    'pais',
    'cidade',
    'origem',
    'aceita_marketing',
    'qtd_estadas',
    'receita_total',
    'primeira_estada',
    'ultima_estada',
    'segmento',
    'tags',
  ];

  const rows = (data ?? []).map((h: any) =>
    [
      h.nome,
      h.email,
      h.telefone,
      h.pais,
      h.cidade,
      h.origem_primeira_estada,
      h.aceita_marketing ? 'sim' : 'nao',
      h.qtd_estadas,
      h.receita_total_gerada,
      h.primeira_estada_em,
      h.ultima_estada_em,
      h.segmento,
      Array.isArray(h.tags) ? h.tags.join('|') : '',
    ].map(csvCell).join(','),
  );

  const csv = '\uFEFF' + [headers.join(','), ...rows].join('\n');
  const fname = `hospedes-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${fname}"`,
    },
  });
}
