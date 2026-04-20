/**
 * Geração de respostas ao hóspede via Claude (Anthropic).
 *
 * Usa chamada REST simples (sem SDK) pra não inflar o bundle.
 * Se ANTHROPIC_API_KEY não estiver setada, devolve um rascunho stub
 * pra não bloquear o fluxo durante desenvolvimento.
 */

export interface ContextoEstada {
  codigo: string;
  hospede_nome: string;
  imovel_codigo: string;
  imovel_endereco: string;
  data_checkin: string;
  data_checkout: string;
  canal: string;
  wifi_ssid?: string | null;
  wifi_senha?: string | null;
  codigo_fechadura?: string | null;
  instrucoes_acesso?: string | null;
  regras_casa?: string | null;
  checkin_time?: string | null;
  checkout_time?: string | null;
}

export interface MsgHistorico {
  origem: 'hospede' | 'ia' | 'admin';
  texto: string;
  created_at: string;
}

export type RespostaIA =
  | { ok: true; texto: string; modo: 'real' | 'stub' }
  | { ok: false; error: string };

function montarSystemPrompt(ctx: ContextoEstada): string {
  return `Você é a assistente virtual da ALVA Rent, empresa de gestão de aluguéis por temporada.
Seu papel é responder hóspedes de forma cordial, objetiva e em português brasileiro.

Contexto da estadia atual:
- Hóspede: ${ctx.hospede_nome}
- Imóvel: ${ctx.imovel_codigo} — ${ctx.imovel_endereco}
- Check-in: ${ctx.data_checkin} (a partir das ${ctx.checkin_time ?? '15:00'})
- Check-out: ${ctx.data_checkout} (até as ${ctx.checkout_time ?? '11:00'})
- Canal de origem da reserva: ${ctx.canal}
${ctx.wifi_ssid ? `- Wi-Fi: ${ctx.wifi_ssid} / senha ${ctx.wifi_senha ?? '(não cadastrada)'}` : ''}
${ctx.codigo_fechadura ? `- Código da fechadura: ${ctx.codigo_fechadura}` : ''}
${ctx.instrucoes_acesso ? `- Instruções de acesso: ${ctx.instrucoes_acesso}` : ''}
${ctx.regras_casa ? `- Regras da casa: ${ctx.regras_casa}` : ''}

Regras:
1. Seja curto e direto — máximo 4 frases por resposta, exceto se for instrução passo-a-passo.
2. Nunca invente informações que não estão no contexto. Se não souber, diga que vai verificar.
3. Se o hóspede pedir código de fechadura/Wi-Fi e esses dados estão disponíveis acima, forneça.
4. Para problemas estruturais (vazamento, elétrica, fechadura quebrada), recomende contato imediato pela equipe e mencione que um técnico será acionado.
5. Nunca negocie valores, descontos ou reembolsos — escalone pra um humano.
6. Não use emojis em excesso. No máximo 1 por mensagem quando apropriado.`;
}

export async function gerarResposta(
  ctx: ContextoEstada,
  historico: MsgHistorico[],
  mensagemDoHospede: string,
): Promise<RespostaIA> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    // Stub — responde com uma estrutura básica pro admin editar
    const temCheckin = /check.?in|hora.*entrar|chegar/i.test(mensagemDoHospede);
    const temWifi = /wi.?fi|internet|senha.*rede/i.test(mensagemDoHospede);
    let stub = `Olá ${ctx.hospede_nome.split(' ')[0]}! `;
    if (temCheckin) {
      stub += `O check-in é a partir das ${ctx.checkin_time ?? '15:00'} no dia ${ctx.data_checkin}. `;
      if (ctx.codigo_fechadura) stub += `O código da fechadura é ${ctx.codigo_fechadura}. `;
    } else if (temWifi && ctx.wifi_ssid) {
      stub += `A rede Wi-Fi é "${ctx.wifi_ssid}" e a senha é "${ctx.wifi_senha ?? '—'}". `;
    } else {
      stub += `Recebi sua mensagem e estou verificando. Retorno em breve.`;
    }
    return { ok: true, texto: stub, modo: 'stub' };
  }

  const messages = [
    ...historico.map((h) => ({
      role: h.origem === 'hospede' ? ('user' as const) : ('assistant' as const),
      content: h.texto,
    })),
    { role: 'user' as const, content: mensagemDoHospede },
  ];

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-latest',
        max_tokens: 400,
        system: montarSystemPrompt(ctx),
        messages,
      }),
    });
    if (!res.ok) {
      const txt = await res.text();
      return { ok: false, error: `Anthropic ${res.status}: ${txt.slice(0, 200)}` };
    }
    const data = await res.json();
    const texto = (data.content?.[0]?.text ?? '').trim();
    if (!texto) return { ok: false, error: 'Resposta vazia da IA' };
    return { ok: true, texto, modo: 'real' };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}
