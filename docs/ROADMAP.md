# ROADMAP — ALVA Rent

Sequência sugerida de implementação. Não pular para sprints à frente sem ter os anteriores estáveis.

## Sprint 1 — Fundação (semana 1)

- [x] Scaffold Next.js + Tailwind + Supabase
- [x] Migration inicial com schema + RLS
- [x] Layout admin com sidebar
- [x] Tela de login (admin)
- [x] Seeds de dev (3 imóveis + 3 inquilinos + 3 contratos ativos — `supabase/seed.sql`)
- [ ] Solicitar credenciais Banco Inter (em paralelo, leva 5–10d)

## Sprint 2 — Cadastros + cobrança manual (semana 2)

- [x] CRUD de imóveis (lista, criar, editar, excluir) — falta upload de fotos
- [x] CRUD de inquilinos (lista, criar, editar, excluir)
- [x] CRUD de contratos (vincula imóvel + inquilino + termos)
- [x] Tela de detalhe do contrato com tabs (Boletos / Histórico / Pendências)
- [ ] Botão "Gerar boleto manualmente" → chama API Inter → salva PDF no Storage

## Sprint 3 — Cobrança automática (semana 3)

- [x] Edge function `cron-emitir-boletos` (esqueleto pronto)
- [ ] Schedule via pg_cron
- [ ] Envio por e-mail (Resend) com template HTML
- [ ] Envio por WhatsApp (Z-API) com PDF + linha digitável + PIX
- [x] Webhook `/api/webhooks/inter` (esqueleto pronto)
- [ ] Status real-time no front via Supabase Realtime

## Sprint 4 — Operação (semana 4–5)

- [ ] Histórico/timeline cronológica do contrato
- [ ] Pendências (chamados internos + pelo inquilino)
- [ ] Régua de cobrança automática (3d antes, dia, 3d depois, 7d depois)
- [ ] Dashboard MERCK com KPIs reais
- [ ] Exportação CSV pra contador

## Sprint 5 — Portal do Inquilino (semana 6)

- [ ] Auth por CPF (custom signin)
- [ ] PWA: manifest + service worker (já configurados)
- [ ] Tela inicial do portal (já feita)
- [ ] 2ª via de boleto (download PDF + cópia PIX)
- [ ] Abrir chamado de manutenção (com upload de foto)
- [ ] Push notifications (Web Push API)
- [ ] Convite por WhatsApp ("Crie sua senha")

## Sprint 6 — Inteligência (semana 7–8)

- [ ] Reajuste automático IGPM/IPCA (puxa do Bacen Open Data)
- [ ] Alerta 60d/30d antes do fim do contrato com sugestão de novo valor
- [ ] DRE simplificado por imóvel (receita − IPTU − cond. − manutenção)
- [ ] Relatório anual pra IR
- [ ] Acesso multiusuário com permissões granulares

## Após v1.0

- Migrar Z-API → Meta Cloud API oficial
- App mobile nativo via React Native (compartilhando 70% da lógica)
- Landing institucional em `alvarent.com.br` (rota `/` do mesmo Next.js, antes do app)
- Portfólio ALVA ONE em `alvaone.com.br` (Wix — vitrine dos negócios e apps)
- Integrações: Bling/Conta Azul, integração com cartórios para reconhecimento de firma digital
- ALVA Rent SaaS — comercialização para outras imobiliárias
