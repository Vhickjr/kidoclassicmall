import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getPrisma } from "@/lib/prisma";
import { readSessionId } from "@/lib/cart";
import { isAlatpayConfigured } from "@/lib/alatpay";
import Money from "@/app/_components/money";
import AlatpayButton from "@/app/_components/alatpay-button";

export const metadata: Metadata = { title: "Pay" };

export default async function PayPage({ params }: PageProps<"/checkout/pay/[id]">) {
  const { id } = await params;

  const sessionId = await readSessionId();
  const order = await getPrisma().order.findUnique({
    where: { id },
    include: { items: true },
  });

  // Order ids appear in URLs, so only the cookie that placed it may pay it.
  if (!order || !sessionId || order.sessionId !== sessionId) notFound();
  if (order.status !== "PENDING") redirect(`/checkout/confirmed?order=${order.id}`);

  const configured = isAlatpayConfigured();

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-16">
      <h1 className="text-3xl tracking-tight text-brand-dark">Pay for your order</h1>
      <p className="mt-2 font-mono text-xs text-muted">{order.id}</p>

      <ul className="mt-8 divide-y divide-line border-y border-line">
        {order.items.map((item) => (
          <li key={item.id} className="flex justify-between gap-4 py-3 text-sm">
            <span>
              {item.productName}
              <span className="text-muted">
                {" "}
                · {item.size} · ×{item.quantity}
              </span>
            </span>
            <Money kobo={item.priceKobo * item.quantity} />
          </li>
        ))}
      </ul>

      <div className="mt-5 flex items-center justify-between">
        <span className="font-semibold">Total</span>
        <span className="font-semibold">
          <Money kobo={order.totalKobo} />
        </span>
      </div>

      {order.deliveryKobo > 0 && (
        <p className="mt-1 text-right text-xs text-muted">
          Includes delivery
        </p>
      )}

      <div className="mt-8">
        {configured ? (
          <AlatpayButton
            orderId={order.id}
            // ALAT Pay is billed in naira; the popup takes a naira figure.
            amountNaira={order.totalKobo / 100}
            email={order.email}
            phone={order.phone}
            firstName={order.recipientName?.split(" ")[0] ?? null}
            lastName={order.recipientName?.split(" ").slice(1).join(" ") || null}
            apiKey={process.env.NEXT_PUBLIC_ALATPAY_API_KEY ?? ""}
            businessId={process.env.NEXT_PUBLIC_ALATPAY_BUSINESS_ID ?? ""}
          />
        ) : (
          <div className="border border-dashed border-line p-5 text-sm text-muted">
            <p className="font-semibold text-foreground">
              ALAT Pay is not configured yet
            </p>
            <p className="mt-2 leading-relaxed">
              Add <code>ALATPAY_SECRET_KEY</code>,{" "}
              <code>NEXT_PUBLIC_ALATPAY_API_KEY</code> and{" "}
              <code>NEXT_PUBLIC_ALATPAY_BUSINESS_ID</code>. Your order is saved
              and unpaid until then.
            </p>
          </div>
        )}
      </div>

      <p className="mt-6 text-center text-xs text-muted">
        Charged in naira (&#8358;{(order.totalKobo / 100).toLocaleString("en-NG")}).
        Card details are entered in ALAT Pay&rsquo;s window and never reach this
        site.
      </p>

      <Link
        href="/cart"
        className="mt-6 block text-center text-sm text-muted underline"
      >
        Back to cart
      </Link>
    </div>
  );
}
