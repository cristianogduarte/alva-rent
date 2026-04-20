import Link from 'next/link';

export const metadata = { title: 'Configurações' };

export default function ConfiguracoesPage() {
  return (
    <div className="px-8 py-6 max-w-4xl">
      <nav aria-label="Breadcrumb" className="text-xs text-ink-400 mb-2">
        <Link href="/admin/dashboard" className="hover:underline">Admin</Link>
        <span className="mx-1.5">/</span>
        <span className="text-ink-500">Configurações</span>
      </nav>
      <div className="mb-6">
        <div className="text-xs uppercase tracking-wider text-ink-400 font-semibold">Ajustes</div>
        <h1 className="text-2xl font-bold text-navy-900">Configurações</h1>
        <p className="text-sm text-ink-500">Integrações, identidade da administradora e preferências.</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card title="Identidade da administradora" hint="Razão social, CNPJ, endereço e logo nos boletos/e-mails." status="em breve" />
        <Card title="Banco Inter — API" hint="Certificados mTLS, Client ID/Secret, conta corrente." status="aguardando credenciais" />
        <Card title="Z-API (WhatsApp)" hint="Instância e token para envio de boletos." status="não configurado" />
        <Card title="Resend (E-mail)" hint="Domínio verificado, remetente padrão." status="não configurado" />
        <Card title="Régua de cobrança" hint="Dias/templates de lembrete antes, no vencimento e após." status="padrão" />
        <Card title="Usuários admin" hint="Gerenciar equipe com acesso ao sistema." status="1 usuário" />
      </div>
    </div>
  );
}

function Card({ title, hint, status }: { title: string; hint: string; status: string }) {
  return (
    <div className="bg-white rounded-xl shadow-soft p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="text-sm font-semibold text-navy-900">{title}</div>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-navy-50 text-ink-500 uppercase tracking-wider shrink-0">
          {status}
        </span>
      </div>
      <p className="text-xs text-ink-500 mt-1">{hint}</p>
    </div>
  );
}
