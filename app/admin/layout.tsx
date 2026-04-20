import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/admin/sidebar';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Verifica se é admin (existe em usuarios_admin)
  const { data: admin } = await supabase
    .from('usuarios_admin')
    .select('user_id, nome, ativo')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!admin?.ativo) {
    redirect('/portal');
  }

  return (
    <div className="flex min-h-screen bg-navy-50">
      <Sidebar nomeAdmin={admin.nome} email={user.email ?? ''} />
      <main className="flex-1 overflow-x-hidden">{children}</main>
    </div>
  );
}
