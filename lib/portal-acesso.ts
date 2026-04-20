/**
 * Geração e envio de acesso ao portal do inquilino.
 *
 * Cria (ou reseta) usuário no Supabase Auth, vincula ao inquilino,
 * e dispara email (Resend) + WhatsApp (Z-API) com credenciais provisórias.
 */
import { createAdminClient } from '@/lib/supabase/admin';
import { resend } from '@/lib/resend';
import { enviarTexto } from '@/lib/zapi';

export interface EnviarAcessoInput {
  inquilinoId: string;
}

export interface EnviarAcessoResult {
  ok: boolean;
  error?: string;
  senhaGerada?: string;
  canais: {
    email: 'enviado' | 'erro' | 'sem_email' | 'sem_config';
    whatsapp: 'enviado' | 'erro' | 'sem_whatsapp' | 'sem_config';
  };
  emailErro?: string;
  whatsappErro?: string;
}

function gerarSenha(): string {
  // 10 chars, mix: maiúscula + minúscula + número + símbolo leve
  const up = 'ABCDEFGHJKMNPQRSTUVWXYZ';
  const lo = 'abcdefghjkmnpqrstuvwxyz';
  const num = '23456789';
  const sym = '!@#$%&*';
  const all = up + lo + num + sym;
  const pick = (s: string) => s[Math.floor(Math.random() * s.length)];
  let senha = pick(up) + pick(lo) + pick(num) + pick(sym);
  for (let i = 0; i < 6; i++) senha += pick(all);
  return senha.split('').sort(() => Math.random() - 0.5).join('');
}

const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.alvarent.com.br';

function mensagemWhatsapp(nome: string, email: string, senha: string): string {
  return (
    `Olá ${nome.split(' ')[0]}! 👋\n\n` +
    `Seu acesso ao Portal ALVA Rent foi criado:\n\n` +
    `🔗 ${appUrl}/login\n` +
    `📧 Email: ${email}\n` +
    `🔑 Senha provisória: ${senha}\n\n` +
    `No primeiro acesso, recomendamos trocar a senha.\n\n` +
    `Qualquer dúvida é só responder por aqui.\n` +
    `— Equipe ALVA Rent`
  );
}

function htmlEmail(nome: string, email: string, senha: string): string {
  return `
    <div style="font-family: Inter, Arial, sans-serif; color:#2A2F3A; max-width:560px; margin:0 auto;">
      <div style="background:#0E1E3A; color:white; padding:24px; border-radius:12px 12px 0 0;">
        <div style="font-size:11px; color:#C9A86B; letter-spacing:1.5px; text-transform:uppercase;">ALVA Rent</div>
        <h1 style="margin:8px 0 0; font-size:22px;">Bem-vindo(a), ${nome.split(' ')[0]}!</h1>
      </div>
      <div style="background:white; padding:24px; border:1px solid #DDE2EB; border-top:none; border-radius:0 0 12px 12px;">
        <p>Seu acesso ao <strong>Portal do Inquilino</strong> foi criado. Lá você acompanha seus boletos, baixa 2ª via, vê o histórico e recebe avisos.</p>

        <div style="background:#F2F4F8; padding:16px; border-radius:8px; margin:20px 0;">
          <div style="font-size:12px; color:#6B7180; margin-bottom:4px;">Link do portal</div>
          <a href="${appUrl}/login" style="color:#0E1E3A; font-weight:600; text-decoration:none;">${appUrl}/login</a>

          <div style="font-size:12px; color:#6B7180; margin:12px 0 4px;">Seu email</div>
          <div style="font-family:monospace; font-size:14px;">${email}</div>

          <div style="font-size:12px; color:#6B7180; margin:12px 0 4px;">Senha provisória</div>
          <div style="font-family:monospace; font-size:16px; background:white; padding:8px 12px; border-radius:6px; border:1px solid #DDE2EB; display:inline-block;"><strong>${senha}</strong></div>
        </div>

        <p style="font-size:13px;">
          <strong>Importante:</strong> no primeiro acesso, recomendamos trocar a senha nas configurações do portal.
        </p>

        <p style="font-size:12px; color:#6B7180; margin-top:24px;">
          Em caso de dúvidas, responda este email.<br>
          <strong>ALVA Rent</strong> · uma iniciativa ALVA ONE
        </p>
      </div>
    </div>
  `;
}

