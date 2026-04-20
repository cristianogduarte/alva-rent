/**
 * Cliente Z-API (WhatsApp Business via gateway).
 * Documentação: https://developer.z-api.io
 */
import axios from 'axios';

const baseUrl = () =>
  `https://api.z-api.io/instances/${process.env.ZAPI_INSTANCE}/token/${process.env.ZAPI_TOKEN}`;

const headers = () => ({
  'Content-Type': 'application/json',
  ...(process.env.ZAPI_SECURITY_TOKEN ? { 'Client-Token': process.env.ZAPI_SECURITY_TOKEN } : {}),
});

export async function enviarTexto(numero: string, mensagem: string) {
  return axios.post(
    `${baseUrl()}/send-text`,
    { phone: normalizeNumero(numero), message: mensagem },
    { headers: headers(), timeout: 10_000 }
  );
}

export async function enviarPdf(
  numero: string,
  pdfUrl: string,
  legenda?: string,
  fileName = 'boleto.pdf'
) {
  return axios.post(
    `${baseUrl()}/send-document/pdf`,
    {
      phone: normalizeNumero(numero),
      document: pdfUrl,
      fileName,
      caption: legenda ?? '',
    },
    { headers: headers(), timeout: 15_000 }
  );
}

/** "(22) 99999-9999" -> "5522999999999" */
function normalizeNumero(numero: string): string {
  const digits = numero.replace(/\D/g, '');
  if (digits.startsWith('55')) return digits;
  return '55' + digits;
}
