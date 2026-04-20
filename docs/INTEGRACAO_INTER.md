# Integração Banco Inter — guia operacional

## 1. Solicitação de credenciais (PJ)

1. App Inter Empresas → **Aplicações** → **Nova Aplicação**
2. Selecione escopos:
   - `boleto-cobranca.read`
   - `boleto-cobranca.write`
   - `webhook.read`
   - `webhook.write`
3. Faça download do **certificado.crt** e da **chave.key** (UMA VEZ — guarde com cuidado)
4. Anote `client_id` e `client_secret`

## 2. Configurar `.env.local`

```bash
# Converter cert/key pra base64 (Linux/Mac):
base64 -w0 cert.crt   # Linux
base64 -i cert.crt    # Mac

# Cole o resultado em:
INTER_CERT_PEM_BASE64=...
INTER_KEY_PEM_BASE64=...
INTER_CLIENT_ID=...
INTER_CLIENT_SECRET=...
INTER_CONTA_CORRENTE=0000000-0
INTER_BASE_URL=https://cdpj-sandbox.partners.uatinter.co  # sandbox
```

## 3. Sandbox vs Produção

| Ambiente | URL Base | Uso |
|---|---|---|
| Sandbox | `https://cdpj-sandbox.partners.uatinter.co` | Testes — não cobra de verdade |
| Produção | `https://cdpj.partners.bancointer.com.br` | Cobranças reais |

## 4. Configurar webhook (após primeiro boleto criado em sandbox)

```bash
curl -X PUT https://cdpj.partners.bancointer.com.br/cobranca/v3/cobrancas/webhook \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-conta-corrente: $CC" \
  -H "Content-Type: application/json" \
  --cert cert.crt --key cert.key \
  -d '{"webhookUrl":"https://app.alvarent.com.br/api/webhooks/inter"}'
```

## 5. Erros comuns

| Erro | Causa | Solução |
|---|---|---|
| `invalid_client` | mTLS falhando | Verifique base64 do cert/key — sem quebras de linha |
| `403 forbidden` no webhook | Assinatura HMAC incorreta | Confira `INTER_WEBHOOK_SECRET` |
| `unique constraint` em boletos | Cron rodou 2x no mesmo dia | É esperado — chave idempotente bloqueia duplicidade |
| `invalid_scope` | Aplicação sem permissão | Adicione o escopo no painel Inter |

## 6. Limites e SLAs

- Geração de boleto: ~500ms a 2s
- Webhook chega em até 5min após pagamento
- Token TTL: ~3600s (renovamos a cada hora)

## 7. Documentação oficial

- Portal: https://developers.bancointer.com.br
- Cobrança v3: https://developers.bancointer.com.br/reference/cobrancav3
- Suporte: developers@bancointer.com.br
