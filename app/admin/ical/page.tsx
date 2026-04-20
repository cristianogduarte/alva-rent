import Link from 'next/link';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { SyncButton, CopyButton, FeedForm } from './client-parts';

export const metadata = { title: 'iCal 2-way — Short Stay' };
export const dynamic = 'force-dynamic';

export default async function IcalPage() {
  const supabase = createClient();
  const h = headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'app.alvarent.com.br';
  const proto = h.get('x-forwarded-proto') ?? 'https';
  const baseUrl = `${proto}://${host}`;

  const [{ data: feeds }, { data: imoveis }] = await Promise.all([
    supabase
      .from('ical_feeds')
      .select('id, imovel_id, canal, url_import, url_export_token, ultima_sincronizacao, ultimo_erro, ativo, imovel:imoveis(codigo, endereco)')
      .order('created_at', { ascending: false }),
    supabase
      .from('imoveis')
      .select('id, codigo, endereco')
      .eq('modalidade', 'short_stay')
      .order('codigo'),
  ]);

  return (
    <div className="px-8 py-6 max-w-6xl">
      <div className="mb-6">
        <div className="text-xs uppercase tracking-wider text-ink-400 font-semibold">Short Stay</div>
        <h1 className="text-2xl font-bold text-navy-900">iCal — sync 2-way com Airbnb/Booking</h1>
        <p className="text-sm text-ink-500 max-w-2xl">
          Cada imóvel×canal tem dois URLs: um para <strong>exportar</strong> as datas bloqueadas pelo ALVA
          (você cola nos settings do canal) e um para <strong>importar</strong> as reservas que o canal já criou
          (você copia dos settings do canal e cola aqui).
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-soft p-5 mb-6">
        <h2 className="text-sm font-semibold text-navy-900 mb-3">+ Adicionar / atualizar feed</h2>
        <FeedForm imoveis={imoveis ?? []} />
      </div>

      <div className="space-y-3">
        {(feeds ?? []).length === 0 && (
          <div className="bg-white rounded-xl shadow-soft p-10 text-center text-sm text-ink-500">
            Nenhum feed cadastrado ainda. Adicione acima escolhendo um imóvel short_stay + canal.
          </div>
        )}

        {feeds?.map((f: any) => {
          const imovel = Array.isArray(f.imovel) ? f.imovel[0] : f.imovel;
          const exportUrl = `${baseUrl}/ical/${f.url_export_token}`;
          return (
            <div key={f.id} className="bg-white rounded-xl shadow-soft p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-semibold text-navy-900">{imovel?.codigo}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full capitalize bg-navy-100 text-navy-900">{f.canal}</span>
                    {!f.ativo && <span className="text-xs px-2 py-0.5 rounded-full bg-ink-100 text-ink-500">inativo</span>}
                  </div>
                  <div className="text-xs text-ink-500">{imovel?.endereco}</div>
                </div>
                <SyncButton feedId={f.id} disabled={!f.url_import} />
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <div className="font-semibold text-ink-500 uppercase mb-1">
                    Export (cole no {f.canal})
                  </div>
                  <div className="flex gap-1">
                    <input
                      readOnly
                      value={exportUrl}
                      className="flex-1 font-mono text-xs px-2 py-1.5 border border-navy-100 rounded bg-navy-50/50"
                    />
                    <CopyButton text={exportUrl} />
                  </div>
                </div>

                <div>
                  <div className="font-semibold text-ink-500 uppercase mb-1">
                    Import (URL que o {f.canal} gera)
                  </div>
                  <div className="font-mono text-xs px-2 py-1.5 border border-navy-100 rounded bg-white truncate">
                    {f.url_import || <span className="text-ink-400">não configurado</span>}
                  </div>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between text-xs text-ink-500">
                <div>
                  {f.ultima_sincronizacao
                    ? <>Última sync: {new Date(f.ultima_sincronizacao).toLocaleString('pt-BR')}</>
                    : 'Nunca sincronizado'}
                  {f.ultimo_erro && <span className="ml-2 text-rose-600">· erro: {f.ultimo_erro}</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8">
        <Link href="/admin/estadas" className="text-sm text-navy-900 hover:underline">← Voltar para estadas</Link>
      </div>
    </div>
  );
}
