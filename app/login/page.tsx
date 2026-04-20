'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Logo } from '@/components/shared/logo';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErro(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    });

    if (error) {
      setErro(error.message);
      setLoading(false);
      return;
    }

    router.push('/admin/dashboard');
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-900 to-navy-700 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-soft w-full max-w-md p-8">
        <Logo />
        <h1 className="text-2xl font-bold text-navy-900 mt-6 mb-1">Bem-vindo</h1>
        <p className="text-sm text-ink-500 mb-6">Entre com suas credenciais</p>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-ink-600">E-mail</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-navy-100 rounded-lg text-sm focus:outline-none focus:border-navy-900"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-ink-600">Senha</label>
            <input
              type="password"
              required
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-navy-100 rounded-lg text-sm focus:outline-none focus:border-navy-900"
            />
          </div>
          {erro && (
            <div className="text-xs text-rose-700 bg-rose-50 px-3 py-2 rounded-lg">
              {erro}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-navy-900 hover:bg-navy-700 text-white py-2.5 rounded-lg font-semibold text-sm disabled:opacity-60"
          >
            {loading ? 'Entrando…' : 'Entrar'}
          </button>
          <div className="text-center text-xs text-ink-500">
            É inquilino?{' '}
            <a href="/portal" className="text-gold-600 font-semibold">
              Acesse o portal
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}
