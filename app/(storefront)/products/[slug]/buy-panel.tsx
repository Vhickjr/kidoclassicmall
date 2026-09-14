"use client";

import { useState, useTransition } from "react";
import { Minus, Plus } from "lucide-react";
import { colorSwatch, compareSizes, koboToNaira } from "@/lib/format";
import { addToCart } from "@/app/_actions/cart";
import WishlistButton from "@/app/_components/wishlist-button";

export type PanelVariant = {
  id: string;
  size: string;
  color: string | null;
  priceKobo: number;
  compareAtKobo: number | null;
  stock: number;
};

export default function BuyPanel({
  productId,
  saved,
  variants,
}: {
  productId: string;
  saved: boolean;
  variants: PanelVariant[];
}) {
  const colors = [
    ...new Set(variants.map((v) => v.color).filter((c): c is string => Boolean(c))),
  ];
  const sizes = [...new Set(variants.map((v) => v.size))].sort(compareSizes);

  const firstInStock = variants.find((variant) => variant.stock > 0);
  const [color, setColor] = useState<string | null>(
    firstInStock?.color ?? colors[0] ?? null
  );
  const [size, setSize] = useState<string | null>(firstInStock?.size ?? null);
  const [quantity, setQuantity] = useState(1);
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<
    { ok: boolean; message: string } | null
  >(null);

  const inColor = (variant: PanelVariant) =>
    color === null || variant.color === null || variant.color === color;

  const selected =
    variants.find(
      (variant) => inColor(variant) && variant.size === size
    ) ?? null;

  const cheapest = Math.min(...variants.map((variant) => variant.priceKobo));
  const price = selected ? selected.priceKobo : cheapest;
  const compareAt = selected ? selected.compareAtKobo : null;
  const cap = selected ? selected.stock : 0;

  return (
    <div>
      <p className="mt-4 flex items-baseline gap-3">
        <span className="text-2xl font-semibold text-brand-dark">
          {koboToNaira(price)}
        </span>
        {compareAt && compareAt > price && (
          <span className="text-lg text-muted line-through">
            {koboToNaira(compareAt)}
          </span>
        )}
      </p>

      {colors.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-semibold">Color</h2>
          <div className="mt-3 flex flex-wrap gap-2.5">
            {colors.map((option) => {
              const soldOut = !variants.some(
                (variant) => variant.color === option && variant.stock > 0
              );

              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    setColor(option);
                    // The chosen size may not exist in the new colour.
                    const stillThere = variants.some(
                      (variant) =>
                        variant.color === option && variant.size === size
                    );
                    if (!stillThere) setSize(null);
                  }}
                  aria-pressed={option === color}
                  title={soldOut ? `${option} — sold out` : option}
                  className={`size-8 rounded border-2 ${
                    option === color ? "border-foreground" : "border-line"
                  } ${soldOut ? "opacity-40" : ""}`}
                  style={{ backgroundColor: colorSwatch(option) }}
                >
                  <span className="sr-only">{option}</span>
                </button>
              );
            })}
          </div>
          {color && <p className="mt-2 text-sm text-muted">{color}</p>}
        </div>
      )}

      <div className="mt-8">
        <h2 className="text-sm font-semibold">Size</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {sizes.map((option) => {
            const match = variants.find(
              (variant) => inColor(variant) && variant.size === option
            );
            const soldOut = !match || match.stock === 0;

            return (
              <button
                key={option}
                type="button"
                disabled={soldOut}
                aria-pressed={option === size}
                onClick={() => {
                  setSize(option);
                  setQuantity(1);
                }}
                className={`min-w-14 border px-4 py-2 text-sm ${
                  option === size
                    ? "border-brand bg-brand text-white"
                    : "border-line hover:border-foreground"
                } ${soldOut ? "cursor-not-allowed text-muted line-through opacity-50 hover:border-line" : ""}`}
              >
                {option}
              </button>
            );
          })}
        </div>

        <p className="mt-3 text-sm text-muted">
          {!selected
            ? "Pick a size to see availability."
            : cap === 0
              ? "That combination is sold out."
              : cap <= 3
                ? `Only ${cap} left.`
                : "In stock."}
        </p>
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <div className="flex items-center border border-line">
          <button
            type="button"
            onClick={() => setQuantity((value) => Math.max(1, value - 1))}
            disabled={quantity <= 1}
            aria-label="Decrease quantity"
            className="px-3 py-3 disabled:opacity-30"
          >
            <Minus aria-hidden className="size-4" />
          </button>
          <span className="w-10 text-center text-sm tabular-nums">{quantity}</span>
          <button
            type="button"
            onClick={() => setQuantity((value) => Math.min(cap || 1, value + 1))}
            disabled={cap === 0 || quantity >= cap}
            aria-label="Increase quantity"
            className="px-3 py-3 disabled:opacity-30"
          >
            <Plus aria-hidden className="size-4" />
          </button>
        </div>

        <button
          type="button"
          disabled={!selected || cap === 0 || pending}
          onClick={() => {
            if (!selected) return;
            startTransition(async () => {
              const result = await addToCart(selected.id, quantity);
              setFeedback(
                result.ok
                  ? { ok: true, message: "Added to your cart." }
                  : { ok: false, message: result.error }
              );
            });
          }}
          className="flex-1 bg-brand px-8 py-3.5 text-sm text-white disabled:opacity-40"
        >
          {pending ? "Adding…" : "Add to Cart"}
        </button>

        <WishlistButton productId={productId} initiallySaved={saved} />
      </div>

      {feedback && (
        <p
          role="status"
          className={`mt-3 text-sm ${feedback.ok ? "text-green-700" : "text-red-600"}`}
        >
          {feedback.message}
        </p>
      )}
    </div>
  );
}
