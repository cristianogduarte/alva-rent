'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AMENITIES_PADRAO, ENXOVAL_PADRAO, COZINHA_PADRAO } from '../schema';
import { KitSugerido } from './kit-sugerido';

type Props = {
  imovelId: string;
  capacidade: number;
  action: (prev: any, formData: FormData) => Promise<any>;
  initial: any;
};

export function HospedagemForm({ imovelId, capacidade, action, initial }: Props) {
  const [state, formAction] = useFormState(action, null as any);
  const err = (field: string): string | undefined => state?.fieldErrors?.[field]?.[0];

  // Controla kit sugerido ao vivo
  const [quartos, setQuartos] = useState(Number(initial?.qtd_quartos ?? 1));
  const [banheiros, setBanheiros] = useState(Number(initial?.qtd_banheiros ?? 1));
  const [camasCasal, setCamasCasal] = useState(Number(initial?.qtd_camas_casal ?? 0));
  const [camasSolteiro, setCamasSolteiro] = useState(Number(initial?.qtd_camas_solteiro ?? 0));
  const [sofaCama, setSofaCama] = useState(Number(initial?.qtd_sofa_cama ?? 0));

  const videosExtrasInit: { titulo: string; url: string }[] = Array.isArray(initial?.videos_extras) ? initial.videos_extras : [];
  const [videos, setVideos] = useState(videosExtrasInit.length > 0 ? videosExtrasInit : [{ titulo: '', url: '' }]);

  const arredoresInit: { tipo: string; nome: string; distancia: string }[] = Array.isArray(initial?.arredores) ? initial.arredores : [];
  const [arredores, setArredores] = useState(arredoresInit.length > 0 ? arredoresInit : [{ tipo: 'praia', nome: '', distancia: '' }]);

  const lembretesInit: string[] = Array.isArray(initial?.checkout_lembretes) && initial.checkout_lembretes.length > 0
    ? initial.checkout_lembretes
    : ['Deixe a louça lavada na pia', 'Leve o lixo ao hall', 'Desligue ar-condicionado e luzes', 'Deixe as chaves em cima da mesa'];
  const [lembretes, setLembretes] = useState<string[]>(lembretesInit);

  return (
    <form action={formAction} className="space-y-6 pb-20">
      {state?.error && !state?.fieldErrors && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg px-3 py-2">{state.error}</div>
      )}

      {/* BLOCO 1 — Acesso */}
      <Bloco titulo="1. Acesso & chegada">
        <Row>
          <Field label="Endereço completo" error={err('endereco_completo')}>
            <input name="endereco_completo" defaultValue={initial?.endereco_completo ?? ''} className={inputCls} />
          </Field>
          <Field label="Ponto de referência">
            <input name="ponto_referencia" defaultValue={initial?.ponto_referencia ?? ''} className={inputCls} />
          </Field>
        </Row>
        <Row>
          <Field label="URL do Google Maps">
            <input name="maps_url" defaultValue={initial?.maps_url ?? ''} placeholder="https://maps.app.goo.gl/..." className={inputCls} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Vagas de garagem">
              <input type="number" name="vagas_garagem" defaultValue={initial?.vagas_garagem ?? 0} className={inputCls} />
            </Field>
            <Field label="Nº da vaga">
              <input name="vaga_numero" defaultValue={initial?.vaga_numero ?? ''} className={inputCls} />
            </Field>
          </div>
        </Row>
        <Row>
          <Field label="Tipo de acesso">
            <select name="tipo_acesso" defaultValue={initial?.tipo_acesso ?? 'chave'} className={inputCls}>
              <option value="chave">Chave</option>
              <option value="fechadura_digital">Fechadura digital</option>
              <option value="tag">Tag</option>
              <option value="app">App</option>
              <option value="porteiro">Porteiro recebe</option>
              <option value="outro">Outro</option>
            </select>
          </Field>
          <Field label="Código da fechadura (se houver)">
            <input name="codigo_fechadura" defaultValue={initial?.codigo_fechadura ?? ''} className={`${inputCls} font-mono`} />
          </Field>
        </Row>
        <Field label="Portaria (horário, procedimento)">
          <textarea name="portaria_info" defaultValue={initial?.portaria_info ?? ''} rows={2} className={inputCls} />
        </Field>
        <Row>
          <Field label="Síndico — nome">
            <input name="sindico_nome" defaultValue={initial?.sindico_nome ?? ''} className={inputCls} />
          </Field>
          <Field label="Síndico — telefone">
            <input name="sindico_telefone" defaultValue={initial?.sindico_telefone ?? ''} className={inputCls} />
          </Field>
        </Row>
        <Field label="Instruções de acesso (passo a passo)">
          <textarea name="instrucoes_acesso" defaultValue={initial?.instrucoes_acesso ?? ''} rows={3} className={inputCls} />
        </Field>
      </Bloco>

      {/* BLOCO 2 — Wi-Fi */}
      <Bloco titulo="2. Wi-Fi">
        <Row>
          <Field label="Nome da rede (SSID)">
            <input name="wifi_ssid" defaultValue={initial?.wifi_ssid ?? ''} className={inputCls} />
          </Field>
          <Field label="Senha">
            <input name="wifi_senha" defaultValue={initial?.wifi_senha ?? ''} className={`${inputCls} font-mono`} />
          </Field>
        </Row>
      </Bloco>

      {/* BLOCO 3 — Vídeos */}
      <Bloco titulo="3. Vídeos (YouTube não-listado recomendado)">
        <Row>
          <Field label="Vídeo — Check-in">
            <input name="video_checkin_url" defaultValue={initial?.video_checkin_url ?? ''} className={inputCls} />
          </Field>
          <Field label="Vídeo — Check-out">
            <input name="video_checkout_url" defaultValue={initial?.video_checkout_url ?? ''} className={inputCls} />
          </Field>
        </Row>
        <Field label="Vídeo — Tour da unidade">
          <input name="video_tour_url" defaultValue={initial?.video_tour_url ?? ''} className={inputCls} />
        </Field>

        <div className="pt-3 border-t border-navy-50">
          <div className="text-xs font-semibold text-ink-500 uppercase tracking-wide mb-2">Vídeos extras (equipamentos específicos, vista, etc.)</div>
          {videos.map((v, i) => (
            <div key={i} className="grid grid-cols-[1fr_2fr_auto] gap-2 mb-2">
              <input name="video_titulo" defaultValue={v.titulo} placeholder="Título (ex: Ar-condicionado)" className={inputCls} />
              <input name="video_url" defaultValue={v.url} placeholder="https://youtu.be/..." className={inputCls} />
              <button
                type="button"
                onClick={() => setVideos(videos.filter((_, j) => j !== i))}
                className="text-xs text-rose-600 hover:text-rose-700 px-2"
              >
                remover
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setVideos([...videos, { titulo: '', url: '' }])}
            className="text-xs text-navy-700 font-semibold hover:underline"
          >
            + adicionar vídeo
          </button>
        </div>
      </Bloco>

      {/* BLOCO 4 — Estrutura + Kit sugerido */}
      <Bloco titulo="4. Configuração da unidade">
        <div className="grid grid-cols-5 gap-3">
          <Field label="Quartos">
            <input type="number" name="qtd_quartos" value={quartos} onChange={(e) => setQuartos(Number(e.target.value) || 0)} className={inputCls} />
          </Field>
          <Field label="Banheiros">
            <input type="number" name="qtd_banheiros" value={banheiros} onChange={(e) => setBanheiros(Number(e.target.value) || 0)} className={inputCls} />
          </Field>
          <Field label="Camas casal">
            <input type="number" name="qtd_camas_casal" value={camasCasal} onChange={(e) => setCamasCasal(Number(e.target.value) || 0)} className={inputCls} />
          </Field>
          <Field label="Camas solteiro">
            <input type="number" name="qtd_camas_solteiro" value={camasSolteiro} onChange={(e) => setCamasSolteiro(Number(e.target.value) || 0)} className={inputCls} />
          </Field>
          <Field label="Sofá-cama">
            <input type="number" name="qtd_sofa_cama" value={sofaCama} onChange={(e) => setSofaCama(Number(e.target.value) || 0)} className={inputCls} />
          </Field>
        </div>

        <div className="mt-4">
          <KitSugerido
            capacidade={capacidade}
            quartos={quartos}
            banheiros={banheiros}
            camasCasal={camasCasal}
            camasSolteiro={camasSolteiro}
            sofaCama={sofaCama}
          />
          <p className="text-xs text-ink-500 mt-2">
            Use essa sugestão como base. Abaixo você registra o que <strong>já existe</strong> na unidade hoje.
          </p>
        </div>
      </Bloco>

      {/* BLOCO 5 — Quadros hoteleiros */}
      <Bloco titulo="5. O que já tem hoje na unidade">
        <div className="grid grid-cols-3 gap-5">
          <QuadroInput titulo="🎁 Amenities ALVA" prefix="amenity" defs={AMENITIES_PADRAO as any} valores={initial?.amenities_padrao ?? {}} />
          <QuadroInput titulo="🛏️ Enxoval" prefix="enxoval" defs={ENXOVAL_PADRAO as any} valores={initial?.enxoval ?? {}} />
          <QuadroInput titulo="🍳 Cozinha" prefix="cozinha" defs={COZINHA_PADRAO as any} valores={initial?.cozinha ?? {}} />
        </div>
      </Bloco>

      {/* BLOCO 6 — Regras */}
      <Bloco titulo="6. Regras da casa">
        <div className="grid grid-cols-4 gap-3">
          <Toggle name="aceita_pets" label="Pets" defaultChecked={!!initial?.aceita_pets} />
          <Toggle name="permite_fumar" label="Fumar" defaultChecked={!!initial?.permite_fumar} />
          <Toggle name="permite_festa" label="Festas" defaultChecked={!!initial?.permite_festa} />
          <Toggle name="permite_criancas" label="Crianças" defaultChecked={initial?.permite_criancas !== false} />
        </div>
        <Row>
          <Field label="Silêncio — início">
            <input type="time" name="horario_silencio_inicio" defaultValue={initial?.horario_silencio_inicio ?? '22:00'} className={inputCls} />
          </Field>
          <Field label="Silêncio — fim">
            <input type="time" name="horario_silencio_fim" defaultValue={initial?.horario_silencio_fim ?? '08:00'} className={inputCls} />
          </Field>
        </Row>
        <Field label="Outras regras (texto livre)">
          <textarea name="regras_casa" defaultValue={initial?.regras_casa ?? ''} rows={3} className={inputCls} />
        </Field>
      </Bloco>

      {/* BLOCO 7 — Arredores */}
      <Bloco titulo="7. Arredores">
        {arredores.map((a, i) => (
          <div key={i} className="grid grid-cols-[150px_1fr_120px_auto] gap-2 mb-2">
            <select
              name="arredor_tipo"
              defaultValue={a.tipo}
              className={inputCls}
            >
              <option value="praia">Praia</option>
              <option value="mercado">Mercado</option>
              <option value="farmacia">Farmácia</option>
              <option value="hospital">Hospital</option>
              <option value="restaurante">Restaurante</option>
              <option value="gasolina">Posto de gasolina</option>
              <option value="shopping">Shopping</option>
              <option value="outro">Outro</option>
            </select>
            <input name="arredor_nome" defaultValue={a.nome} placeholder="Nome do lugar" className={inputCls} />
            <input name="arredor_distancia" defaultValue={a.distancia} placeholder="300m / 5min" className={inputCls} />
            <button type="button" onClick={() => setArredores(arredores.filter((_, j) => j !== i))} className="text-xs text-rose-600 px-2">
              remover
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setArredores([...arredores, { tipo: 'mercado', nome: '', distancia: '' }])}
          className="text-xs text-navy-700 font-semibold hover:underline"
        >
          + adicionar
        </button>
      </Bloco>

      {/* BLOCO 8 — Checkout */}
      <Bloco titulo="8. Lembretes de check-out (aparecem no cartão do hóspede)">
        {lembretes.map((l, i) => (
          <div key={i} className="flex gap-2 mb-2">
            <input
              name="checkout_lembrete"
              defaultValue={l}
              className={inputCls}
            />
            <button
              type="button"
              onClick={() => setLembretes(lembretes.filter((_, j) => j !== i))}
              className="text-xs text-rose-600 px-2"
            >
              remover
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setLembretes([...lembretes, ''])}
          className="text-xs text-navy-700 font-semibold hover:underline"
        >
          + adicionar lembrete
        </button>
      </Bloco>

      {/* BLOCO 9 — Operacional */}
      <Bloco titulo="9. Operacional (só admin)">
        <Field label="Observações de limpeza">
          <textarea name="observacoes_limpeza" defaultValue={initial?.observacoes_limpeza ?? ''} rows={2} className={inputCls} />
        </Field>
        <Field label="Notas internas (não aparece pro hóspede)">
          <textarea name="notas_operacionais" defaultValue={initial?.notas_operacionais ?? ''} rows={2} className={inputCls} />
        </Field>
        <Field label="URL do manual interno (opcional, PDF)">
          <input name="manual_url" defaultValue={initial?.manual_url ?? ''} className={inputCls} />
        </Field>
      </Bloco>

      <div className="sticky bottom-0 bg-white border-t border-navy-100 py-3 -mx-8 px-8 flex items-center gap-3 z-10">
        <Submit />
        <Link href={`/admin/hospedagem/${imovelId}`} className="text-sm text-ink-500 hover:text-navy-900">Cancelar</Link>
      </div>
    </form>
  );
}

const inputCls =
  'w-full px-3 py-2 text-sm border border-navy-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-900/20 bg-white';

function Bloco({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <fieldset className="bg-white rounded-xl shadow-soft p-5">
      <legend className="text-sm font-bold text-navy-900 px-2">{titulo}</legend>
      <div className="space-y-3 mt-2">{children}</div>
    </fieldset>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-4">{children}</div>;
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-ink-500 uppercase tracking-wide">{label}</span>
      <div className="mt-1">{children}</div>
      {error && <span className="text-xs text-rose-600 mt-1 block">{error}</span>}
    </label>
  );
}

function Toggle({ name, label, defaultChecked }: { name: string; label: string; defaultChecked: boolean }) {
  return (
    <label className="flex items-center gap-2 border border-navy-100 rounded-lg px-3 py-2.5 text-sm cursor-pointer hover:bg-navy-50">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="w-4 h-4" />
      <span>{label}</span>
    </label>
  );
}

function QuadroInput({
  titulo,
  prefix,
  defs,
  valores,
}: {
  titulo: string;
  prefix: string;
  defs: readonly { key: string; label: string; unidade?: string }[];
  valores: Record<string, number>;
}) {
  return (
    <div className="border border-navy-100 rounded-lg p-3">
      <div className="text-xs font-semibold text-navy-900 mb-2">{titulo}</div>
      <ul className="space-y-2">
        {defs.map((d) => (
          <li key={d.key} className="flex items-center justify-between gap-2">
            <label htmlFor={`${prefix}:${d.key}`} className="text-xs text-ink-700 flex-1">
              {d.label}
              {d.unidade && <span className="text-ink-400 ml-1">({d.unidade})</span>}
            </label>
            <input
              id={`${prefix}:${d.key}`}
              name={`${prefix}:${d.key}`}
              type="number"
              min={0}
              defaultValue={valores[d.key] ?? 0}
              className="w-16 px-2 py-1 text-sm text-right border border-navy-100 rounded bg-white tabular-nums"
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

function Submit() {
  const { pending } = useFormStatus();
  return <Button type="submit" disabled={pending}>{pending ? 'Salvando...' : 'Salvar ficha'}</Button>;
}
