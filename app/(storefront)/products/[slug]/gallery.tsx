"use client";

import { useState } from "react";
import { Play } from "lucide-react";

type Slide = { type: "image"; url: string } | { type: "video"; url: string };

export default function Gallery({
  images,
  video,
  alt,
}: {
  images: string[];
  /** Optional showcase clip, shown as the last slide. */
  video?: string | null;
  alt: string;
}) {
  const [active, setActive] = useState(0);

  // The video is one more slide rather than a separate player, so the picture
  // area never changes size and the thumbnails stay a single row of choices.
  const slides: Slide[] = [
    ...images.map((url) => ({ type: "image" as const, url })),
    ...(video ? [{ type: "video" as const, url: video }] : []),
  ];

  if (slides.length === 0) {
    return (
      <div className="flex aspect-3/4 items-center justify-center bg-brand-soft/40 text-sm text-muted">
        No photo
      </div>
    );
  }

  // A stale index would blank the gallery if the slide list ever shrinks.
  const current = slides[Math.min(active, slides.length - 1)];

  return (
    <div>
      {current.type === "video" ? (
        <video
          key={current.url}
          src={current.url}
          controls
          playsInline
          // No autoplay: a clip that starts talking on its own is a nuisance,
          // and on mobile it would eat the shopper's data.
          preload="metadata"
          className="aspect-3/4 w-full bg-brand-soft/40 object-cover"
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={current.url}
          alt={alt}
          className="aspect-3/4 w-full bg-brand-soft/40 object-cover"
        />
      )}

      {slides.length > 1 && (
        <ul className="mt-3 grid grid-cols-4 gap-3">
          {slides.map((slide, index) => (
            <li key={slide.url}>
              <button
                type="button"
                onClick={() => setActive(index)}
                aria-label={
                  slide.type === "video"
                    ? "Play the product video"
                    : `View image ${index + 1}`
                }
                aria-current={index === active}
                className={`relative block w-full border-2 ${
                  index === active ? "border-foreground" : "border-transparent"
                }`}
              >
                {slide.type === "video" ? (
                  <>
                    <video
                      src={slide.url}
                      muted
                      preload="metadata"
                      className="aspect-square w-full bg-brand-soft/40 object-cover"
                    />
                    {/* Without this badge a video thumbnail is just a frozen
                        frame, indistinguishable from the photos beside it. */}
                    <span className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <Play aria-hidden className="size-6 fill-white text-white" />
                    </span>
                  </>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={slide.url}
                    alt=""
                    className="aspect-square w-full bg-brand-soft/40 object-cover"
                  />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
