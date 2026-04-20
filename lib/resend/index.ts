/**
 * Cliente Resend para envio transacional de e-mail.
 */
import { Resend } from 'resend';

let _resend: Resend | null = null;

export function resend(): Resend {
  if (!_resend) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY não configurada');
    }
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

export interface EnviarEmailBoletoInput {
  to: string;
  inquilinoNome: string;
  competencia: string; // "abril/2026"
  vencimento: string; // "10/04/2026"
  valor: string; // "R$ 4.200,00"
  linhaDigitavel: string;
  pixCopiaCola: string;
  pdfBuffer: Buffer;
}

export async function enviarEmailBoleto(input: EnviarEmailBoletoInput) {
  const html = `
    <div style="font-family: Inter, Arial, sans-serif; color: #2A2F3A; max-width: 560px; margin: 0 auto;">
      <div style="background:#0E1E3A; color:white; padding:24px; border-radius:12px 12px 0 0;">
        <div style="font-size:11px; color:#C9A86B; letter-spacing:1.5px; text-transform:uppercase;">ALVA Rent</div>
        <h1 style="margin:8px 0 0; font-size:22px;">Seu boleto de aluguel</h1>
      </div>
      <div style="background:white; padding:24px; border:1px solid #DDE2EB; border-top:none; border-radius:0 0 12px 12px;">
        <p>Olá <strong>${input.inquilinoNome}</strong>,</p>
        <p>Segue o boleto referente a <strong>${input.competencia}</strong>.</p>
        <table style="width:100%; margin:16px 0; font-size:14px;">
          <tr><td style="color:#6B7180;">Vencimento</td><td style="text-align:right;"><strong>${input.vencimento}</strong></td></tr>
          <tr><td style="color:#6B7180;">Valor</td><td style="text-align:right;"><strong>${input.valor}</strong></td></tr>
        </table>
        <div style="background:#F2F4F8; padding:12px; border-radius:8px; word-break:break-all; font-family: monospace; font-size:12px;">
          ${input.linhaDigitavel}
        </div>
        <p style="font-size:12px; color:#6B7180; margin-top:16px;">
          Pague também via PIX usando o código copia e cola abaixo:
        </p>
        <div style="background:#F2F4F8; padding:12px; border-radius:8px; word-break:break-all; font-family: monospace; font-size:11px;">
          ${input.pixCopiaCola}
        </div>
        <p style="font-size:12px; color:#6B7180; margin-top:24px;">
          Em caso de dúvidas, responda este e-mail ou acesse o portal do inquilino.<br>
          <strong>ALVA Rent</strong> · uma iniciativa ALVA ONE / Grupo MERCK
        </p>
      </div>
    </div>
  `;

  return resend().emails.send({
    from: process.env.RESEND_FROM_EMAIL || 'cobranca@alvarent.com.br',
    to: input.to,
    subject: `Boleto de aluguel — vencimento ${input.vencimento}`,
    html,
    attachments: [{ filename: 'boleto.pdf', content: input.pdfBuffer }],
  });
}
