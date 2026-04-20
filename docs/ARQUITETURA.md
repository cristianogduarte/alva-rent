# Arquitetura — ALVA Rent

## Camadas

```
┌─────────────────────┐         ┌─────────────────────┐
│  Admin Web (Next)   │         │  Inquilino PWA      │
│  /admin/*           │         │  /portal/*          │
└──────────┬──────────┘         └──────────┬──────────┘
           │                               │
           └──────────────┬────────────────┘
                          ▼
              ┌──────────────────────┐
              │  Next API Routes /   │
              │  Server Actions      │
              └──────────┬───────────┘
                         ▼
              ┌──────────────────────┐
              │   Supabase Postgres  │◄──── Storage (PDFs)
              │   + Auth + RLS       │◄──── Auth (CPF/email)
              └──────────┬───────────┘
                         ▼
              ┌──────────────────────┐
              │  Edge Functions      │
              │  cron · webhooks     │
              └──┬─────────┬─────────┘
                 │         │
                 ▼         ▼
        ┌──────────────┐  ┌──────────────────┐
        │ API Inter v3 │  │ Z-API / Resend  │
        │ Cobrança     │  │ WhatsApp / Mail │
        └──────────────┘  └──────────────────┘
```

## Decisões

### Por que Supabase
- Postgres real (não NoSQL com cara de SQL)
- Auth + Storage + Functions no mesmo lugar = menos integrações
- Free tier generoso até dezenas de milhares de requests/mês
- RLS resolve segurança no banco — não dá pra esquecer no código

### Por que Next.js App Router
- Server Components reduzem JS no cliente (importante pro PWA)
- Server Actions eliminam boilerplate de API routes pra mutações
- Edge runtime disponível pra rotas críticas
- Vercel deploy com 1 click

### Por que PWA (e não app nativo)
- Sem App Store/Play Store (custo + tempo + manutenção dupla)
- Inquilino abre o link, clica "Adicionar à tela inicial", pronto
- Push notifications funcionam (Web Push API)
- Service Worker permite uso offline básico
- Se justificar, vira React Native depois sem refazer backend

### Por que Banco Inter
- API Cobrança v3 madura, gratuita pra PJ
- Boleto + PIX no mesmo documento (uma chamada só)
- Webhook nativo de baixa
- mTLS = mais seguro que client_secret simples

## Fluxos críticos

### Geração mensal automática

```
06:00 BRT cron → para cada contrato ativo:
  1. calcular próximo vencimento
  2. se já existe boleto desta competência → skip
  3. emitir cobrança no Inter (POST /cobranca/v3/cobrancas)
  4. consultar dados completos (linha digit., PIX, PDF)
  5. salvar PDF no Storage
  6. insert em `boletos` (com chave única contrato_id+competencia)
  7. insert em `historico` (tipo='boleto_emitido')
  8. enfileirar envio (por canal escolhido pelo inquilino)
```

### Recebimento de pagamento

```
Inter detecta pagamento → POST /api/webhooks/inter
  1. validar assinatura HMAC-SHA256
  2. para cada evento (PAGO/RECEBIDO):
     - update boletos set status='pago', data_pagamento=...
     - insert historico (tipo='boleto_pago')
     - (opcional) notificar admin via push
  3. responder 200 < 5s
```

### Régua de cobrança

```
Cron diário → para cada boleto pendente:
  - calcular dias até/desde vencimento
  - aplicar templates ativos da régua
  - enviar (whatsapp/email/push) usando o canal_envio do contrato
  - registrar em historico
```

## Performance & limites

| Recurso | Limite Free | Quando preocupar |
|---|---|---|
| Supabase Postgres | 500MB | >50.000 contratos ativos |
| Supabase Storage | 1GB | >2.000 PDFs (boletos + contratos) |
| Vercel | 100GB bandwidth/mês | >10.000 sessões/mês |
| Resend | 3.000 e-mails/mês | >300 contratos ativos com envio mensal |
| Z-API | depende do plano | sempre (≈R$ 99/mês) |
| Banco Inter | sem limite documentado | — |

Estimativa: até **150 contratos ativos**, opera no free tier de tudo (exceto Z-API).
