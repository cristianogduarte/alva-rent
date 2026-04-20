import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Logo } from '@/components/shared/logo';

export const dynamic = 'force-dynamic';

export default async function ProprietarioLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login?next=/proprietario');

  const { data: prop } = await supabase
    .from('proprietarios')
    .select('id, nome')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!prop) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-navy-50 px-5">
        <div className="bg-white rounded-xl p-8 shadow-soft max-w-md text-center">
          <div className="text-4xl mb-3">🔒</div>
          <h1 className="text-lg font-bold text-navy-900 mb-2">Conta não vinculada</h1>
          <p className="text-sm text-ink-500 mb-4">
            Seu usuário ({user.email}) ainda não está associado a um proprietário no ALVA Rent.
            Fale com a equipe para liberar o acesso.
          </p>
          <form action="/auth/signout" method="POST">
            <button className="text-xs text-ink-500 hover:underline">Sair</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-navy-50">
      <header className="bg-white border-b border-navy-100 px-5 py-3 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <Logo size="sm" />
          <nav className="hidden md:flex gap-1 text-sm">
            <NavLink href="/proprietario">Dashboard</NavLink>
            <NavLink href="/proprietario/calendario">Calendário</NavLink>
            <NavLink href="/proprietario/repasses">Repasses</NavLink>
            <NavLink href={`/proprietario/relatorio`}>Relatório</NavLink>
          </nav>
        </div>
        <div className="text-right">
          <div className="text-xs font-semibold text-navy-900">{prop.nome}</div>
          <div className="text-[10px] text-ink-500">{user.email}</div>
        </div>
      </header>

      {/* Nav mobile */}
      <nav className="md:hidden flex gap-1 px-3 py-2 bg-white border-b border-navy-100 overflow-x-auto text-xs">
        <NavLink href="/proprietario">Dashboard</NavLink>
        <NavLink href="/proprietario/calendario">Calendário</NavLink>
        <NavLink href="/proprietario/repasses">Repasses</NavLink>
        <NavLink href="/proprietario/relatorio">Relatório</NavLink>
      </nav>

      {children}
    </div>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="px-3 py-1.5 rounded-lg hover:bg-navy-50 text-ink-600 whitespace-nowrap"
    >
      {children}
    </Link>
  );
}
