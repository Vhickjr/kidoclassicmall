"use client";

import { useState } from "react";
import { koboToNaira } from "@/lib/format";

type Variant = {
  id: string;
  size: string;
  color: string | null;
  priceKobo: number;
  stock: number;
};

export default function SizeSelector({ variants }: { variants: Variant[] }) {
  const [selectedId, setSelectedId] = useState(
    () => variants.find((variant) => variant.stock > 0)?.id ?? null
  );

  const selected = variants.find((variant) => variant.id === selectedId) ?? null;
  const lowest = Math.min(...variants.map((variant) => variant.priceKobo));
  const everythingSoldOut = variants.every((variant) => variant.stock === 0);

  return (
    <div>
      <p className="mt-4 text-xl">
        {koboToNaira(selected ? selected.priceKobo : lowest)}
      </p>

      <div className="mt-8">
        <h2 className="text-sm font-medium">Size</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {variants.map((variant) => {
            const soldOut = variant.stock === 0;
            const isSelected = variant.id === selectedId;

            return (
              <button
                key={variant.id}
                type="button"
                disabled={soldOut}
                aria-pressed={isSelected}
                onClick={() => setSelectedId(variant.id)}
                className={`min-w-14 border px-4 py-2 text-sm transition-colors ${
                  isSelected
                    ? "border-foreground bg-foreground text-background"
                    : "border-line hover:border-foreground"
                } ${
                  soldOut
                    ? "cursor-not-allowed text-muted line-through opacity-50 hover:border-line"
                    : ""
                }`}
              >
                {variant.size}
              </button>
            );
          })}
        </div>

        {everythingSoldOut ? (
          <p className="mt-3 text-sm text-muted">
            Every size is sold out right now.
          </p>
        ) : (
          selected && (
            <p className="mt-3 text-sm text-muted">
              {selected.color ? `${selected.color}. ` : ""}
              {selected.stock <= 3
                ? `Only ${selected.stock} left in size ${selected.size}.`
                : "In stock."}
            </p>
          )
        )}
      </div>
    </div>
  );
}
