/** Tipos da API Inter — Cobrança v3 */

export interface InterPagador {
  cpfCnpj: string;
  tipoPessoa: 'FISICA' | 'JURIDICA';
  nome: string;
  endereco: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade: string;
  uf: string;
  cep: string;
  email?: string;
  ddd?: string;
  telefone?: string;
}

export interface EmitirBoletoInput {
  seuNumero: string;
  valor: number;
  dataVencimento: string; // YYYY-MM-DD
  pagador: InterPagador;
  mensagem?: string;
  multaPct?: number; // default 2
  jurosPct?: number; // default 1 ao mês
  numDiasAgenda?: number; // default 60
}

export interface InterCobrancaResponse {
  codigoSolicitacao: string;
  nossoNumero?: string;
  seuNumero: string;
  situacao?: 'A_RECEBER' | 'PAGO' | 'CANCELADO' | 'EXPIRADO';
}

export interface InterBoletoCompleto {
  cobranca: {
    codigoSolicitacao: string;
    seuNumero: string;
    valorNominal: number;
    dataVencimento: string;
    nossoNumero: string;
    situacao: string;
  };
  boleto: {
    nossoNumero: string;
    codigoBarras: string;
    linhaDigitavel: string;
  };
  pix: {
    txid: string;
    pixCopiaECola: string;
  };
}

export interface InterWebhookEvent {
  codigoSolicitacao: string;
  seuNumero: string;
  situacao: 'A_RECEBER' | 'PAGO' | 'RECEBIDO' | 'CANCELADO' | 'EXPIRADO' | 'MARCADO_RECEBIDO';
  dataHoraSituacao: string;
  valorNominal: number;
  valorTotalRecebido?: number;
  origemRecebimento?: 'BOLETO' | 'PIX';
}
