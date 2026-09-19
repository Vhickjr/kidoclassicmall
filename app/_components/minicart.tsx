"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShoppingBag, Trash2, X } from "lucide-react";
import { imageList } from "@/lib/format";
import { formatVariantLabel } from "@/lib/variant";
import { removeCartItem } from "@/app/_actions/cart";
import Money from "@/app/_components/money";
import { CART_OPEN_EVENT } from "./cart-state";

export type CartItemData = {
  id: string;
  quantity: number;
  variant: {
    id: string;
    priceKobo: number;
    size: string;
    color: string | null;
    customOptions?: unknown;
    product: {
      name: string;
      images: unknown;
    };
  };
};

export type MinicartProps = {
  initialCount: number;
  initialSubtotal: number;
  initialItems: CartItemData[];
};

export default function Minicart({
  initialCount,
  initialSubtotal,
  initialItems,
}: MinicartProps) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleCartOpen() {
      setIsOpen(true);
      router.refresh();
    }

    window.addEventListener(CART_OPEN_EVENT, handleCartOpen);
    return () => window.removeEventListener(CART_OPEN_EVENT, handleCartOpen);
  }, [router]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative flex items-center p-1"
        aria-label="Cart"
      >
        <ShoppingBag aria-hidden className="size-5 text-muted hover:text-foreground transition-colors" />
        {initialCount > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex size-4.5 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-white shadow-sm">
            {initialCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 w-84 pt-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="border border-line bg-surface p-5 shadow-2xl rounded-sm">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <span className="text-sm font-semibold">
                Your Cart ({initialCount} {initialCount === 1 ? "item" : "items"})
              </span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-full p-1 text-muted hover:bg-surface-muted hover:text-foreground transition-colors"
                aria-label="Close cart popup"
              >
                <X className="size-4" />
              </button>
            </div>

            {initialItems.length === 0 ? (
              <p className="mt-4 text-sm text-muted">Your cart is empty.</p>
            ) : (
              <>
                <ul className="mt-3 max-h-72 overflow-y-auto divide-y divide-line pr-1">
                  {initialItems.map((line) => (
                    <li key={line.id} className="flex items-start gap-3 py-3">
                      {imageList(line.variant.product.images)[0] && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={imageList(line.variant.product.images)[0]}
                          alt=""
                          className="size-14 shrink-0 rounded bg-brand-soft/40 object-cover"
                        />
                      )}

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {line.variant.product.name}
                        </p>
                        <p className="mt-0.5 text-xs text-muted">
                          {formatVariantLabel(line.variant)}
                        </p>
                        <p className="mt-1 text-sm font-semibold">
                          {line.quantity} &times; <Money kobo={line.variant.priceKobo} />
                        </p>
                      </div>

                      <form action={removeCartItem}>
                        <input type="hidden" name="itemId" value={line.id} />
                        <button
                          type="submit"
                          aria-label={`Remove ${line.variant.product.name}`}
                          className="p-1 text-red-500 hover:text-red-700 transition-colors"
                        >
                          <Trash2 aria-hidden className="size-4" />
                        </button>
                      </form>
                    </li>
                  ))}
                </ul>

                <div className="mt-4 flex items-center justify-between border-t border-line pt-4">
                  <span className="text-sm font-semibold">Subtotal</span>
                  <span className="text-sm font-semibold text-brand-dark">
                    <Money kobo={initialSubtotal} />
                  </span>
                </div>

                <div className="mt-4 space-y-2">
                  <Link
                    href="/cart"
                    onClick={() => setIsOpen(false)}
                    className="block w-full border border-foreground py-2.5 text-center text-sm font-medium transition hover:bg-foreground hover:text-white"
                  >
                    View Cart
                  </Link>
                  <Link
                    href="/checkout"
                    onClick={() => setIsOpen(false)}
                    className="block w-full bg-brand py-2.5 text-center text-sm font-semibold text-white transition hover:bg-brand-deep shadow-md"
                  >
                    Checkout
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
