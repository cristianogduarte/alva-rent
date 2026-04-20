# MEMÓRIA — ALVA Rent

> Arquivo de contexto humano + IA. Consolida decisões, ideias e pendências do projeto.
> Para regras de código, ver `CLAUDE.md`. Para o plano ativo, ver `C:\Users\crist\.claude\plans\elegant-wiggling-kitten.md`.

---

## 1. Visão do produto

- **ALVA Rent** é o primeiro produto da **ALVA ONE** — empresa própria do **Cristiano**.
- ⚠️ NÃO confundir com **Grupo MERCK** (empresa da família — distinta). Nada no sistema deve fazer referência a "Grupo MERCK".
- Domínios:
  - Marketing: `alvarent.com.br`
  - App autenticado: `app.alvarent.com.br`
  - Portfólio raiz: `alvaone.com.br`
- Personas:
  - **Admin** — Cristiano e equipe. Gerencia imóveis, contratos, boletos, estadas.
  - **Inquilino** (long-stay) — paga aluguel mensal via PWA `/portal`.
  - **Hóspede** (short-stay) — acessa `/estadia/[token]` após reserva.

---

## 2. Modelo de negócio (4 quadrantes)

|                    | Long-stay (mensal)     | Short-stay (Airbnb/Booking) |
|--------------------|------------------------|------------------------------|
| **Imóvel próprio** | ALVA aluga e gerencia  | ALVA opera temporada própria |
| **Terceiro**       | Proprietário terceiriza gestão | Proprietário terceiriza operação |

**Ativos reais a integrar**:
- **Construmad** — construtora do Cristiano; múltiplos imóveis PJ sob gestão ALVA.
- **Hotel em Cabo Frio** — unidades entram como imóveis short-stay.
- Proprietários pessoa física com 1–N imóveis, mix long + short.

**Comissão ALVA**: 10% padrão (campo `proprietarios.comissao_pct`), configurável.

---

## 3. Decisões de arquitetura (não revogar sem discussão)

1. **Next.js 14 App Router** — Server Components default.
2. **Supabase** como banco único (Postgres + Auth + Storage + RLS).
3. **RLS obrigatória** em toda tabela acessada pelo portal do inquilino/hóspede. Helper `is_admin()`.
4. **Banco Inter v3** com mTLS — NUNCA no client.
5. **Idempotência**: `contrato_id + competência` (long) / `EST-{estada_id}-{pag_id}` (short).
6. **PWA** — sem React Native.
7. **TypeScript strict** — zero `any`.
8. **Modalidade por imóvel**: `imoveis.modalidade ∈ {long_stay, short_stay}` (sem híbrido v1).
9. **Repasses unificados**: tabela `repasses` com `boleto_id XOR estada_pagamento_id`.

---

## 4. Integrações

| Serviço | Uso | Status |
|---|---|---|
| **Inter v3** (mTLS) | PIX + boleto + repasse ao proprietário | credenciais pendentes (bloqueio externo) |
| **Z-API** | WhatsApp inbound/outbound (IA hóspede) | planejada |
| **Resend** | Emails transacionais | planejada |
| **iCal 2-way** | Airbnb/Booking sincronização de calendário | Etapa 4 (preferencial v1) |
| **Email parsing Airbnb** | Inbox dedicada → parser → cria estada (traz nome do hóspede) | Etapa 4.5 |
| **CSV payouts Airbnb/Booking** | Conciliação financeira | Etapa 5 |
| **Booking Connectivity API** | Channel manager oficial Booking | Etapa 10 |
| **Airbnb Partner API** | só com 100+ listings — **fora de escopo** | N/A |
| **Claude / OpenAI** | IA de atendimento WhatsApp | Etapa 9 |
| **Open Finance (Pluggy/Belvo)** | conciliação bancária automática | v2 opcional |

---

## 5. Decisões de UX

