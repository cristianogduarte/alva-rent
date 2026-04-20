import Link from 'next/link';

export const metadata = { title: 'Relatórios' };

const cards = [
  {
    href: '/admin/relatorios/empresa',
    title: 'Gestão da ALVA Rent',
    desc:
      'Visão operacional da administradora: faturamento, taxa retida, MRR por proprietário, inadimplência, ocupação.',
    for: 'Para você e a equipe',
    icon: '📊',
  },
  {
    href: '/admin/relatorios/contador',
    title: 'Contábil / Fiscal',
    desc:
      'Receita de locação por imóvel e por período. Exportável em CSV pro contador fechar a contabilidade.',
    for: 'Para o contador',
    icon: '📒',
  },
  {
    href: '/admin/relatorios/inquilino-ir',
    title: 'Informe de Rendimentos (IR)',
    desc:
      'Comprovante anual de aluguéis pagos por inquilino, com CNPJ do locador e valores mensais. Usado na declaração do IR.',
    for: 'Para entregar ao inquilino',
    icon: '🧾',
  },
];

export default function RelatoriosPage() {
  return (
    <div className="px-8 py-6">
      <nav aria-label="Breadcrumb" className="text-xs text-ink-400 mb-2">
        <Link href="/admin/dashboard" className="hover:underline">Admin</Link>
        <span className="mx-1.5">/</span>
        <span className="text-ink-500">Relatórios</span>
      </nav>

      <div className="mb-6">
        <div className="text-xs uppercase tracking-wider text-ink-400 font-semibold">Relatórios</div>
        <h1 className="text-2xl font-bold text-navy-900">Central de relatórios</h1>
        <p className="text-sm text-ink-500">
          Escolha o destinatário: equipe, contador ou inquilino.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {cards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="bg-white rounded-xl shadow-soft p-6 hover:shadow-md transition-shadow focus:outline-none focus:ring-2 focus:ring-navy-900/20"
          >
            <div className="text-3xl mb-3">{c.icon}</div>
            <div className="text-xs uppercase tracking-wider text-ink-400 font-semibold">{c.for}</div>
            <div className="text-base font-semibold text-navy-900 mt-1">{c.title}</div>
            <p className="text-xs text-ink-500 mt-2">{c.desc}</p>
            <div className="text-xs text-navy-900 font-semibold mt-4">abrir →</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
