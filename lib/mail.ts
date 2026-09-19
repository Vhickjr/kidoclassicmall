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

/**
 * Send one message to many subscribers.
 *
 * Recipients go in BCC so nobody receives a list of everyone else's address,
 * and it is sent in batches because most SMTP providers cap recipients per
 * message. Hostinger's shared SMTP also rate-limits, so this is deliberately
 * unhurried rather than firing everything at once.
 */
export async function sendBroadcast(
  recipients: string[],
  subject: string,
  body: string
): Promise<{ sent: number; failed: number; error?: string }> {
  const transporter = getTransporter();

  if (!transporter) {
    console.log("[mail] broadcast skipped (no SMTP in dev):", subject);
    return { sent: 0, failed: 0, error: "SMTP is not configured." };
  }

  // Paragraphs typed in the admin become paragraphs in the email.
  const html = brandedHtml(
    body
      .split(/\n{2,}/)
      .map(
        (paragraph) =>
          `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#2B2127;">${paragraph
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/\n/g, "<br/>")}</p>`
      )
      .join("")
  );

  const BATCH = 40;
  let sent = 0;
  let failed = 0;

  for (let i = 0; i < recipients.length; i += BATCH) {
    const batch = recipients.slice(i, i + BATCH);

    try {
      await transporter.sendMail({
        from: from(),
        to: from(),
        bcc: batch,
        subject,
        html,
        text: body,
      });
      sent += batch.length;
    } catch (error) {
      console.error("[mail] broadcast batch failed", error);
      failed += batch.length;
    }
  }

  return { sent, failed };
}

// ---------------------------------------------------------------------------
// Order receipts and abandoned-checkout follow-ups
// ---------------------------------------------------------------------------

/** Naira, from kobo, formatted for an email body. */
function money(kobo: number): string {
  return `₦${(kobo / 100).toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Escapes text coming from the database before it goes into an email body. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type ReceiptOrder = {
  id: string;
  email: string;
  status: string;
  paymentMethod: string | null;
  subtotalKobo: number;
  discountKobo: number;
  deliveryKobo: number;
  totalKobo: number;
  recipientName: string | null;
  addressLine: string | null;
  line2: string | null;
  city: string | null;
  state: string | null;
  items: {
    productName: string;
    size: string | null;
    color: string | null;
    quantity: number;
    priceKobo: number;
  }[];
};

function receiptRows(order: ReceiptOrder): string {
  return order.items
    .map((item) => {
      const variant = [item.size, item.color].filter(Boolean).join(" · ");
      return `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #f4e4ec;font-size:14px;color:#333333;">
            ${escapeHtml(item.productName)}
            ${variant ? `<br/><span style="font-size:12px;color:#999999;">${escapeHtml(variant)}</span>` : ""}
            <br/><span style="font-size:12px;color:#999999;">Qty ${item.quantity}</span>
          </td>
          <td style="padding:10px 0;border-bottom:1px solid #f4e4ec;font-size:14px;color:#333333;text-align:right;white-space:nowrap;">
            ${money(item.priceKobo * item.quantity)}
          </td>
        </tr>`;
    })
    .join("");
}

function totalsRows(order: ReceiptOrder): string {
  const line = (label: string, value: string, bold = false) => `
    <tr>
      <td style="padding:4px 0;font-size:${bold ? "16px" : "14px"};color:${bold ? "#89083C" : "#666666"};${bold ? "font-weight:bold;" : ""}">${label}</td>
      <td style="padding:4px 0;font-size:${bold ? "16px" : "14px"};color:${bold ? "#89083C" : "#666666"};text-align:right;${bold ? "font-weight:bold;" : ""}">${value}</td>
    </tr>`;

  return [
    line("Subtotal", money(order.subtotalKobo)),
    order.discountKobo > 0
      ? line("Discount", `-${money(order.discountKobo)}`)
      : "",
    line(
      "Delivery",
      order.deliveryKobo === 0 ? "Free" : money(order.deliveryKobo)
    ),
    line("Total", money(order.totalKobo), true),
  ].join("");
}

/**
 * The customer's receipt.
 *
 * `kind` decides the wording only — the figures are identical either way, so a
 * "placed" mail and the later "paid" mail cannot disagree about what was owed.
 */
export async function sendOrderReceipt(
  order: ReceiptOrder,
  kind: "placed" | "paid",
): Promise<void> {
  const reference = order.id.slice(-8).toUpperCase();

  const paid = kind === "paid";
  const subject = paid
    ? `Payment received — order ${reference}`
    : `We got your order — ${reference}`;

  const cashOnDelivery = order.paymentMethod === "cash-on-delivery";

  const opening = paid
    ? "Thank you — your payment has been received and your order is confirmed."
    : cashOnDelivery
      ? "Thank you! Your order is placed. You will pay when it is delivered to you."
      : "Thank you! Your order is placed. We will confirm again as soon as your payment is received.";

  const address = [
    order.recipientName,
    order.addressLine,
    order.line2,
    [order.city, order.state].filter(Boolean).join(", "),
  ]
    .filter(Boolean)
    .map((part) => escapeHtml(String(part)))
    .join("<br/>");

  const html = brandedHtml(`
    <p style="margin:0 0 16px;font-size:16px;color:#333333;">
      ${paid ? "Payment received ✅" : "Order confirmed 🛍️"}
    </p>
    <p style="margin:0 0 8px;font-size:15px;color:#555555;line-height:1.5;">
      ${opening}
    </p>
    <p style="margin:0 0 24px;font-size:13px;color:#999999;">
      Order reference <strong style="color:#89083C;">${reference}</strong>
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
      ${receiptRows(order)}
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      ${totalsRows(order)}
    </table>

    ${
      address
        ? `<p style="margin:0 0 4px;font-size:13px;color:#999999;">Delivering to</p>
           <p style="margin:0 0 24px;font-size:14px;color:#555555;line-height:1.5;">${address}</p>`
        : ""
    }

    <p style="margin:0;font-size:13px;color:#999999;line-height:1.5;">
      Questions about this order? Just reply to this email.
    </p>
  `);

  await send(order.email, subject, html);
}

/**
 * The nudge for a basket or an unpaid order that was left behind.
 */
export async function sendAbandonedCheckoutEmail(
  to: string,
  options: { resumeUrl: string; totalKobo: number; itemCount: number },
): Promise<void> {
  const { resumeUrl, totalKobo, itemCount } = options;

  const subject = "You left something behind";

  const html = brandedHtml(`
    <p style="margin:0 0 16px;font-size:16px;color:#333333;">
      Still thinking it over? 💖
    </p>
    <p style="margin:0 0 24px;font-size:15px;color:#555555;line-height:1.5;">
      You left ${itemCount === 1 ? "an item" : `${itemCount} items`} worth
      ${money(totalKobo)} behind. We have kept everything for you — pick up
      right where you stopped.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td align="center">
        <a href="${resumeUrl}" style="display:inline-block;padding:14px 36px;background-color:#F964AB;border-radius:999px;color:#ffffff;font-size:15px;text-decoration:none;">
          Finish checking out
        </a>
      </td></tr>
    </table>

    <p style="margin:24px 0 0;font-size:13px;color:#999999;line-height:1.5;">
      Sizes do sell out, so it is worth not waiting too long.
    </p>
  `);

  await send(to, subject, html);
}
