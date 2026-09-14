import { cookies } from "next/headers";
import { getPrisma } from "@/lib/prisma";

export const CART_COOKIE = "kido_cart";

/** Until there are logins, this cookie is the shopper's whole identity — it ties
 *  together their cart, their address book and their order history. */
export async function readSessionId(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(CART_COOKIE)?.value ?? null;
}

/** Reads the current cart for rendering. Pages cannot set cookies, so this
 *  never creates one — that happens in the cart server actions. */
export async function readCart() {
  const jar = await cookies();
  const sessionId = jar.get(CART_COOKIE)?.value;

  if (!sessionId) return null;

  return getPrisma().cart.findUnique({
    where: { sessionId },
    include: {
      items: {
        include: { variant: { include: { product: true } } },
        orderBy: { id: "asc" },
      },
    },
  });
}

export type Cart = NonNullable<Awaited<ReturnType<typeof readCart>>>;
export type CartLine = Cart["items"][number];

/** Priced from the variant rows in our own database, never from anything the
 *  browser sent. Every total shown to a customer starts here. */
export function cartSubtotalKobo(cart: Cart | null): number {
  if (!cart) return 0;

  return cart.items.reduce(
    (total, item) => total + item.variant.priceKobo * item.quantity,
    0
  );
}

export function cartCount(cart: Cart | null): number {
  if (!cart) return 0;
  return cart.items.reduce((total, item) => total + item.quantity, 0);
}
