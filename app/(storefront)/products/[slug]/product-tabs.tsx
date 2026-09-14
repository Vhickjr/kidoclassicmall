"use client";

import { useState } from "react";
import Link from "next/link";
import { Star } from "lucide-react";

const TABS = ["Descriptions", "Additional Information", "Reviews"] as const;

export type PublicReview = {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  author: string;
  createdAt: string;
};

export default function ProductTabs({
  description,
  colors,
  sizes,
  reviews,
  canReview,
}: {
  description: string | null;
  colors: string[];
  sizes: string[];
  reviews: PublicReview[];
  canReview: boolean;
}) {
  const [active, setActive] = useState<(typeof TABS)[number]>("Descriptions");

  return (
    <section className="mt-16">
      <div role="tablist" className="flex gap-8 border-b border-line">
        {TABS.map((tab) => (
          <button
            key={tab}
            role="tab"
            type="button"
            aria-selected={tab === active}
            onClick={() => setActive(tab)}
            className={`-mb-px border-b-2 pb-3 text-sm ${
              tab === active
                ? "border-foreground font-semibold"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div role="tabpanel" className="py-8">
        {active === "Descriptions" && (
          <p className="max-w-3xl whitespace-pre-line text-sm leading-relaxed text-muted">
            {description ?? "No description for this product yet."}
          </p>
        )}

        {active === "Additional Information" && (
          <dl className="max-w-2xl divide-y divide-line text-sm">
            <div className="flex gap-8 py-3">
              <dt className="w-24 shrink-0 font-semibold">Color</dt>
              <dd className="text-muted">
                {colors.length > 0 ? colors.join(", ") : "Not specified"}
              </dd>
            </div>
            <div className="flex gap-8 py-3">
              <dt className="w-24 shrink-0 font-semibold">Size</dt>
              <dd className="text-muted">{sizes.join(", ")}</dd>
            </div>
          </dl>
        )}

        {active === "Reviews" && (
          <div className="max-w-2xl">
            <h3 className="text-sm font-semibold">
              Customer Reviews ({reviews.length})
            </h3>

            {reviews.length === 0 ? (
              <p className="mt-3 text-sm text-muted">
                No reviews yet.
              </p>
            ) : (
              <ul className="mt-5 divide-y divide-line border-y border-line">
                {reviews.map((review) => (
                  <li key={review.id} className="py-5">
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          aria-hidden
                          className={
                            star <= review.rating
                              ? "size-4 fill-current text-amber-500"
                              : "size-4 text-line"
                          }
                        />
                      ))}
                    </div>
                    {review.title && (
                      <p className="mt-2 text-sm font-semibold">{review.title}</p>
                    )}
                    <p className="mt-1 text-sm leading-relaxed text-muted">
                      {review.body}
                    </p>
                    <p className="mt-3 text-xs text-muted">
                      {review.author} &middot; {review.createdAt}
                    </p>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-8 rounded border border-dashed border-line p-4 text-sm text-muted">
              {canReview ? (
                <>
                  You have bought this.{" "}
                  <Link href="/account/reviews" className="text-foreground underline">
                    Write a review
                  </Link>{" "}
                  — a member of staff checks it before it appears here.
                </>
              ) : (
                <>
                  Reviews come from customers who bought the item. Yours will
                  appear under{" "}
                  <Link href="/account/reviews" className="text-foreground underline">
                    My Reviews
                  </Link>{" "}
                  once you have ordered it.
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
