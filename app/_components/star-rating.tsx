import { Star } from "lucide-react";

const STARS = [1, 2, 3, 4, 5];

/** `rating` is null until there is a Review model to average. The stars render
 *  hollow in that case rather than showing a score nothing has earned. */
export default function StarRating({
  rating,
  count,
  showLabel = true,
}: {
  rating: number | null;
  count: number;
  showLabel?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-0.5">
        {STARS.map((star) => (
          <Star
            key={star}
            aria-hidden
            className={
              rating !== null && star <= Math.round(rating)
                ? "size-4 fill-current text-amber-500"
                : "size-4 text-line"
            }
          />
        ))}
      </div>

      {showLabel && (
        <span className="text-sm text-muted">
          {rating === null
            ? "No reviews yet"
            : `${rating.toFixed(1)} (${count} ${count === 1 ? "review" : "reviews"})`}
        </span>
      )}
    </div>
  );
}
