# ALVA Rent

Sistema de gestão de aluguéis do Grupo MERCK — cobrança automática via Banco Inter, portal do inquilino (PWA), histórico e pendências por contrato.

> Produto da família **ALVA ONE** — `alvarent.com.br`
>
> ALVA ONE (raiz, portfólio de negócios e apps): `alvaone.com.br`
> ALVA Rent (este projeto): `alvarent.com.br`
> Próximos: `alvabuild.com.br`, `alvastay.com.br` …

---

## Stack

- **Next.js 14** (App Router) + **TypeScript**
- **Tailwind CSS** + **shadcn/ui**
- **Supabase** (Postgres + Auth + Storage + Edge Functions)
- **API Banco Inter v3** (Cobrança — boleto + PIX, mTLS)
- **Z-API** (WhatsApp Business)
- **Resend** (e-mail transacional)
- **PWA** (manifest + service worker — portal do inquilino instalável)

---

## Setup local — passo a passo

### 1. Pré-requisitos

```bash
# Node 20+
node --version
# pnpm (recomendado) — pode usar npm/yarn também
npm i -g pnpm
# Supabase CLI
npm i -g supabase
```

### 2. Clone e instale

```bash
git clone <seu-repo> alva-rent
cd alva-rent
pnpm install
cp .env.example .env.local
```

### 3. Configure o Supabase

```bash
# Cria projeto novo em https://supabase.com/dashboard
# Copia a URL e as keys pra .env.local
supabase login
supabase link --project-ref <SEU_PROJECT_REF>
supabase db push   # roda as migrations
```

Veja `supabase/migrations/20260418000000_init.sql` — schema completo.

### 4. Configure o Banco Inter

1. Solicite credenciais de API Cobrança v3 PJ no app do Inter (Aplicações → Integrações).
2. Faça download do certificado `.crt` e da chave `.key`.
3. Converta em base64 e cole nas envs:

```bash
base64 -w0 cert.crt
base64 -w0 cert.key
```

4. Configure `.env.local`:

```env
INTER_CLIENT_ID=...
INTER_CLIENT_SECRET=...
INTER_CONTA_CORRENTE=0000000-0
INTER_CERT_PEM_BASE64=...
INTER_KEY_PEM_BASE64=...
```

5. Em Sandbox: `INTER_BASE_URL=https://cdpj-sandbox.partners.uatinter.co`
   Em Produção: `INTER_BASE_URL=https://cdpj.partners.bancointer.com.br`

### 5. Configure WhatsApp (Z-API)

1. Crie conta em https://z-api.io
2. Conecte um número WhatsApp dedicado (ALVA Rent — Cobrança)
3. Copie `instance` e `token` pra `.env.local`

### 6. Configure E-mail (Resend)

1. Conta em https://resend.com
2. Adicione domínio `alvaone.com.br` e configure DKIM/SPF no DNS
3. Copie a API key pra `.env.local`

### 7. Rode o projeto

```bash
pnpm dev
# abre em http://localhost:3000
```

- `/login` — admin (você)
- `/admin/dashboard` — painel principal
- `/portal` — portal do inquilino (PWA)

---

## Deploy

### Frontend (Vercel)

```bash
# Importe o repo na Vercel
# Configure todas as envs em Project Settings → Environment Variables
# Defina os domínios na Vercel:
#   alvarent.com.br        → marketing/landing (apex)
#   www.alvarent.com.br    → redirect 301 pro apex
#   app.alvarent.com.br    → produção (branch main)
#   staging.alvarent.com.br → staging (branch develop)
#
# DNS (no registro do alvarent.com.br):
#   A     @     76.76.21.21         (Vercel apex)
#   CNAME app   cname.vercel-dns.com
#   CNAME www   cname.vercel-dns.com
```

### Edge Functions (Supabase)

```bash
supabase functions deploy cron-emitir-boletos
supabase secrets set --env-file .env.local
```

O cron roda automaticamente todo dia 06:00 BRT (configurado em `supabase/functions/cron-emitir-boletos/index.ts`).

### Webhook do Inter

No painel do Inter, configure o webhook apontando para:
```
https://app.alvarent.com.br/api/webhooks/inter
```

E gere/anote o `INTER_WEBHOOK_SECRET` pra validar a assinatura.

---

## Arquitetura no contexto ALVA ONE

```
alvaone.com.br              → portfólio raiz (Wix ou Next.js): mostra todos os negócios e apps
                              do Cristiano / Grupo MERCK

alvarent.com.br             → este projeto (marketing + app)
   ├── /                    → landing pública
   └── app.alvarent.com.br  → sistema autenticado (admin + portal inquilino PWA)

alvabuild.com.br            → futuro produto de gestão de obras
alvastay.com.br             → futuro produto de hospitalidade/Airbnb
```

Identidade visual compartilhada por toda a família ALVA:
- cores: navy `#0E1E3A` + dourado `#C9A86B`
- fonte: Inter
- componente `<Logo />` reutilizável (já criado em `components/shared/logo.tsx`)
- assinatura: "uma iniciativa ALVA ONE / Grupo MERCK"

No futuro, considere consolidar em **monorepo Turborepo** com pacote `@alva/ui` compartilhado.

---

## Estrutura de pastas

```
alva-rent/
├─ app/                       # Next.js App Router
│  ├─ admin/                  # Área administrativa (você)
│  ├─ portal/                 # Portal do inquilino (PWA)
│  ├─ login/                  # Auth
│  └─ api/                    # API routes + webhooks
├─ components/                # UI compartilhada
├─ lib/                       # Integrações (Supabase, Inter, Z-API, Resend)
├─ supabase/
│  ├─ migrations/             # SQL versionado
│  └─ functions/              # Edge Functions (cron, webhooks)
├─ public/                    # PWA: manifest + ícones + sw.js
└─ types/                     # Tipos TS gerados do Postgres
```

---

## Convenções (consulte `CLAUDE.md` antes de codar)

- **Idempotência**: toda operação de cobrança usa `contrato_id + competência` como chave única.
- **RLS**: inquilinos só veem os próprios dados — todas as queries do portal passam pelo cliente Supabase com JWT.
- **Auditoria**: alterações em `contratos` e `boletos` geram entrada em `audit_log`.
- **Server actions** pra mutações; **`@tanstack/query`** pra leituras.
- **Validação Zod** em todo input que vem do client.

---

## Próximos passos sugeridos

1. Concluir cadastros básicos (imóveis, inquilinos, contratos).
2. Implementar geração manual de boleto via API Inter (botão "Gerar boleto").
3. Ativar cron mensal.
4. Webhook de baixa.
5. Régua de cobrança (3d antes, dia, 3d depois, 7d depois).
6. Portal do inquilino — PWA.
7. Dashboard com KPIs reais.
8. Release `v1.0` 🚀

---

**Mantenedor:** Cristiano Goulart Duarte · Grupo MERCK / ALVA ONE
