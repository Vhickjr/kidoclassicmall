import type { Metadata } from "next";
import Link from "next/link";
import { getPrisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { moderateReview } from "@/app/_actions/reviews";
import StarRating from "@/app/_components/star-rating";
import SubmitButton from "@/app/_components/submit-button";

export const metadata: Metadata = { title: "Reviews" };

const STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;

const STATUS_STYLE: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  APPROVED: "bg-green-100 text-green-800",
  REJECTED: "bg-line text-muted",
};

export default async function AdminReviewsPage({
  searchParams,
}: PageProps<"/admin/reviews">) {
  if (!(await requireAdmin())) return null;

  const params = await searchParams;
  const active =
    typeof params.status === "string" &&
    (STATUSES as readonly string[]).includes(params.status)
      ? (params.status as (typeof STATUSES)[number])
      : "PENDING";

  const reviews = await getPrisma().review.findMany({
    where: { status: active },
    include: { product: true, user: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Reviews</h1>
      <p className="mt-2 text-sm text-muted">
        Nothing a customer writes appears on the storefront until it is approved
        here.
      </p>

      <nav className="mt-6 flex flex-wrap gap-2">
        {STATUSES.map((status) => (
          <Link
            key={status}
            href={`/admin/reviews?status=${status}`}
            className={`border px-4 py-1.5 text-sm ${
              active === status
                ? "border-brand bg-brand text-white"
                : "border-line text-muted hover:border-foreground hover:text-foreground"
            }`}
          >
            {status}
          </Link>
        ))}
      </nav>

      {reviews.length === 0 ? (
        <p className="mt-8 text-muted">Nothing {active.toLowerCase()}.</p>
      ) : (
        <ul className="mt-8 divide-y divide-line border-y border-line">
          {reviews.map((review) => (
            <li key={review.id} className="py-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/products/${review.product.slug}`}
                    className="font-semibold hover:text-muted"
                  >
                    {review.product.name}
                  </Link>
                  <p className="mt-1 text-sm text-muted">
                    {review.user.firstName ?? "Customer"} &middot;{" "}
                    {review.user.email} &middot;{" "}
                    {review.createdAt.toLocaleDateString("en-NG", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                  <div className="mt-2">
                    <StarRating rating={review.rating} count={1} showLabel={false} />
                  </div>
                  {review.title && (
                    <p className="mt-2 text-sm font-semibold">{review.title}</p>
                  )}
                  <p className="mt-1 max-w-2xl text-sm text-muted">
                    {review.body}
                  </p>
                </div>

                <div className="flex shrink-0 flex-col items-end gap-2">
                  <span
                    className={`px-2 py-1 text-xs ${STATUS_STYLE[review.status]}`}
                  >
                    {review.status}
                  </span>

                  {review.status !== "APPROVED" && (
                    <form action={moderateReview}>
                      <input type="hidden" name="reviewId" value={review.id} />
                      <input type="hidden" name="decision" value="APPROVED" />
                      <SubmitButton variant="primary">Approve</SubmitButton>
                    </form>
                  )}

                  {review.status !== "REJECTED" && (
                    <form action={moderateReview}>
                      <input type="hidden" name="reviewId" value={review.id} />
                      <input type="hidden" name="decision" value="REJECTED" />
                      <SubmitButton variant="danger">Reject</SubmitButton>
                    </form>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
