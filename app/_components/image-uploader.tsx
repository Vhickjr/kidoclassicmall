"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { createUploadTicket } from "@/app/_actions/uploads";

/** One picture or clip in the picker. Either it is already in Cloudinary and
 *  has a URL, or it is still a file on this machine waiting for Save. */
type Item =
  | { kind: "uploaded"; url: string }
  | { kind: "pending"; file: File; preview: string };

const isVideo = (value: string) => /\.(mp4|webm|mov)(\?|$)/i.test(value);

/**
 * Picks images and videos, and sends them to Cloudinary only when the
 * surrounding form is saved.
 *
 * Nothing leaves the browser at the moment a file is chosen: an abandoned form
 * used to leave the uploaded file orphaned in the Cloudinary account with
 * nothing in the database pointing at it. Files are held here, previewed from
 * a local object URL, and uploaded in one go when the form is submitted.
 */
export default function ImageUploader({
  name,
  initial = [],
  multiple = true,
  accept = "image/*",
  onChange,
  onRegisterUpload,
}: {
  name?: string;
  initial?: string[];
  multiple?: boolean;
  /** Pass "image/*,video/*" for story slides, which may be either. */
  accept?: string;
  onChange?: (urls: string[]) => void;
  /** Lets a parent that saves by itself (rather than by submitting a form)
   *  flush the pending files first and get the final URLs back. */
  onRegisterUpload?: (upload: () => Promise<string[]>) => void;
}) {
  const [items, setItems] = useState<Item[]>(
    initial.map((url) => ({ kind: "uploaded", url }))
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // The submit interceptor runs outside React, so it reads the latest items
  // through a ref rather than a captured closure. Assigned in an effect, not
  // during render, which is the rule refs are there to respect.
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const formRef = useRef<HTMLFormElement | null>(null);
  const anchorRef = useRef<HTMLDivElement | null>(null);

  const uploadedUrls = items.flatMap((item) =>
    item.kind === "uploaded" ? [item.url] : []
  );

  /** Sends every pending file and returns the full, ordered URL list. */
  const uploadPending = useCallback(async (): Promise<string[]> => {
    const current = itemsRef.current;
    if (!current.some((item) => item.kind === "pending")) {
      return current.map((item) => (item as { url: string }).url);
    }

    setBusy(true);
    setError(null);

    try {
      const ticket = await createUploadTicket();
      if (!ticket.ok) {
        setError(ticket.error);
        throw new Error(ticket.error);
      }

      const settled: Item[] = [];

      for (const item of current) {
        if (item.kind === "uploaded") {
          settled.push(item);
          continue;
        }

        const body = new FormData();
        body.append("file", item.file);
        body.append("api_key", ticket.apiKey);
        body.append("timestamp", String(ticket.timestamp));
        body.append("folder", ticket.folder);
        body.append("signature", ticket.signature);

        // "auto" lets Cloudinary decide between image and video from the file
        // itself, which is what story slides need.
        const resourceType = accept.includes("video") ? "auto" : "image";

        const response = await fetch(
          `https://api.cloudinary.com/v1_1/${ticket.cloudName}/${resourceType}/upload`,
          { method: "POST", body }
        );

        if (!response.ok) {
          const detail = await response.json().catch(() => null);
          const message =
            detail?.error?.message ?? `Upload failed for ${item.file.name}.`;
          setError(message);
          throw new Error(message);
        }

        const result = await response.json();
        URL.revokeObjectURL(item.preview);
        settled.push({ kind: "uploaded", url: result.secure_url as string });
      }

      setItems(settled);
      const urls = settled.map((item) => (item as { url: string }).url);
      onChange?.(urls);
      return urls;
    } finally {
      setBusy(false);
    }
  }, [accept, onChange]);

  useEffect(() => {
    onRegisterUpload?.(uploadPending);
  }, [onRegisterUpload, uploadPending]);

  // Intercept the enclosing form's submit, so a plain server-action form gets
  // the files uploaded and written into its hidden input before it posts.
  useEffect(() => {
    if (!name) return;

    const form = anchorRef.current?.closest("form");
    if (!form) return;
    formRef.current = form;

    let flushing = false;

    const onSubmit = (event: Event) => {
      if (flushing) return;
      if (!itemsRef.current.some((item) => item.kind === "pending")) return;

      event.preventDefault();
      event.stopPropagation();

      void (async () => {
        try {
          await uploadPending();
          flushing = true;
          // Let React write the new URLs into the hidden input before the
          // form is sent again.
          requestAnimationFrame(() => {
            form.requestSubmit();
            flushing = false;
          });
        } catch {
          // uploadPending has already put the reason on screen; the form stays
          // put so nothing is saved with a missing picture.
        }
      })();
    };

    form.addEventListener("submit", onSubmit, true);
    return () => form.removeEventListener("submit", onSubmit, true);
  }, [name, uploadPending]);

  // Object URLs are held by the browser until released.
  useEffect(() => {
    return () => {
      for (const item of itemsRef.current) {
        if (item.kind === "pending") URL.revokeObjectURL(item.preview);
      }
    };
  }, []);

  function addFiles(chosen: File[]) {
    setError(null);

    const added: Item[] = chosen.map((file) => ({
      kind: "pending",
      file,
      preview: URL.createObjectURL(file),
    }));

    setItems((prev) => {
      const next = multiple ? [...prev, ...added] : added.slice(-1);

      // Replacing a single-slot picker drops whatever was there.
      if (!multiple) {
        for (const item of prev) {
          if (item.kind === "pending") URL.revokeObjectURL(item.preview);
        }
      }

      return next;
    });
  }

  function remove(index: number) {
    setItems((prev) => {
      const target = prev[index];
      if (target?.kind === "pending") URL.revokeObjectURL(target.preview);

      const next = prev.filter((_, i) => i !== index);
      onChange?.(
        next.flatMap((item) => (item.kind === "uploaded" ? [item.url] : []))
      );
      return next;
    });
  }

  const pendingCount = items.filter((item) => item.kind === "pending").length;

  return (
    <div ref={anchorRef}>
      {/* Only what is actually in Cloudinary goes to the server. The submit
          interceptor above fills this in before the form is allowed through. */}
      {name && <input type="hidden" name={name} value={uploadedUrls.join("\n")} />}

      {items.length > 0 && (
        <ul className="mb-3 flex flex-wrap gap-3">
          {items.map((item, index) => {
            const src = item.kind === "uploaded" ? item.url : item.preview;
            const video =
              item.kind === "uploaded"
                ? isVideo(item.url)
                : item.file.type.startsWith("video/");

            return (
              <li key={src} className="relative">
                {video ? (
                  <video
                    src={src}
                    muted
                    className="size-20 rounded border border-line bg-brand-soft/40 object-cover"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={src}
                    alt={`Upload ${index + 1}`}
                    className="size-20 rounded border border-line bg-brand-soft/40 object-cover"
                  />
                )}

                <button
                  type="button"
                  aria-label={`Remove image ${index + 1}`}
                  onClick={() => remove(index)}
                  className="absolute -right-2 -top-2 flex size-6 items-center justify-center rounded-full bg-surface shadow ring-1 ring-line"
                >
                  <X aria-hidden className="size-3.5" />
                </button>

                {item.kind === "pending" && (
                  <span className="absolute inset-x-0 top-0 bg-foreground/70 py-0.5 text-center text-[10px] text-white">
                    Not saved
                  </span>
                )}

                {index === 0 && multiple && (
                  <span className="absolute inset-x-0 bottom-0 bg-brand/90 py-0.5 text-center text-[10px] text-white">
                    Cover
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <label className="inline-flex cursor-pointer items-center gap-2 border border-line px-4 py-2.5 text-sm hover:border-brand">
        {busy ? (
          <Loader2 aria-hidden className="size-4 animate-spin" />
        ) : (
          <ImagePlus aria-hidden className="size-4" />
        )}
        {busy
          ? "Uploading…"
          : accept.includes("video")
            ? "Choose image or video"
            : multiple
              ? "Choose images"
              : "Choose image"}
        <input
          type="file"
          accept={accept}
          multiple={multiple}
          disabled={busy}
          className="hidden"
          onChange={(event) => {
            const input = event.target;

            // Copied out before anything else touches the input. `input.files`
            // is a live FileList: clearing the value empties the very object
            // handed on, which is how this silently did nothing at all.
            const chosen = Array.from(input.files ?? []);
            if (chosen.length === 0) return;

            input.value = "";
            addFiles(chosen);
          }}
        />
      </label>

      {pendingCount > 0 && (
        <p className="mt-2 text-xs text-muted">
          {pendingCount === 1
            ? "1 file will be uploaded when you save."
            : `${pendingCount} files will be uploaded when you save.`}
        </p>
      )}

      {multiple && items.length > 1 && (
        <p className="mt-2 text-xs text-muted">
          The first image is used on product cards.
        </p>
      )}

      {error && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
