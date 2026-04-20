/**
 * Operações de Cobrança v3 — emissão, consulta, PDF, cancelamento.
 *
 * Documentação: developers.bancointer.com.br
 */
import axios from 'axios';
import { getInterAgent, getInterToken } from './auth';
import type {
  EmitirBoletoInput,
  InterBoletoCompleto,
  InterCobrancaResponse,
} from './types';

function baseHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    'x-conta-corrente': process.env.INTER_CONTA_CORRENTE!,
    'Content-Type': 'application/json',
  };
}

/** Emite uma nova cobrança (boleto + PIX) */
export async function emitirBoleto(
  input: EmitirBoletoInput
): Promise<InterCobrancaResponse> {
  const token = await getInterToken();
  const agent = getInterAgent();

  const payload = {
    seuNumero: input.seuNumero,
    valorNominal: Number(input.valor.toFixed(2)),
    dataVencimento: input.dataVencimento,
    numDiasAgenda: input.numDiasAgenda ?? 60,
    pagador: {
      ...input.pagador,
      cpfCnpj: input.pagador.cpfCnpj.replace(/\D/g, ''),
      cep: input.pagador.cep.replace(/\D/g, ''),
    },
    ...(input.mensagem ? { mensagem: { linha1: input.mensagem } } : {}),
    multa: { codigo: 'PERCENTUAL', taxa: input.multaPct ?? 2 },
    mora: { codigo: 'TAXAMENSAL', taxa: input.jurosPct ?? 1 },
  };

  const res = await axios.post(
    `${process.env.INTER_BASE_URL}/cobranca/v3/cobrancas`,
    payload,
    { httpsAgent: agent, headers: baseHeaders(token), timeout: 15_000 }
  );

  return res.data as InterCobrancaResponse;
}

/** Consulta uma cobrança e retorna boleto + PIX completo */
export async function consultarCobranca(
  codigoSolicitacao: string
): Promise<InterBoletoCompleto> {
  const token = await getInterToken();
  const agent = getInterAgent();

  const res = await axios.get(
    `${process.env.INTER_BASE_URL}/cobranca/v3/cobrancas/${codigoSolicitacao}`,
    { httpsAgent: agent, headers: baseHeaders(token), timeout: 10_000 }
  );

  return res.data as InterBoletoCompleto;
}

/** Baixa o PDF da cobrança (retorna base64) */
export async function baixarPdfBoleto(codigoSolicitacao: string): Promise<Buffer> {
  const token = await getInterToken();
  const agent = getInterAgent();

  const res = await axios.get(
    `${process.env.INTER_BASE_URL}/cobranca/v3/cobrancas/${codigoSolicitacao}/pdf`,
    { httpsAgent: agent, headers: baseHeaders(token), timeout: 20_000 }
  );

  // O Inter retorna { pdf: "base64..." }
  return Buffer.from(res.data.pdf, 'base64');
}

/** Cancela uma cobrança */
export async function cancelarCobranca(
  codigoSolicitacao: string,
  motivo = 'SOLICITADO_CLIENTE'
): Promise<void> {
  const token = await getInterToken();
  const agent = getInterAgent();

  await axios.post(
    `${process.env.INTER_BASE_URL}/cobranca/v3/cobrancas/${codigoSolicitacao}/cancelar`,
    { motivoCancelamento: motivo },
    { httpsAgent: agent, headers: baseHeaders(token), timeout: 10_000 }
  );
}
