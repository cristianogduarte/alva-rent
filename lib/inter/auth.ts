/**
 * Autenticação OAuth 2.0 com mTLS para a API do Banco Inter v3.
 *
 * O Inter exige certificado cliente (.crt) + chave privada (.key) em todas as
 * requisições — e o token tem TTL de ~3600s. Cacheamos em memória.
 */
import https from 'https';
import axios from 'axios';

interface CachedToken {
  value: string;
  expiresAt: number;
}

let cached: CachedToken | null = null;

export function getInterAgent(): https.Agent {
  if (!process.env.INTER_CERT_PEM_BASE64 || !process.env.INTER_KEY_PEM_BASE64) {
    throw new Error('Credenciais mTLS do Inter não configuradas (INTER_CERT_PEM_BASE64 / INTER_KEY_PEM_BASE64)');
  }

  return new https.Agent({
    cert: Buffer.from(process.env.INTER_CERT_PEM_BASE64, 'base64'),
    key: Buffer.from(process.env.INTER_KEY_PEM_BASE64, 'base64'),
  });
}

export async function getInterToken(): Promise<string> {
  if (cached && cached.expiresAt > Date.now() + 60_000) {
    return cached.value;
  }

  const agent = getInterAgent();

  const res = await axios.post(
    `${process.env.INTER_BASE_URL}/oauth/v2/token`,
    new URLSearchParams({
      client_id: process.env.INTER_CLIENT_ID!,
      client_secret: process.env.INTER_CLIENT_SECRET!,
      grant_type: 'client_credentials',
      scope: process.env.INTER_SCOPE!,
    }),
    {
      httpsAgent: agent,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 10_000,
    }
  );

  cached = {
    value: res.data.access_token,
    expiresAt: Date.now() + res.data.expires_in * 1000,
  };

  return cached.value;
}

/** Para testes — limpa o cache */
export function clearInterTokenCache() {
  cached = null;
}
