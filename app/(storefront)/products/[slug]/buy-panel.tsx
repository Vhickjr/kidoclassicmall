"use client";

import { useMemo, useState, useTransition } from "react";
import { Minus, Plus } from "lucide-react";
import { colorSwatch, compareSizes } from "@/lib/format";
import { addToCart, buyNow } from "@/app/_actions/cart";
import WishlistButton from "@/app/_components/wishlist-button";
import Money from "@/app/_components/money";
import { triggerCartOpen } from "@/app/_components/cart-state";

export type PanelVariant = {
  id: string;
  size: string;
  color: string | null;
  customOptions?: Record<string, string> | unknown;
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
  const colors = useMemo(
    () => [
      ...new Set(variants.map((v) => v.color).filter((c): c is string => Boolean(c))),
    ],
    [variants]
  );
  const sizes = useMemo(
    () => [...new Set(variants.map((v) => v.size))].sort(compareSizes),
    [variants]
  );

  // Discover all custom option keys across variants (e.g., Material, Style, Weight, etc.)
  const customKeys = useMemo(() => {
    const keysSet = new Set<string>();
    for (const v of variants) {
      if (
        v.customOptions &&
        typeof v.customOptions === "object" &&
        !Array.isArray(v.customOptions)
      ) {
        for (const k of Object.keys(v.customOptions as Record<string, string>)) {
          if (k) keysSet.add(k);
        }
      }
    }
    return Array.from(keysSet);
  }, [variants]);

  const firstInStock = variants.find((variant) => variant.stock > 0);
  const [color, setColor] = useState<string | null>(
    firstInStock?.color ?? colors[0] ?? null
  );
  const [size, setSize] = useState<string | null>(firstInStock?.size ?? null);

  // Initialize selected custom variation values
  const [customSelected, setCustomSelected] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    if (firstInStock?.customOptions && typeof firstInStock.customOptions === "object") {
      const opts = firstInStock.customOptions as Record<string, string>;
      for (const k of customKeys) {
        if (opts[k]) initial[k] = opts[k];
      }
    } else if (variants[0]?.customOptions && typeof variants[0].customOptions === "object") {
      const opts = variants[0].customOptions as Record<string, string>;
      for (const k of customKeys) {
        if (opts[k]) initial[k] = opts[k];
      }
    }
    return initial;
  });

  const [quantity, setQuantity] = useState(1);
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<
    { ok: boolean; message: string } | null
  >(null);

  const inColor = (variant: PanelVariant) =>
    color === null || variant.color === null || variant.color === color;

  const selected = useMemo(() => {
    return (
      variants.find((variant) => {
        if (!inColor(variant)) return false;
        if (size !== null && variant.size !== size) return false;

        if (customKeys.length > 0) {
          const opts =
            (variant.customOptions as Record<string, string>) || {};
          for (const key of customKeys) {
            if (customSelected[key] && opts[key] !== customSelected[key]) {
              return false;
            }
          }
        }
        return true;
      }) ?? null
    );
  }, [variants, color, size, customKeys, customSelected]);

  const cheapest = Math.min(...variants.map((variant) => variant.priceKobo));
  const price = selected ? selected.priceKobo : cheapest;
  const compareAt = selected ? selected.compareAtKobo : null;
  const cap = selected ? selected.stock : 0;

  return (
    <div>
      <p className="mt-4 flex items-baseline gap-3">
        <span className="text-2xl font-semibold text-brand-dark">
          <Money kobo={price} />
        </span>
        {compareAt && compareAt > price && (
          <span className="text-lg text-muted line-through">
            <Money kobo={compareAt} />
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
            ? "Pick your options to see availability."
            : cap === 0
              ? "That combination is sold out."
              : cap <= 3
                ? `Only ${cap} left.`
                : "In stock."}
        </p>
      </div>

      {/* Render Custom Variations (e.g. Material, Pack Size, Style, etc.) */}
      {customKeys.map((key) => {
        const optionValues = Array.from(
          new Set(
            variants
              .map((v) => (v.customOptions as Record<string, string>)?.[key])
              .filter((val): val is string => Boolean(val))
          )
        );

        if (optionValues.length === 0) return null;

        return (
          <div key={key} className="mt-8">
            <h2 className="text-sm font-semibold">{key}</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {optionValues.map((val) => {
                const isSelected = customSelected[key] === val;
                return (
                  <button
                    key={val}
                    type="button"
                    onClick={() => {
                      setCustomSelected((prev) => ({ ...prev, [key]: val }));
                    }}
                    className={`border px-4 py-2 text-sm font-medium transition ${
                      isSelected
                        ? "border-brand bg-brand text-white"
                        : "border-line hover:border-foreground"
                    }`}
                  >
                    {val}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

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
              if (result.ok) {
                setFeedback({ ok: true, message: "Added to your cart!" });
                triggerCartOpen();
              } else {
                setFeedback({ ok: false, message: result.error });
              }
            });
          }}
          className="flex-1 border border-brand px-6 py-3.5 text-sm text-brand-deep hover:bg-brand-soft/40 disabled:opacity-40"
        >
          {pending ? "Adding…" : "Add to Cart"}
        </button>

        <button
          type="button"
          disabled={!selected || cap === 0 || pending}
          onClick={() => {
            if (!selected) return;
            startTransition(async () => {
              const result = await buyNow(selected.id, quantity);
              if (result && !result.ok) {
                setFeedback({ ok: false, message: result.error });
              }
            });
          }}
          className="flex-1 bg-brand px-6 py-3.5 text-sm text-white disabled:opacity-40"
        >
          Buy now
        </button>

        <WishlistButton productId={productId} initiallySaved={saved} />
      </div>

      {feedback && (
        <p
          role="status"
          className={`mt-3 text-sm font-medium ${feedback.ok ? "text-green-700" : "text-red-600"}`}
        >
          {feedback.message}
        </p>
      )}
    </div>
  );
}
