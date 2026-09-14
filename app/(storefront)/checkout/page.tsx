import { redirect } from "next/navigation";
import { readCart } from "@/lib/cart";

/** Checkout has no page of its own — it starts at the address step. This exists
 *  so /checkout is not a dead link from the cart and the minicart. */
export default async function CheckoutPage() {
  const cart = await readCart();

  if (!cart || cart.items.length === 0) redirect("/cart");
  redirect("/checkout/address");
}
