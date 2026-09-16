"use client";

import { useState, useTransition } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { createUploadTicket } from "@/app/_actions/uploads";

/**
 * Uploads straight from the browser to Cloudinary and keeps the resulting URLs.
 *
 * Works two ways so it can drop into either admin screen: `name` writes the URLs
 * into a hidden input for a plain form post, and `onChange` reports them to a
 * parent that builds its own JSON body.
 */
export default function ImageUploader({
  name,
  initial = [],
  multiple = true,
  onChange,
}: {
  name?: string;
  initial?: string[];
  multiple?: boolean;
  onChange?: (urls: string[]) => void;
}) {
  const [urls, setUrls] = useState<string[]>(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function commit(next: string[]) {
    setUrls(next);
    onChange?.(next);
  }

  async function uploadAll(files: FileList) {
    setError(null);

    const ticket = await createUploadTicket();
    if (!ticket.ok) {
      setError(ticket.error);
      return;
    }

    const uploaded: string[] = [];

    for (const file of Array.from(files)) {
      const body = new FormData();
      body.append("file", file);
      body.append("api_key", ticket.apiKey);
      body.append("timestamp", String(ticket.timestamp));
      body.append("folder", ticket.folder);
      body.append("signature", ticket.signature);

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${ticket.cloudName}/image/upload`,
        { method: "POST", body }
      );

      if (!response.ok) {
        const detail = await response.json().catch(() => null);
        setError(detail?.error?.message ?? `Upload failed for ${file.name}.`);
        break;
      }

      const result = await response.json();
      uploaded.push(result.secure_url as string);
    }

    if (uploaded.length > 0) {
      commit(multiple ? [...urls, ...uploaded] : uploaded.slice(-1));
    }
  }

  return (
    <div>
      {name && <input type="hidden" name={name} value={urls.join("\n")} />}

      {urls.length > 0 && (
        <ul className="mb-3 flex flex-wrap gap-3">
          {urls.map((url, index) => (
            <li key={url} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`Image ${index + 1}`}
                className="size-20 rounded border border-line bg-brand-soft/40 object-cover"
              />
              <button
                type="button"
                aria-label={`Remove image ${index + 1}`}
                onClick={() => commit(urls.filter((item) => item !== url))}
                className="absolute -right-2 -top-2 flex size-6 items-center justify-center rounded-full bg-surface shadow ring-1 ring-line"
              >
                <X aria-hidden className="size-3.5" />
              </button>
              {index === 0 && multiple && (
                <span className="absolute inset-x-0 bottom-0 bg-brand/90 py-0.5 text-center text-[10px] text-white">
                  Cover
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      <label className="inline-flex cursor-pointer items-center gap-2 border border-line px-4 py-2.5 text-sm hover:border-brand">
        {pending ? (
          <Loader2 aria-hidden className="size-4 animate-spin" />
        ) : (
          <ImagePlus aria-hidden className="size-4" />
        )}
        {pending ? "Uploading…" : multiple ? "Upload images" : "Upload image"}
        <input
          type="file"
          accept="image/*"
          multiple={multiple}
          disabled={pending}
          className="hidden"
          onChange={(event) => {
            const files = event.target.files;
            if (!files || files.length === 0) return;
            startTransition(async () => {
              await uploadAll(files);
            });
            // Let the same file be chosen again after a removal.
            event.target.value = "";
          }}
        />
      </label>

      {multiple && urls.length > 1 && (
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
