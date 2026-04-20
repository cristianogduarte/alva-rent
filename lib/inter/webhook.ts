/**
 * Validação de assinatura do webhook do Banco Inter.
 *
 * O Inter assina o body com HMAC-SHA256 usando o secret configurado no painel.
 * O header pode variar (consulte a documentação atual): assumimos x-inter-signature.
 */
import crypto from 'crypto';

export function verifyInterSignature(
  rawBody: string,
  signature: string | null
): boolean {
  if (!signature) return false;
  if (!process.env.INTER_WEBHOOK_SECRET) {
    throw new Error('INTER_WEBHOOK_SECRET não configurado');
  }

  const expected = crypto
    .createHmac('sha256', process.env.INTER_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');

  // timingSafeEqual evita timing attack
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;

  return crypto.timingSafeEqual(a, b);
}
