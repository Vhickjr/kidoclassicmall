import "server-only";
import type { Prisma } from "@prisma/client";

/** Just enough of a Prisma client to run inside or outside a transaction. */
type Db = Pick<Prisma.TransactionClient, "cart" | "cartItem">;

/**
 * Takes the paid-for quantities off the shopper's basket.
 *
 * Called when an order is actually settled, never when it is merely placed —
 * a basket has to survive an abandoned or failed payment so she comes back to
 * her things.
 *
 * Quantities are subtracted rather than the cart being wiped: if she carried
 * on shopping in another tab while the payment window was open, those newer
 * items are not hers to lose.
 */
export async function removePurchasedFromBasket(
  db: Db,
  order: {
    sessionId: string | null;
    items: { variantId: string; quantity: number }[];
  }
): Promise<void> {
  if (!order.sessionId) return;

  const cart = await db.cart.findUnique({
    where: { sessionId: order.sessionId },
    include: { items: true },
  });

  if (!cart) return;

  for (const line of order.items) {
    const inCart = cart.items.find((item) => item.variantId === line.variantId);
    if (!inCart) continue;

    if (inCart.quantity > line.quantity) {
      await db.cartItem.update({
        where: { id: inCart.id },
        data: { quantity: inCart.quantity - line.quantity },
      });
    } else {
      await db.cartItem.delete({ where: { id: inCart.id } });
    }
  }
}
