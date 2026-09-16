import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

// ---------------------------------------------------------------------------
// Lazy-initialised SMTP transport (same globalThis pattern as prisma.ts)
// ---------------------------------------------------------------------------
const globalForMail = globalThis as unknown as { mailer?: Transporter };

function getTransporter(): Transporter | null {
  if (globalForMail.mailer) return globalForMail.mailer;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT) || 465;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    if (process.env.NODE_ENV === "development") {
      // In dev, let emails fall through to the console instead of crashing.
      return null;
    }
    throw new Error(
      "SMTP_HOST, SMTP_USER and SMTP_PASS must be set. " +
        "On Hostinger, add them in the panel's environment variables.",
    );
  }

  globalForMail.mailer = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  return globalForMail.mailer;
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------
function from(): string {
  return `"Kidoclassic Mall" <${process.env.SMTP_USER}>`;
}

/** Wrap body content in the branded shell used by every transactional email. */
function brandedHtml(body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background-color:#FFF4F9;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#FFF4F9;padding:32px 0;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
        <!-- Header -->
        <tr>
          <td style="background-color:#F964AB;padding:28px 32px;text-align:center;">
            <h1 style="margin:0;font-size:22px;color:#ffffff;letter-spacing:0.5px;">Kidoclassic Mall</h1>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            ${body}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:20px 32px;text-align:center;border-top:1px solid #fce4ec;">
            <p style="margin:0;font-size:12px;color:#999999;">
              &copy; ${new Date().getFullYear()} Kidoclassic Mall. All&nbsp;rights&nbsp;reserved.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Send a password-reset email containing a 5-digit OTP code.
 */
export async function sendPasswordResetEmail(
  to: string,
  code: string,
): Promise<void> {
  const subject = "Your Kidoclassic password reset code";

  const html = brandedHtml(`
    <p style="margin:0 0 16px;font-size:16px;color:#333333;">
      Hi there 👋
    </p>
    <p style="margin:0 0 24px;font-size:15px;color:#555555;line-height:1.5;">
      We received a request to reset your password. Use the code below to
      continue. It expires in 15&nbsp;minutes.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td align="center">
        <div style="display:inline-block;padding:16px 40px;background-color:#FFF4F9;border:2px solid #F964AB;border-radius:8px;font-size:32px;font-weight:bold;letter-spacing:8px;color:#89083C;">
          ${code}
        </div>
      </td></tr>
    </table>
    <p style="margin:24px 0 0;font-size:13px;color:#999999;line-height:1.5;">
      If you didn't request this, you can safely ignore this email.
    </p>
  `);

  await send(to, subject, html);
}

/**
 * Send an email-verification email with a clickable link.
 */
export async function sendVerificationEmail(
  to: string,
  verifyUrl: string,
): Promise<void> {
  const subject = "Verify your Kidoclassic email";

  const html = brandedHtml(`
    <p style="margin:0 0 16px;font-size:16px;color:#333333;">
      Welcome to Kidoclassic Mall! 🎉
    </p>
    <p style="margin:0 0 24px;font-size:15px;color:#555555;line-height:1.5;">
      Please verify your email address by clicking the button below.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td align="center">
        <a href="${verifyUrl}"
           style="display:inline-block;padding:14px 36px;background-color:#F964AB;color:#ffffff;font-size:16px;font-weight:bold;text-decoration:none;border-radius:8px;">
          Verify my email
        </a>
      </td></tr>
    </table>
    <p style="margin:24px 0 8px;font-size:13px;color:#999999;line-height:1.5;">
      Or copy and paste this link into your browser:
    </p>
    <p style="margin:0;font-size:13px;color:#F964AB;word-break:break-all;">
      ${verifyUrl}
    </p>
    <p style="margin:24px 0 0;font-size:13px;color:#999999;line-height:1.5;">
      If you didn't create an account, you can safely ignore this email.
    </p>
  `);

  await send(to, subject, html);
}

// ---------------------------------------------------------------------------
// Internal send helper
// ---------------------------------------------------------------------------
async function send(
  to: string,
  subject: string,
  html: string,
): Promise<void> {
  const transporter = getTransporter();

  if (!transporter) {
    // Dev fallback — no SMTP configured, log to console.
    console.log(
      "\n📧 [DEV MAIL] ─────────────────────────────────────────",
      `\n   To:      ${to}`,
      `\n   Subject: ${subject}`,
      `\n   HTML:    (${html.length} chars)`,
      "\n────────────────────────────────────────────────────────\n",
    );
    return;
  }

  await transporter.sendMail({
    from: from(),
    to,
    subject,
    html,
  });
}
