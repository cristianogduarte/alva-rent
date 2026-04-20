'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from '@/components/shared/logo';
import { cn } from '@/lib/utils';

type Item = { href: string; label: string; icon: string };
type Group = { label?: string; itens: Item[] };

const grupos: Group[] = [
  {
    itens: [
      { href: '/admin/dashboard', label: 'Dashboard', icon: '📊' },
      { href: '/admin/imoveis', label: 'Imóveis', icon: '🏢' },
      { href: '/admin/inquilinos', label: 'Inquilinos', icon: '👤' },
      { href: '/admin/contratos', label: 'Contratos', icon: '📑' },
      { href: '/admin/proprietarios', label: 'Proprietários', icon: '🏛️' },
    ],
  },
  {
    label: 'Short Stay',
    itens: [
      { href: '/admin/estadas', label: 'Estadas', icon: '🗓️' },
      { href: '/admin/estadas/calendario', label: 'Calendário', icon: '📅' },
      { href: '/admin/hospedagem', label: 'Hospedagem', icon: '🏨' },
      { href: '/admin/ical', label: 'iCal sync', icon: '🔄' },
      { href: '/admin/booking', label: 'Booking API', icon: '🌐' },
      { href: '/admin/ota-conciliacao', label: 'Conciliação OTA', icon: '💱' },
      { href: '/admin/limpeza', label: 'Limpezas', icon: '🧹' },
      { href: '/admin/marketing', label: 'CRM / Marketing', icon: '🎯' },
      { href: '/admin/inbox', label: 'Inbox', icon: '💬' },
    ],
  },
  {
    label: 'Operações',
    itens: [
      { href: '/admin/manutencao', label: 'Manutenção', icon: '🔧' },
      { href: '/admin/precificacao', label: 'Precificação', icon: '💰' },
    ],
  },
  {
    label: 'Financeiro',
    itens: [
      { href: '/admin/repasses/fechamento', label: 'Fechamento mensal', icon: '💸' },
    ],
  },
  {
    itens: [
      { href: '/admin/relatorios', label: 'Relatórios', icon: '📈' },
      { href: '/admin/configuracoes', label: 'Configurações', icon: '⚙️' },
    ],
  },
];

export function Sidebar({ nomeAdmin, email }: { nomeAdmin: string; email: string }) {
  const path = usePathname();

  return (
    <aside className="w-64 bg-white border-r border-navy-100 flex flex-col">
      <div className="px-5 py-5 border-b border-navy-100">
        <Logo size="sm" />
      </div>

      <nav className="flex-1 px-3 py-4 space-y-4">
        {grupos.map((g, gi) => (
          <div key={gi} className="space-y-1">
            {g.label && (
              <div className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-ink-400">
                {g.label}
              </div>
            )}
            {g.itens.map((item) => {
              const ativo = path.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'block px-3 py-2 rounded-lg text-sm hover:bg-navy-50',
                    ativo && 'bg-navy-900 text-white hover:bg-navy-900'
                  )}
                >
                  <span className="mr-2">{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-navy-100">
        <div className="bg-navy-50 rounded-lg p-3 text-xs">
          <div className="font-semibold text-navy-900">{nomeAdmin}</div>
          <div className="text-ink-500 truncate">{email}</div>
          <div className="mt-2 text-[10px] text-ink-400">Administrador</div>
        </div>
      </div>
    </aside>
  );
}
