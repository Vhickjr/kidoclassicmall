"use client";

import { useState } from "react";
import Image from "next/image";
import StoryViewerModal, { type FullStory } from "@/app/_components/story-viewer-modal";

export default function StoriesSection({
  stories,
}: {
  stories: FullStory[];
}) {
  const [activeStoryIndex, setActiveStoryIndex] = useState<number | null>(null);

  if (!stories || stories.length === 0) return null;

  return (
    <section className="border-b border-line bg-surface py-8">
      <div className="mx-auto w-full max-w-6xl px-4">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Brand Stories</h2>
            <p className="text-xs text-muted">
              Tap to watch {stories[0]?.brandHandle || "@kidoclassic"} updates &amp; shop featured looks
            </p>
          </div>
          <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand-deep">
            {stories.length} Stories
          </span>
        </div>

        {/* Horizontal Carousel */}
        <div className="flex gap-4 overflow-x-auto pb-4 pt-1 scrollbar-none snap-x snap-mandatory">
          {stories.map((story, idx) => (
            <button
              key={story.id}
              type="button"
              onClick={() => setActiveStoryIndex(idx)}
              className="group relative flex w-32 shrink-0 flex-col items-center snap-start text-center outline-none"
            >
              {/* Vertical Card Container with Instagram-style Ring */}
              <div className="relative h-48 w-32 overflow-hidden rounded-2xl p-[3px] bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 shadow-md transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-xl group-hover:ring-4 group-hover:ring-brand/20">
                <div className="relative size-full overflow-hidden rounded-[13px] bg-black">
                  <Image
                    src={story.coverImage}
                    alt={story.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  {/* Subtle dark gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />

                  {/* Brand handle avatar badge */}
                  <div className="absolute top-2 left-2 flex items-center gap-1.5">
                    <div className="size-6 rounded-full border border-white/80 overflow-hidden relative">
                      <Image
                        src={story.coverImage}
                        alt="Avatar"
                        fill
                        className="object-cover"
                      />
                    </div>
                  </div>

                  {/* Title overlay at bottom */}
                  <div className="absolute bottom-2 inset-x-2 text-left">
                    <p className="line-clamp-2 text-xs font-semibold text-white leading-tight drop-shadow-sm">
                      {story.title}
                    </p>
                    <p className="mt-0.5 text-[10px] text-white/80 truncate">
                      {story.slides.length} {story.slides.length === 1 ? "item" : "items"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Brand handle label below card */}
              <span className="mt-2 text-xs font-medium text-foreground truncate max-w-full">
                {story.brandHandle}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Full-Screen Interactive Story Viewer Modal */}
      {activeStoryIndex !== null && (
        <StoryViewerModal
          stories={stories}
          initialStoryIndex={activeStoryIndex}
          onClose={() => setActiveStoryIndex(null)}
        />
      )}
    </section>
  );
}
