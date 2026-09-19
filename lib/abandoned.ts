import "server-only";
import { getPrisma } from "@/lib/prisma";
import { storeSettings } from "@/lib/settings-store";
import { sendAbandonedCheckoutEmail } from "@/lib/mail";
import { siteUrl } from "@/lib/site-url";

/**
 * A checkout that was started and left behind. Two things count, because a
 * shopper can stop at two different points:
 *
 *  - "cart": items in a basket that has gone quiet. Only reachable if we know
 *    who they are, which for a guest we usually do not.
 *  - "order": an order that reached the payment step and was never paid. These
 *    always carry an email and a phone number, so they are the ones actually
 *    worth chasing.
 */
export type AbandonedKind = "cart" | "order";

export type AbandonedEntry = {
  kind: AbandonedKind;
  id: string;
  email: string | null;
  name: string | null;
  phone: string | null;
  totalKobo: number;
  itemCount: number;
  lastActivity: Date;
  followUpSentAt: Date | null;
};

function cutoffFrom(afterHours: number): Date {
  return new Date(Date.now() - afterHours * 60 * 60 * 1000);
}

/**
 * Everything currently considered abandoned, newest activity first.
 *
 * `afterHours` defaults to the configured wait, but the admin screen passes 0
 * so staff can see what is pending before the automatic mail would go.
 */
export async function abandonedCheckouts(
  afterHours?: number
): Promise<AbandonedEntry[]> {
  const prisma = getPrisma();
  const settings = await storeSettings();
  const cutoff = cutoffFrom(afterHours ?? settings.abandoned.afterHours);

  const [carts, orders] = await Promise.all([
    prisma.cart.findMany({
      where: {
        updatedAt: { lt: cutoff },
        items: { some: {} },
      },
      include: {
        user: { select: { email: true, firstName: true, lastName: true, phone: true } },
        items: { include: { variant: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 100,
    }),
    prisma.order.findMany({
      where: {
        status: "PENDING",
        createdAt: { lt: cutoff },
      },
      include: { items: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  const cartEntries: AbandonedEntry[] = carts.map((cart) => ({
    kind: "cart",
    id: cart.id,
    email: cart.email ?? cart.user?.email ?? null,
    name:
      [cart.user?.firstName, cart.user?.lastName].filter(Boolean).join(" ") ||
      null,
    phone: cart.user?.phone ?? null,
    totalKobo: cart.items.reduce(
      (sum, item) => sum + item.variant.priceKobo * item.quantity,
      0
    ),
    itemCount: cart.items.reduce((sum, item) => sum + item.quantity, 0),
    lastActivity: cart.updatedAt,
    followUpSentAt: cart.recoveryEmailSentAt,
  }));

  const orderEntries: AbandonedEntry[] = orders.map((order) => ({
    kind: "order",
    id: order.id,
    email: order.email,
    name: order.recipientName,
    phone: order.phone,
    totalKobo: order.totalKobo,
    itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
    lastActivity: order.createdAt,
    followUpSentAt: order.recoveryEmailSentAt,
  }));

  return [...cartEntries, ...orderEntries].sort(
    (a, b) => b.lastActivity.getTime() - a.lastActivity.getTime()
  );
}

/**
 * Sends one follow-up and stamps the row.
 *
 * `force` is what the admin's own "Send follow-up" button passes: staff asking
 * for it explicitly should get it even if one already went automatically. The
 * automatic sweep never forces, so nobody is mailed twice by the machine.
 */
export async function sendAbandonedFollowUp(
  kind: AbandonedKind,
  id: string,
  options: { force?: boolean } = {}
): Promise<{ ok: boolean; reason?: string }> {
  const prisma = getPrisma();

  if (kind === "cart") {
    const cart = await prisma.cart.findUnique({
      where: { id },
      include: {
        user: { select: { email: true } },
        items: { include: { variant: true } },
      },
    });

    if (!cart || cart.items.length === 0) return { ok: false, reason: "empty" };

    const email = cart.email ?? cart.user?.email ?? null;
    if (!email) return { ok: false, reason: "no-email" };
    if (cart.recoveryEmailSentAt && !options.force) {
      return { ok: false, reason: "already-sent" };
    }

    const totalKobo = cart.items.reduce(
      (sum, item) => sum + item.variant.priceKobo * item.quantity,
      0
    );

    await sendAbandonedCheckoutEmail(email, {
      resumeUrl: `${siteUrl()}/cart`,
      totalKobo,
      itemCount: cart.items.reduce((sum, item) => sum + item.quantity, 0),
    });

    // Raw, so Prisma's @updatedAt does not fire. `updatedAt` is what decides
    // whether a basket counts as abandoned, and it has to keep meaning "when
    // the shopper last touched this" — stamping it through the ORM would mark
    // the cart as freshly active and drop it straight out of this list.
    await prisma.$executeRaw`UPDATE Cart SET recoveryEmailSentAt = NOW(3) WHERE id = ${id}`;

    return { ok: true };
  }

  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: true },
  });

  if (!order) return { ok: false, reason: "missing" };
  // Paid in the meantime: chasing it now would be worse than not chasing it.
  if (order.status !== "PENDING") return { ok: false, reason: "not-pending" };
  if (order.recoveryEmailSentAt && !options.force) {
    return { ok: false, reason: "already-sent" };
  }

  await sendAbandonedCheckoutEmail(order.email, {
    resumeUrl: `${siteUrl()}/checkout/pay/${order.id}`,
    totalKobo: order.totalKobo,
    itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
  });

  await prisma.order.update({
    where: { id },
    data: { recoveryEmailSentAt: new Date() },
  });

  return { ok: true };
}

/**
 * The automatic sweep. Does nothing unless the admin switched it on, and skips
 * anything already followed up, so it is safe to run on any schedule.
 */
export async function runAbandonedSweep(): Promise<{
  enabled: boolean;
  sent: number;
  skipped: number;
}> {
  const settings = await storeSettings();
  if (!settings.abandoned.enabled) {
    return { enabled: false, sent: 0, skipped: 0 };
  }

  const entries = await abandonedCheckouts(settings.abandoned.afterHours);

  let sent = 0;
  let skipped = 0;

  for (const entry of entries) {
    if (entry.followUpSentAt || !entry.email) {
      skipped += 1;
      continue;
    }

    const result = await sendAbandonedFollowUp(entry.kind, entry.id);
    if (result.ok) sent += 1;
    else skipped += 1;
  }

  return { enabled: true, sent, skipped };
}
