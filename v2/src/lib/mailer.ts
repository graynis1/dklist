import "server-only";
import nodemailer from "nodemailer";

/**
 * Real email delivery via the same Brevo SMTP account v1's MyMailer already
 * uses in production (not a new service) - closes the "codes shown on-screen
 * instead of emailed" gap that registerUser()/requestPasswordReset() left
 * deliberately deferred earlier this session. Config comes from env vars
 * only (.env.local, gitignored) - never hardcode credentials in source.
 * Falls back to isMailConfigured()===false in any environment (e.g. a fresh
 * clone without .env.local) so registration/reset stay usable without mail.
 */
export function isMailConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD);
}

/**
 * Temporary kill switch (customer's explicit ask, 2026-09-04): Brevo is
 * silently dropping mail (accepts every send with `250 OK`, never actually
 * delivers - see PLAN.md's "Mail delivery genuinely broken" entry for the
 * full investigation), and new members must not be blocked by an email
 * verification step nobody can currently complete. Registration now skips
 * straight to a full, usable account - no /dogrula redirect, no pending
 * code, no blocked login.
 *
 * Flip back to `true` once real delivery is confirmed working again (a new
 * provider, or Brevo fixed) - everything this gates (the /dogrula page,
 * its resend button, the pendingCode column, registerUser()'s email send)
 * is left fully intact and starts working again immediately, no other
 * code changes needed anywhere.
 */
export const EMAIL_VERIFICATION_REQUIRED = false;

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  }
  return transporter;
}

export async function sendMail(to: string, subject: string, html: string): Promise<void> {
  if (!isMailConfigured()) return;
  await getTransporter().sendMail({
    from: process.env.MAIL_FROM ?? process.env.SMTP_USER,
    to,
    subject,
    html,
  });
}

export async function sendVerificationEmail(mail: string, username: string, code: string): Promise<void> {
  await sendMail(
    mail,
    "DKList - Hesap Doğrulama",
    `<p>Merhaba ${username},</p>
     <p>DKList'e hoş geldiniz. Hesabınızı doğrulamak için aşağıdaki kodu kullanın:</p>
     <p style="font-size:20px;font-weight:bold;letter-spacing:2px;">${code}</p>
     <p>Bu isteği siz yapmadıysanız bu e-postayı yok sayabilirsiniz.</p>`,
  );
}

export async function sendPasswordResetEmail(mail: string, username: string, code: string): Promise<void> {
  await sendMail(
    mail,
    "DKList - Şifre Sıfırlama",
    `<p>Merhaba ${username},</p>
     <p>Şifrenizi sıfırlamak için aşağıdaki kodu kullanın:</p>
     <p style="font-size:20px;font-weight:bold;letter-spacing:2px;">${code}</p>
     <p>Bu isteği siz yapmadıysanız bu e-postayı yok sayabilirsiniz, şifreniz değişmeyecektir.</p>`,
  );
}

export async function sendTwoFactorCodeEmail(mail: string, username: string, code: string): Promise<void> {
  await sendMail(
    mail,
    "DKList - Giriş Doğrulama Kodu",
    `<p>Merhaba ${username},</p>
     <p>Giriş yapmak için aşağıdaki kodu kullanın (10 dakika geçerlidir):</p>
     <p style="font-size:20px;font-weight:bold;letter-spacing:2px;">${code}</p>
     <p>Bu girişi siz yapmadıysanız şifrenizi hemen değiştirin.</p>`,
  );
}

export async function sendNewPasswordEmail(mail: string, username: string, newPassword: string): Promise<void> {
  await sendMail(
    mail,
    "DKList - Yeni Şifreniz",
    `<p>Merhaba ${username},</p>
     <p>Yeni şifreniz aşağıdadır. Giriş yaptıktan sonra profil ayarlarınızdan dilediğiniz şifreyi belirleyebilirsiniz:</p>
     <p style="font-size:18px;font-weight:bold;">${newPassword}</p>`,
  );
}