- **WhatsApp único** para todas as unidades — a IA identifica o contexto pelo `imovel.codigo` citado na mensagem inicial e pelo histórico da estada ativa.
- **Cartão do hóspede** — A4 paisagem, 1 página, com QR Wi-Fi (formato `WIFI:T:WPA;S:...;P:...;;`) + QR WhatsApp (`wa.me/{num}?text=Olá! Estou na unidade {codigo}`). **Não** manual de 10 páginas.
- **Kit padrão ALVA** — rotação de 3 jogos (1 em uso + 1 reserva + 1 lavando):
  - Toalhas banho: 3× capacidade
  - Toalhas rosto: 2× capacidade
  - Jogos cama casal: 2× qtd_camas_casal
  - Jogos cama solteiro: 2× (camas_solteiro + sofa_cama)
  - Travesseiros: 2× capacidade
  - Edredons/cobertores: 1 por cama
- **Amenities padrão** (estoque mínimo na unidade): sabonete, shampoo, condicionador, papel higiênico (4 × banheiros, mín 4), detergente, sabão em pó.
- **Logo** — `/public/brand/alva-mark.png`. Componente `components/shared/logo.tsx` com prop `size` e `variant`.

---

## 6. Credenciais / segredos

⚠️ **Nunca commitar senhas neste arquivo ou em qualquer outro do repo**.

**`.env.local`** (não versionado):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `INTER_CLIENT_ID`, `INTER_CLIENT_SECRET`
- `INTER_CERT_PATH`, `INTER_CERT_KEY_PATH`
- `INTER_WEBHOOK_SECRET`
- `ZAPI_INSTANCE`, `ZAPI_TOKEN`
- `RESEND_API_KEY`
- `ANTHROPIC_API_KEY` (IA)

**Onde vivem**:
- Dev: `.env.local` na raiz.
- Prod: variáveis de ambiente do host (Vercel ou similar).
- Supabase: painel → Settings → API.
- Inter: certificado PFX/PEM em local seguro fora do repo.

**Placeholders a substituir**:
- WhatsApp ALVA: `5521000000000` em `app/admin/hospedagem/[imovelId]/manual/page.tsx` — mover para tabela `configuracoes`.

**Pendências de segurança**:
- Rotacionar DB password do Supabase.
- Rotacionar Secret Key (JWT).
- Deletar scripts temporários usados no setup inicial.

---

## 7. Roadmap

- ✅ Etapa 1 — Schema short-stay + modalidade em imóveis
- ✅ Etapa 2 — Ficha Hospedagem + kit sugerido + cartão do hóspede
- 🔜 Etapa 3 — CRUD de estadas + hóspedes
- Etapa 4 — iCal 2-way
- Etapa 4.5 — Email parsing Airbnb
- Etapa 5 — Conciliação de payouts (CSV)
- Etapa 6 — Relatórios + **relatório consolidado por proprietário** + fechamento mensal
- Etapa 7 — Reserva direta (site público + Inter PIX)
- Etapa 8 — Área do hóspede `/estadia/[token]`
- Etapa 9 — IA atendimento WhatsApp
- Etapa 10 — Booking Connectivity API
- Polish — KPIs, calendário visual, integração hotel Cabo Frio

---

## 8. Convenções operacionais

- **PowerShell**: sempre prefixar comandos com `cd "C:\Users\crist\ALVA RENT"`.
- **Scoop** para instalar ferramentas (Supabase CLI, pnpm). Rodar PowerShell **não-admin**.
- **Migrations**: timestamp no nome, ordem cronológica. Quando migration antiga bloquear `db push`, usar `supabase migration repair --status applied <timestamp>`.
- **Sem `gen_random_bytes`** (pgcrypto opcional) — usar `replace(gen_random_uuid()::text, '-', '')`.
- Nunca referenciar "Grupo MERCK" no código ou na UI.

---

## 9. Ideias futuras (backlog)

- **Dynamic pricing** short-stay (baseado em ocupação + sazonalidade Cabo Frio).
- **Fechadura eletrônica** integrada (hóspede recebe código temporário).
- **Gateway de cartão internacional** para reserva direta de gringos.
- **App do proprietário** (visão do dono de imóvel em tempo real).
- **Multi-empresa** dentro do ALVA ONE — ex.: Construmad e Hotel como tenants separados com dashboards próprios.
- **Integração contábil** direta com sistema do contador (em vez de CSV).
