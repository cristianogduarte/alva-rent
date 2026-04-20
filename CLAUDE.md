# CLAUDE.md — guia para o Claude Code

Este arquivo é lido automaticamente pelo Claude Code ao abrir este repositório. Contém o contexto, as decisões de arquitetura e as convenções do projeto **ALVA Rent**.

## O produto

ALVA Rent é o sistema de gestão de aluguéis do Grupo MERCK, primeiro produto da família **ALVA ONE**.
- Marketing/landing: `alvarent.com.br`
- App autenticado: `app.alvarent.com.br`
- Família ALVA ONE (portfólio raiz): `alvaone.com.br`

**Personas:**
- **Admin**: Cristiano e equipe MERCK. Gerencia imóveis, inquilinos, contratos, boletos.
- **Inquilino**: paga aluguel mensal. Acessa via PWA mobile-first.

## Decisões de arquitetura (não revogar sem discussão)

1. **Next.js 14 App Router** — Server Components por default, Client Components só onde precisa de interatividade.
2. **Supabase como banco único** — não introduzir Redis, MongoDB ou outro store sem necessidade clara.
3. **Postgres + RLS** — Row Level Security é obrigatória em toda tabela acessada pelo portal do inquilino.
4. **API Banco Inter v3** com mTLS — autenticação via certificado, NUNCA expor credenciais no client.
5. **Idempotência** — `contrato_id + competência` é a chave única de toda cobrança.
6. **PWA, não app nativo** — manifest + service worker. Sem React Native até justificar.
7. **TypeScript strict** — nada de `any` solto.

## Convenções de código

### Imports
```typescript
// 1. React/Next
import { useState } from 'react';
// 2. Bibliotecas externas
import { z } from 'zod';
// 3. Lib interna (alias @/)
import { supabase } from '@/lib/supabase/client';
// 4. Components
import { Button } from '@/components/ui/button';
// 5. Tipos
import type { Contrato } from '@/types/database';
```

### Server Actions (mutações)
- Sempre em arquivo separado `actions.ts` com `'use server'` no topo.
- Validar input com Zod antes de tocar no banco.
- Retornar `{ ok: true, data }` ou `{ ok: false, error }`.

### Server Components (leituras)
- Default. Use `lib/supabase/server.ts` (cookies-aware).
- Não use `useState` em Server Component.

### Client Components
- Marque com `'use client'` no topo.
- Use `@tanstack/query` pra fetch + cache.
- Use `lib/supabase/client.ts` (browser client).

### Forms
```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
const schema = z.object({ ... });
```

## Estrutura de pastas (NÃO MUDAR sem alinhar)

```
app/
  admin/              ← rotas autenticadas como admin
  portal/             ← rotas autenticadas como inquilino (PWA)
  api/                ← API routes (webhooks principalmente)
  login/

lib/
  supabase/{client,server,admin}.ts   ← 3 clients diferentes, ATENÇÃO ao escolher
  inter/{auth,cobranca,webhook,types}.ts
  zapi/index.ts
  resend/index.ts
  utils.ts

components/
  ui/                 ← shadcn/ui (botões, inputs, cards)
  admin/              ← específicos do admin (sidebar, topbar)
  shared/             ← compartilhado (logo, headers)

supabase/
  migrations/         ← SQL versionado, nome com timestamp
  functions/          ← Edge Functions (Deno)
```

## Padrões obrigatórios

### Banco Inter
- **NUNCA** chame a API Inter direto do client. Sempre via Server Action ou Edge Function.
- **SEMPRE** use `seuNumero = ${contrato_id}-${YYYYMM}` como chave idempotente.
- Renove o token via cache (60s antes de expirar).

### Webhooks
- Validar HMAC com `INTER_WEBHOOK_SECRET` antes de processar.
- Responder `200` rápido. Processamento pesado em fila/edge function async.

### LGPD
- Inquilinos têm direito de exportar e excluir dados.
- Implementar `lib/lgpd/anonimizar.ts` quando for necessário.

### Logs
- Erros: `console.error` + Sentry (em produção).
- Auditoria: insert em `audit_log` para toda mutação em `contratos`, `boletos`, `inquilinos`.

## Comandos úteis

```bash
pnpm dev                              # dev server
pnpm build                            # build de produção
pnpm lint                             # eslint
pnpm format                           # prettier

# Supabase
supabase db reset                     # reseta o banco local
supabase db push                      # aplica migrations no remoto
supabase functions deploy <name>      # deploy de uma edge function
supabase gen types typescript --linked > types/database.ts  # gera types
```

## O que NÃO fazer

- ❌ Adicionar dependências sem justificar (cada peso conta no PWA).
- ❌ Usar `any` em TypeScript.
- ❌ Bypassar RLS com `service_role_key` no client.
- ❌ Salvar PDF de boleto no banco (sempre no Storage).
- ❌ Hardcodar valores monetários — sempre vir do banco.
- ❌ Mudar a chave de idempotência (`seuNumero`) sem migração planejada.

## Roadmap de implementação

Seguir a ordem em `docs/ROADMAP.md`. Não pular pra Sprint 4 sem ter Sprint 1–3 funcionando.

## Quando tiver dúvida

1. Consulte os docs em `/docs`:
   - `docs/ARQUITETURA.md`
   - `docs/INTEGRACAO_INTER.md`
   - `docs/ROADMAP.md`
2. Olhe a tabela em `supabase/migrations/20260418000000_init.sql` — é a fonte da verdade do schema.
3. Pergunte ao Cristiano antes de fazer mudança estrutural.