export async function enviarAcessoPortal(
  input: EnviarAcessoInput
): Promise<EnviarAcessoResult> {
  const admin = createAdminClient();

  // 1. Carrega inquilino
  const { data: inq, error: inqErr } = await admin
    .from('inquilinos')
    .select('id, nome, email, whatsapp, telefone, user_id')
    .eq('id', input.inquilinoId)
    .maybeSingle();

  if (inqErr || !inq) {
    return {
      ok: false,
      error: 'Inquilino não encontrado',
      canais: { email: 'erro', whatsapp: 'erro' },
    };
  }

  if (!inq.email && !inq.whatsapp && !inq.telefone) {
    return {
      ok: false,
      error: 'Inquilino não tem email nem WhatsApp cadastrado',
      canais: { email: 'sem_email', whatsapp: 'sem_whatsapp' },
    };
  }

  if (!inq.email) {
    return {
      ok: false,
      error: 'Email é obrigatório pra criar acesso (Supabase Auth exige).',
      canais: { email: 'sem_email', whatsapp: 'sem_whatsapp' },
    };
  }

  // 2. Cria ou reseta senha no auth
  const senha = gerarSenha();
  let userId = inq.user_id as string | null;

  if (!userId) {
    // Tenta criar novo
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: inq.email,
      password: senha,
      email_confirm: true,
      user_metadata: { nome: inq.nome, tipo: 'inquilino' },
    });

    if (createErr) {
      // Talvez já exista esse email no auth mas sem vínculo — tenta buscar
      const { data: listed } = await admin.auth.admin.listUsers();
      const existing = listed?.users.find((u) => u.email === inq.email);
      if (existing) {
        userId = existing.id;
        await admin.auth.admin.updateUserById(userId, { password: senha });
      } else {
        return {
          ok: false,
          error: `Erro ao criar usuário: ${createErr.message}`,
          canais: { email: 'erro', whatsapp: 'erro' },
        };
      }
    } else {
      userId = created.user!.id;
    }

    // Vincula no inquilinos
    await admin.from('inquilinos').update({ user_id: userId }).eq('id', inq.id);
  } else {
    // Já tem user — reseta senha
    const { error: updErr } = await admin.auth.admin.updateUserById(userId, {
      password: senha,
    });
    if (updErr) {
      return {
        ok: false,
        error: `Erro ao resetar senha: ${updErr.message}`,
        canais: { email: 'erro', whatsapp: 'erro' },
      };
    }
  }

  // 3. Envio por email (Resend)
  const canais: EnviarAcessoResult['canais'] = {
    email: 'sem_config',
    whatsapp: 'sem_config',
  };
  let emailErro: string | undefined;
  let whatsappErro: string | undefined;

  if (process.env.RESEND_API_KEY) {
    try {
      await resend().emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'acesso@alvarent.com.br',
        to: inq.email,
        subject: 'Seu acesso ao Portal ALVA Rent',
        html: htmlEmail(inq.nome, inq.email, senha),
      });
      canais.email = 'enviado';
    } catch (e: unknown) {
      canais.email = 'erro';
      emailErro = e instanceof Error ? e.message : 'Erro desconhecido';
    }
  }

  // 4. Envio por WhatsApp (Z-API)
  const numeroWpp = inq.whatsapp || inq.telefone;
  if (numeroWpp && process.env.ZAPI_INSTANCE && process.env.ZAPI_TOKEN) {
    try {
      await enviarTexto(numeroWpp, mensagemWhatsapp(inq.nome, inq.email, senha));
      canais.whatsapp = 'enviado';
    } catch (e: unknown) {
      canais.whatsapp = 'erro';
      whatsappErro = e instanceof Error ? e.message : 'Erro desconhecido';
    }
  } else if (!numeroWpp) {
    canais.whatsapp = 'sem_whatsapp';
  }

  return {
    ok: true,
    senhaGerada: senha,
    canais,
    emailErro,
    whatsappErro,
  };
}
