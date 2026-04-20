'use client';

/**
 * Kit padrão ALVA: calcula enxoval sugerido com base em capacidade + camas.
 *
 * Regra (3 jogos de rotação: 1 em uso, 1 reserva, 1 lavando):
 *  - Toalhas de banho: 3 × capacidade
 *  - Toalhas de rosto:  2 × capacidade
 *  - Toalhas de piscina: 1 × capacidade
 *  - Jogos cama casal:    2 × qtd_camas_casal
 *  - Jogos cama solteiro: 2 × (qtd_camas_solteiro + qtd_sofa_cama)
 *  - Travesseiros: 2 × capacidade
 *  - Edredons: qtd_camas_casal + qtd_camas_solteiro + qtd_sofa_cama (1 por cama)
 *  - Cobertores: mesmo do edredom
 *
 * Amenities consumíveis ALVA (estoque mínimo em estoque na unidade):
 *  - Sabonete, shampoo, condicionador: 2 × capacidade
 *  - Papel higiênico: 4 rolos × banheiros (mínimo 4)
 *  - Detergente, sabão em pó: 1 un
 */
import { useMemo } from 'react';

export function KitSugerido({
  capacidade,
  quartos,
  banheiros,
  camasCasal,
  camasSolteiro,
  sofaCama,
}: {
  capacidade: number;
  quartos: number;
  banheiros: number;
  camasCasal: number;
  camasSolteiro: number;
  sofaCama: number;
}) {
  const kit = useMemo(() => {
    const cap = Math.max(1, capacidade || 1);
    const ban = Math.max(1, banheiros || 1);
    const camasS = camasSolteiro + sofaCama;
    const totalCamas = camasCasal + camasS;

    return {
      enxoval: {
        'Toalhas de banho': 3 * cap,
        'Toalhas de rosto': 2 * cap,
        'Toalhas de piscina': cap,
        'Jogos de cama (casal)': 2 * camasCasal,
        'Jogos de cama (solteiro)': 2 * camasS,
        'Travesseiros': 2 * cap,
        'Edredons': totalCamas,
        'Cobertores': totalCamas,
      },
      amenities: {
        'Sabonete': 2 * cap,
        'Shampoo': 2 * cap,
        'Condicionador': 2 * cap,
        'Papel higiênico (rolos)': Math.max(4, 4 * ban),
        'Detergente': 1,
        'Sabão em pó': 1,
      },
    };
  }, [capacidade, quartos, banheiros, camasCasal, camasSolteiro, sofaCama]);

  return (
    <div className="bg-emerald-50/60 border border-emerald-200 rounded-lg p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="text-xs uppercase tracking-wider text-emerald-800 font-bold">Kit padrão ALVA — sugestão</div>
          <p className="text-xs text-emerald-900/70 mt-0.5">
            Calculado automaticamente. 3 jogos por rotação (1 em uso · 1 reserva · 1 lavando).
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-[11px] font-semibold text-emerald-800 uppercase mb-1.5">Enxoval</div>
          <ul className="text-sm space-y-0.5">
            {Object.entries(kit.enxoval).map(([k, v]) => (
              <li key={k} className="flex justify-between">
                <span className="text-ink-700">{k}</span>
                <span className="tabular-nums font-semibold text-navy-900">{v}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="text-[11px] font-semibold text-emerald-800 uppercase mb-1.5">Amenities (estoque mín.)</div>
          <ul className="text-sm space-y-0.5">
            {Object.entries(kit.amenities).map(([k, v]) => (
              <li key={k} className="flex justify-between">
                <span className="text-ink-700">{k}</span>
                <span className="tabular-nums font-semibold text-navy-900">{v}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
