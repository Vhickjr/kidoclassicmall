"use client";

import { useState, useTransition } from "react";
import { Heart } from "lucide-react";
import { toggleWishlist } from "@/app/_actions/account";

export default function WishlistButton({
  productId,
  initiallySaved,
}: {
  productId: string;
  initiallySaved: boolean;
}) {
  const [saved, setSaved] = useState(initiallySaved);
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      aria-pressed={saved}
      aria-label={saved ? "Remove from wishlist" : "Save to wishlist"}
      onClick={() =>
        startTransition(async () => {
          const result = await toggleWishlist(productId);
          if (result.ok) setSaved(result.saved);
        })
      }
      className="flex size-12 shrink-0 items-center justify-center border border-line hover:border-foreground disabled:opacity-40"
    >
      <Heart
        aria-hidden
        className={saved ? "size-5 fill-current text-red-500" : "size-5"}
      />
    </button>
  );
}
