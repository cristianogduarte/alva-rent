# Estratégia de Domínios — Família ALVA ONE

## Mapa atual

| Domínio | Função | Stack | Status |
|---|---|---|---|
| `alvaone.com.br` | Portfólio raiz do Cristiano / Grupo MERCK. Vitrine dos negócios e apps. | Wix (recomendado) ou Next.js | A criar |
| `alvarent.com.br` | Produto ALVA Rent — marketing + app | Next.js (este repo) | Em desenvolvimento |
| `alvabuild.com.br` | Futuro: gestão de obras | TBD | Planejado |
| `alvastay.com.br` | Futuro: hospitalidade/Airbnb | TBD | Planejado |

## Estrutura de subdomínios do `alvarent.com.br`

```
alvarent.com.br             → landing pública (rota / do Next.js)
www.alvarent.com.br         → redirect 301 → apex
app.alvarent.com.br         → sistema autenticado (rotas /admin e /portal)
staging.alvarent.com.br     → ambiente de homologação
```

### Por que separar `alvarent.com.br` de `app.alvarent.com.br`

1. **SEO**: a landing é estática, super rápida, indexada pelo Google.
2. **Robustez**: se o app ficar fora do ar por um deploy, a landing continua acessível e passa segurança.
3. **Cookies isolados**: cookies de autenticação no subdomínio `app.` não vazam pra landing.
4. **Cache agressivo**: a landing pode ter `Cache-Control` de 1 dia; o app não.

## Configuração na Vercel

1. Project Settings → Domains → Add:
   - `alvarent.com.br` (production, branch `main`)
   - `www.alvarent.com.br` (Redirect to `alvarent.com.br`)
   - `app.alvarent.com.br` (production, branch `main`)
   - `staging.alvarent.com.br` (preview, branch `develop`)

2. Vercel mostra os DNS records que você precisa criar.

## DNS no Registro.br (ou onde você registrou o domínio)

```
Registro          Tipo    Valor                       TTL
@                 A       76.76.21.21                 3600
www               CNAME   cname.vercel-dns.com.       3600
app               CNAME   cname.vercel-dns.com.       3600
staging           CNAME   cname.vercel-dns.com.       3600

# Verificação (se a Vercel pedir):
_vercel           TXT     vc-domain-verify=...        3600

# E-mail (após configurar no Resend):
@                 TXT     "v=spf1 include:amazonses.com ~all"
resend._domainkey TXT     <chave DKIM do Resend>
_dmarc            TXT     "v=DMARC1; p=quarantine; rua=mailto:dmarc@alvarent.com.br"
```

## Roteamento no Next.js

O Next.js detecta o host na requisição e renderiza diferentes layouts:

```typescript
// middleware.ts (já implementado no scaffold)
const host = request.headers.get('host');

// alvarent.com.br        → rotas /(landing)/*
// app.alvarent.com.br    → rotas /admin/* e /portal/*
```

(Implementar o split de host quando a landing for criada — Sprint 4 ou após v1.0.)

## ALVA ONE (alvaone.com.br) — sugestão Wix

Como você só vai postar conteúdo institucional (sobre você, seus negócios, links pros apps), Wix é o caminho mais barato em tempo:

- Template "Portfolio" ou "Business"
- Páginas: Home / Sobre / Negócios (Construmad, JLM, etc.) / Apps (ALVA Rent, futuros) / Contato
- Cada card de "App" tem botão "Acessar" que linka pro domínio próprio (`alvarent.com.br`)
- Custa ~R$ 39/mês plano Combo + domínio (que você já tem)

Quando o portfólio for crescer muito, vale migrar pra Next.js também — mas pra começar, Wix resolve em 1 final de semana.
