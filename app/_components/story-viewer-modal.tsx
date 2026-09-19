"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight, X, ShoppingBag, ArrowUpRight } from "lucide-react";
import { koboToNaira } from "@/lib/format";

export type StorySlide = {
  id: string;
  mediaUrl: string;
  mediaType: "IMAGE" | "VIDEO";
  caption?: string | null;
  durationSec: number;
  product?: {
    id: string;
    name: string;
    slug: string;
    brand?: string | null;
    images?: any;
    variants: { priceKobo: number; compareAtKobo?: number | null }[];
  } | null;
};

export type FullStory = {
  id: string;
  title: string;
  brandHandle: string;
  coverImage: string;
  slides: StorySlide[];
};

export default function StoryViewerModal({
  stories,
  initialStoryIndex,
  onClose,
}: {
  stories: FullStory[];
  initialStoryIndex: number;
  onClose: () => void;
}) {
  const [storyIndex, setStoryIndex] = useState(initialStoryIndex);
  const [slideIndex, setSlideIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showProductDrawer, setShowProductDrawer] = useState(false);

  // Touch swipe handling
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const currentStory = stories[storyIndex];
  const currentSlide = currentStory?.slides[slideIndex];
  const durationMs = (currentSlide?.durationSec ?? 5) * 1000;

  const nextSlide = useCallback(() => {
    setShowProductDrawer(false);
    if (!currentStory) return;

    if (slideIndex < currentStory.slides.length - 1) {
      setSlideIndex((prev) => prev + 1);
      setProgress(0);
    } else if (storyIndex < stories.length - 1) {
      setStoryIndex((prev) => prev + 1);
      setSlideIndex(0);
      setProgress(0);
    } else {
      onClose();
    }
  }, [currentStory, slideIndex, storyIndex, stories.length, onClose]);

  const prevSlide = useCallback(() => {
    setShowProductDrawer(false);
    if (slideIndex > 0) {
      setSlideIndex((prev) => prev - 1);
      setProgress(0);
    } else if (storyIndex > 0) {
      setStoryIndex((prev) => prev - 1);
      const prevStory = stories[storyIndex - 1];
      setSlideIndex(prevStory.slides.length - 1);
      setProgress(0);
    }
  }, [slideIndex, storyIndex, stories]);

  // Auto-play timer loop
  useEffect(() => {
    if (paused || showProductDrawer || !currentSlide) return;

    const interval = 50; // update progress every 50ms
    const step = (interval / durationMs) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          nextSlide();
          return 0;
        }
        return prev + step;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [paused, showProductDrawer, currentSlide, durationMs, nextSlide]);

  // Reset progress when slide changes
  useEffect(() => {
    setProgress(0);
  }, [storyIndex, slideIndex]);

  // Keyboard navigation & Esc to close
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") nextSlide();
      if (e.key === "ArrowLeft") prevSlide();
      if (e.key === " ") setPaused((p) => !p);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [nextSlide, prevSlide, onClose]);

  if (!currentStory || !currentSlide) return null;

  // Attached product detail extraction
  const product = currentSlide.product;
  const lowestPriceKobo = product?.variants?.length
    ? Math.min(...product.variants.map((v) => v.priceKobo))
    : 0;
  // No stand-in: a product with no photo shows a brand-tinted square instead
  // of a stock image of something that is not the product.
  const productImage = Array.isArray(product?.images)
    ? (product.images[0] as string | undefined)
    : undefined;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md">
      {/* Background blur container */}
      <div
        className="relative flex h-full w-full max-w-md flex-col overflow-hidden bg-black shadow-2xl sm:h-[90vh] sm:max-h-[840px] sm:rounded-2xl sm:border sm:border-white/10"
        onTouchStart={(e) => {
          touchStartX.current = e.touches[0].clientX;
          touchStartY.current = e.touches[0].clientY;
          setPaused(true);
        }}
        onTouchEnd={(e) => {
          setPaused(false);
          if (touchStartX.current === null || touchStartY.current === null) return;
          const diffX = touchStartX.current - e.changedTouches[0].clientX;
          const diffY = touchStartY.current - e.changedTouches[0].clientY;

          // Swipe down to dismiss
          if (diffY < -80 && Math.abs(diffX) < 100) {
            onClose();
          } else if (diffX > 50) {
            nextSlide(); // Swipe left -> next
          } else if (diffX < -50) {
            prevSlide(); // Swipe right -> prev
          }
          touchStartX.current = null;
          touchStartY.current = null;
        }}
        onMouseDown={() => setPaused(true)}
        onMouseUp={() => setPaused(false)}
      >
        {/* Top Progress Bars */}
        <div className="absolute top-0 left-0 right-0 z-30 flex gap-1.5 p-3 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
          {currentStory.slides.map((slide, idx) => {
            let barWidth = "0%";
            if (idx < slideIndex) barWidth = "100%";
            else if (idx === slideIndex) barWidth = `${progress}%`;

            return (
              <div
                key={slide.id}
                className="h-1 flex-1 overflow-hidden rounded-full bg-white/30"
              >
                <div
                  className="h-full bg-white transition-all duration-75 ease-linear"
                  style={{ width: barWidth }}
                />
              </div>
            );
          })}
        </div>

        {/* Story Header */}
        <div className="absolute top-6 left-0 right-0 z-30 flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-full p-[2px] bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600">
              <Image
                src={currentStory.coverImage}
                alt={currentStory.title}
                width={36}
                height={36}
                className="size-full rounded-full object-cover"
              />
            </div>
            <div>
              <p className="text-sm font-bold text-white drop-shadow-md">
                {currentStory.title}
              </p>
              <p className="text-xs text-white/80 drop-shadow">
                {currentStory.brandHandle}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex size-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md transition hover:bg-black/60"
            aria-label="Close stories"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Story Media (Image or Video) */}
        <div className="relative flex-1 bg-black">
          {currentSlide.mediaType === "VIDEO" ? (
            <video
              src={currentSlide.mediaUrl}
              autoPlay
              muted
              playsInline
              className="h-full w-full object-cover"
            />
          ) : (
            <Image
              src={currentSlide.mediaUrl}
              alt={currentSlide.caption || currentStory.title}
              fill
              priority
              className="object-cover"
            />
          )}

          {/* Left/Right Tap zones */}
          <div
            className="absolute inset-y-0 left-0 w-1/3 z-20 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              prevSlide();
            }}
          />
          <div
            className="absolute inset-y-0 right-0 w-2/3 z-20 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              nextSlide();
            }}
          />
        </div>

        {/* Caption Overlay */}
        {currentSlide.caption && (
          <div className="absolute bottom-24 left-0 right-0 z-30 px-6 text-center">
            <p className="inline-block rounded-xl bg-black/60 px-4 py-2 text-sm text-white backdrop-blur-md drop-shadow-lg">
              {currentSlide.caption}
            </p>
          </div>
        )}

        {/* Product Attachment CTA Button */}
        {product && (
          <div className="absolute bottom-6 left-0 right-0 z-30 flex justify-center px-6">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowProductDrawer((prev) => !prev);
              }}
              className="flex items-center gap-2 rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white shadow-xl backdrop-blur-md transition hover:scale-105 active:scale-95"
            >
              <ShoppingBag className="size-4" />
              <span>Shop this ({koboToNaira(lowestPriceKobo)})</span>
            </button>
          </div>
        )}

        {/* Attached Product Drawer Popover */}
        {product && showProductDrawer && (
          <div className="absolute inset-x-4 bottom-20 z-40 animate-in slide-in-from-bottom-5 duration-200">
            <div className="rounded-2xl border border-white/10 bg-surface/95 p-4 shadow-2xl backdrop-blur-xl">
              <div className="flex items-center gap-4">
                <div className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-surface-muted">
                  {productImage && (
                    <Image
                      src={productImage}
                      alt={product.name}
                      fill
                      className="object-cover"
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  {product.brand && (
                    <p className="text-xs text-muted">{product.brand}</p>
                  )}
                  <h4 className="truncate font-semibold text-foreground text-sm">
                    {product.name}
                  </h4>
                  <p className="mt-0.5 font-bold text-brand text-sm">
                    {koboToNaira(lowestPriceKobo)}
                  </p>
                </div>
                <Link
                  href={`/products/${product.slug}`}
                  className="flex items-center gap-1 rounded-lg bg-brand px-4 py-2 text-xs font-semibold text-white shadow-md transition hover:bg-brand-deep"
                >
                  <span>View</span>
                  <ArrowUpRight className="size-3.5" />
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Desktop Side Chevron Navigation Controls */}
        <button
          type="button"
          onClick={prevSlide}
          className="hidden sm:flex absolute left-[-60px] top-1/2 z-40 -translate-y-1/2 size-12 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-md hover:bg-white/40"
          aria-label="Previous story"
        >
          <ChevronLeft className="size-6" />
        </button>
        <button
          type="button"
          onClick={nextSlide}
          className="hidden sm:flex absolute right-[-60px] top-1/2 z-40 -translate-y-1/2 size-12 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-md hover:bg-white/40"
          aria-label="Next story"
        >
          <ChevronRight className="size-6" />
        </button>
      </div>
    </div>
  );
}
