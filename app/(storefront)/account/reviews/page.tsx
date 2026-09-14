import type { Metadata } from "next";
import Link from "next/link";
import { getPrisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { imageList } from "@/lib/format";
import { submitReview } from "@/app/_actions/reviews";
import StarRating from "@/app/_components/star-rating";

export const metadata: Metadata = { title: "My Reviews" };

const STATUS_STYLE: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  APPROVED: "bg-green-100 text-green-800",
  REJECTED: "bg-line text-muted",
};

const STATUS_COPY: Record<string, string> = {
  PENDING: "Waiting for approval",
  APPROVED: "Published",
  REJECTED: "Not published",
};

export default async function MyReviewsPage() {
  const user = await getSessionUser();

  if (!user) {
    return (
      <div>
        <h2 className="font-semibold">My Reviews</h2>
        <p className="mt-6 text-sm text-muted">
          Sign in to review something you have bought.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block bg-brand px-6 py-3 text-sm text-white"
        >
          Sign in
        </Link>
      </div>
    );
  }

  const prisma = getPrisma();

  const [purchased, reviews] = await Promise.all([
    prisma.orderItem.findMany({
      where: { order: { userId: user.id } },
      include: { variant: { include: { product: true } } },
      orderBy: { id: "desc" },
    }),
    prisma.review.findMany({
      where: { userId: user.id },
      include: { product: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const reviewed = new Map(reviews.map((review) => [review.productId, review]));

  // One entry per product, however many times it was ordered.
  const products = [
    ...new Map(
      purchased.map((item) => [item.variant.productId, item.variant.product])
    ).values(),
  ];

  return (
    <div>
      <h2 className="font-semibold">My Reviews</h2>

      {products.length === 0 ? (
        <p className="mt-6 text-sm text-muted">
          You can review anything you have ordered. Nothing yet.
        </p>
      ) : (
        <ul className="mt-6 space-y-8">
          {products.map((product) => {
            const existing = reviewed.get(product.id);
            const cover = imageList(product.images)[0];

            return (
              <li key={product.id} className="border border-line p-5">
                <div className="flex items-start gap-4">
                  {cover && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={cover}
                      alt=""
                      className="size-16 shrink-0 bg-brand-soft/40 object-cover"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/products/${product.slug}`}
                      className="font-semibold hover:text-muted"
                    >
                      {product.name}
                    </Link>
                    {existing && (
                      <p className="mt-2 flex flex-wrap items-center gap-3 text-sm">
                        <span
                          className={`px-2 py-1 text-xs ${STATUS_STYLE[existing.status]}`}
                        >
                          {existing.status}
                        </span>
                        <span className="text-muted">
                          {STATUS_COPY[existing.status]}
                        </span>
                        <StarRating
                          rating={existing.rating}
                          count={1}
                          showLabel={false}
                        />
                      </p>
                    )}
                  </div>
                </div>

                <form action={submitReview} className="mt-5">
                  <input type="hidden" name="productId" value={product.id} />

                  <div className="flex flex-wrap gap-4">
                    <label className="block">
                      <span className="text-xs text-muted">Rating</span>
                      <select
                        name="rating"
                        defaultValue={existing?.rating ?? 5}
                        className="mt-1.5 block border border-line px-3 py-2 text-sm"
                      >
                        {[5, 4, 3, 2, 1].map((value) => (
                          <option key={value} value={value}>
                            {value} star{value === 1 ? "" : "s"}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block flex-1">
                      <span className="text-xs text-muted">Title</span>
                      <input
                        name="title"
                        defaultValue={existing?.title ?? ""}
                        placeholder="Optional"
                        className="mt-1.5 w-full border border-line px-3 py-2 text-sm"
                      />
                    </label>
                  </div>

                  <label className="mt-4 block">
                    <span className="text-xs text-muted">Your review</span>
                    <textarea
                      name="body"
                      rows={3}
                      required
                      minLength={10}
                      defaultValue={existing?.body ?? ""}
                      placeholder="How did it fit? How does it wear?"
                      className="mt-1.5 w-full border border-line px-3 py-2 text-sm"
                    />
                  </label>

                  <button
                    type="submit"
                    className="mt-4 bg-brand px-6 py-2.5 text-sm text-white"
                  >
                    {existing ? "Update review" : "Submit review"}
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-8 rounded border border-dashed border-line px-3 py-2 text-xs text-muted">
        Reviews are checked by a member of staff before they appear on the
        product page. Editing an approved review sends it back for approval.
      </p>
    </div>
  );
}
