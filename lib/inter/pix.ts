/**
 * Pagamento PIX via API Inter v3 (endpoint /banking/v2/pix).
 *
 * v1 — **stub funcional**: se as credenciais Inter ainda não estão destravadas,
 * o código marca o repasse como pago localmente e devolve um end-to-end-id
 * sintético. Quando as credenciais chegarem, basta exportar
 * INTER_PIX_ENABLED=true e a chamada real será feita.
 *
 * Nunca chame este módulo direto do client — sempre via Server Action.
 */

import { getInterToken, getInterAgent } from './auth';

export interface PixDestino {
  favorecido_nome: string;
  favorecido_documento: string; // CPF/CNPJ somente números
  chave_pix?: string | null;     // email/CPF/cnpj/telefone/EVP
  banco_ispb?: string | null;    // se for TED/transferência por dados
  agencia?: string | null;
  conta?: string | null;
}

export interface PixRequest {
  valor: number;
  descricao: string;
  destino: PixDestino;
  idempotency_key: string; // ex: repasse_<uuid>
}

export type PixResult =
  | { ok: true; end_to_end_id: string; modo: 'real' | 'stub' }
  | { ok: false; error: string };

export async function enviarPixRepasse(req: PixRequest): Promise<PixResult> {
  const enabled = process.env.INTER_PIX_ENABLED === 'true';

  if (!enabled) {
    // Stub — loga e devolve um e2eId sintético determinístico baseado no
    // idempotency_key (facilita testes e posterior reconciliação manual).
    const fakeE2e = `E00000000${Date.now()}${req.idempotency_key.slice(-6).toUpperCase()}`.slice(0, 32);
    console.log('[INTER PIX STUB]', {
      valor: req.valor,
      favorecido: req.destino.favorecido_nome,
      chave: req.destino.chave_pix,
      descricao: req.descricao,
      e2e: fakeE2e,
    });
    return { ok: true, end_to_end_id: fakeE2e, modo: 'stub' };
  }

  // Modo real — chamada à API Inter (endpoint oficial pode variar;
  // ajustar quando destravar as credenciais).
  if (!req.destino.chave_pix) {
    return { ok: false, error: 'Chave PIX obrigatória no modo real' };
  }

  try {
    const token = await getInterToken();
    const agent = getInterAgent();
    const res = await fetch('https://cdpj.partners.bancointer.com.br/banking/v2/pix', {
      method: 'POST',
      // @ts-expect-error — agent custom do Node
      agent,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'x-conta-corrente': process.env.INTER_CONTA_CORRENTE ?? '',
        'x-id-idempotente': req.idempotency_key,
      },
      body: JSON.stringify({
        valor: req.valor.toFixed(2),
        descricao: req.descricao.slice(0, 140),
        destinatario: {
          tipo: 'CHAVE',
          chave: req.destino.chave_pix,
        },
      }),
    });

    if (!res.ok) {
      const txt = await res.text();
      return { ok: false, error: `Inter ${res.status}: ${txt}` };
    }
    const data = await res.json();
    return {
      ok: true,
      end_to_end_id: data.endToEndId ?? data.codigoSolicitacao ?? 'SEM_E2E',
      modo: 'real',
    };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}
