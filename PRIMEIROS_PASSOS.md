# 🚀 ALVA Rent — Primeiros Passos (Windows)

Tudo já está aqui. Esta é a sequência mínima pra você sair do zero ao app rodando localmente.

---

## 1. Abra esta pasta no Claude Code

No PowerShell ou Terminal Windows:

```powershell
cd "C:\Users\crist\ALVA RENT"
claude
```

> O Claude Code vai detectar automaticamente o `CLAUDE.md` da raiz e carregar todo o contexto do projeto. A partir daí, você pode pedir coisas como:
> - "implementa o CRUD completo de imóveis"
> - "cria a tela de detalhe do contrato com as 4 abas"
> - "adiciona testes pra integração com o Inter"

---

## 2. Pré-requisitos (instale uma vez)

Abra o PowerShell como **Administrador** e rode:

```powershell
# Node 20+
winget install OpenJS.NodeJS.LTS

# pnpm (gerenciador rápido)
npm i -g pnpm

# Supabase CLI
npm i -g supabase

# Git (se ainda não tem)
winget install Git.Git
```

Reinicie o terminal depois.

---

## 3. Instale as dependências do projeto

```powershell
cd "C:\Users\crist\ALVA RENT"
pnpm install
```

---

## 4. Configure as variáveis de ambiente

```powershell
copy .env.example .env.local
notepad .env.local
```

Preencha o que tiver pronto agora. Pode deixar Inter/Z-API/Resend vazios e ir preenchendo conforme avança nas integrações. **Apenas Supabase é necessário pra rodar a app**.

---

## 5. Crie e linke o Supabase

1. Acesse https://supabase.com/dashboard
2. Clique em **New Project** (escolha região: South America São Paulo)
3. Anote `URL`, `anon key` e `service_role key` → cole no `.env.local`
4. No terminal:

```powershell
supabase login
supabase link --project-ref <seu-project-ref>
supabase db push
```

O comando `db push` aplica a migration `20260418000000_init.sql` e cria todas as tabelas + RLS + buckets.

---

## 6. Crie seu usuário admin

Vai no Supabase Dashboard → **Authentication** → **Users** → **Add User** → preencha seu e-mail e senha.

Depois, no SQL Editor do Supabase, rode:

```sql
insert into usuarios_admin (user_id, nome, cargo, permissoes, ativo)
select id, 'Cristiano Goulart Duarte', 'CEO', '{visualizar,editar,gerenciar}', true
from auth.users
where email = 'cristiano@merck.com.br';
```

(Ajuste o e-mail.)

---

## 7. Rode o projeto

```powershell
pnpm dev
```

Abre em http://localhost:3000

- `/login` — entre com seu e-mail/senha do Supabase
- `/admin/dashboard` — você vê o painel (vazio, sem dados ainda)
- `/portal` — portal do inquilino (precisa de inquilino cadastrado)

---

## 8. Adicione dados de teste

Pode usar o Claude Code pra isso:

> **Você ao Claude Code:** "Cria seeds em `supabase/seed.sql` com 3 imóveis fictícios, 3 inquilinos e 3 contratos ativos pra eu testar o dashboard."

E rode:

```powershell
supabase db reset   # reaplica migrations + seed
```

---

## 9. Roadmap dos próximos passos (em ordem)

1. ✅ Setup completo (esta página)
2. 🟡 CRUD de imóveis, inquilinos, contratos
3. 🟡 Solicitar credenciais Banco Inter PJ (paralelo)
4. 🟡 Geração manual de boleto via API Inter
5. 🟡 Cron mensal automático
6. 🟡 Webhook de baixa
7. 🟡 Régua de cobrança
8. 🟡 Portal do inquilino completo
9. 🟡 Deploy em produção (Vercel + DNS do alvarent.com.br)

Detalhes em `docs/ROADMAP.md`.

---

## 10. Suporte

- `README.md` — visão geral do projeto
- `CLAUDE.md` — convenções (Claude Code lê automaticamente)
- `docs/ARQUITETURA.md` — diagramas e decisões técnicas
- `docs/INTEGRACAO_INTER.md` — guia completo do Banco Inter
- `docs/DOMINIOS.md` — DNS e estratégia de subdomínios
- `docs/ROADMAP.md` — sprints organizados

---

**Bom trabalho, Cristiano. ALVA Rent está pronto pra ganhar vida. 🚀**
