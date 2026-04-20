'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { enviarAcessoPortal } from './actions';

interface Props {
  inquilinoId: string;
  jaTemAcesso: boolean;
  temEmail: boolean;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

type Feedback = {
  ok: boolean;
  msg: string;
  detalhes?: string[];
  senha?: string;
};

export function EnviarAcessoButton({
  inquilinoId,
  jaTemAcesso,
  temEmail,
  variant = 'primary',
  size = 'md',
  className,
}: Props) {
  const [pending, start] = useTransition();
  const [fb, setFb] = useState<Feedback | null>(null);

  const label = jaTemAcesso ? '🔄 Reenviar acesso' : '📨 Enviar acesso ao portal';
  const title = jaTemAcesso
    ? 'Gera nova senha provisória e reenvia ao inquilino'
    : 'Cria usuário no portal e envia senha provisória por email + WhatsApp';

  function onClick() {
    if (!temEmail) {
      setFb({
        ok: false,
        msg: 'Inquilino precisa ter email cadastrado pra criar acesso.',
      });
      return;
    }

    const confirmacao = jaTemAcesso
      ? 'Isso vai gerar uma NOVA senha e invalidar a anterior. Continuar?'
      : 'Isso vai criar acesso ao portal e enviar email + WhatsApp. Continuar?';

    if (!confirm(confirmacao)) return;

    start(async () => {
      const r = await enviarAcessoPortal(inquilinoId);
      if (!r.ok) {
        setFb({ ok: false, msg: r.error || 'Erro desconhecido' });
        return;
      }
      const detalhes: string[] = [];
      if (r.canais.email === 'enviado') detalhes.push('✅ Email enviado');
      else if (r.canais.email === 'erro') detalhes.push(`❌ Email: ${r.emailErro}`);
      else if (r.canais.email === 'sem_config') detalhes.push('⚠️ Email não configurado (Resend)');

      if (r.canais.whatsapp === 'enviado') detalhes.push('✅ WhatsApp enviado');
      else if (r.canais.whatsapp === 'erro') detalhes.push(`❌ WhatsApp: ${r.whatsappErro}`);
      else if (r.canais.whatsapp === 'sem_config') detalhes.push('⚠️ WhatsApp não configurado (Z-API)');
      else if (r.canais.whatsapp === 'sem_whatsapp') detalhes.push('⚠️ Inquilino sem WhatsApp cadastrado');

      setFb({
        ok: true,
        msg: jaTemAcesso ? 'Nova senha gerada!' : 'Acesso criado com sucesso!',
        detalhes,
        senha: r.senhaGerada,
      });
    });
  }

  return (
    <div className={className}>
      <Button
        onClick={onClick}
        disabled={pending || !temEmail}
        variant={variant}
        size={size}
        title={title}
      >
        {pending ? 'Enviando...' : label}
      </Button>

      {fb && (
        <div
          className={`mt-3 p-3 rounded-lg border text-sm ${
            fb.ok
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <div className="font-semibold">{fb.msg}</div>
          {fb.detalhes && (
            <ul className="mt-2 space-y-0.5 text-xs">
              {fb.detalhes.map((d, i) => (
                <li key={i}>{d}</li>
              ))}
            </ul>
          )}
          {fb.senha && (
            <div className="mt-2 text-xs">
              <span className="text-ink-500">Senha provisória gerada: </span>
              <code className="bg-white border border-ink-200 px-2 py-0.5 rounded font-mono select-all">
                {fb.senha}
              </code>
              <span className="block text-ink-400 mt-1">
                (guarde caso precise passar manualmente — já enviamos pelos canais acima)
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
