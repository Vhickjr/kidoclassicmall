import { createHash } from "node:crypto";

/**
 * Signed uploads without the Cloudinary SDK.
 *
 * The browser sends the file straight to Cloudinary; only a short-lived
 * signature passes through this app. On shared hosting that matters — routing
 * photographs through the Node process would spend its memory on work Cloudinary
 * will do anyway.
 *
 * Signing is a plain sha1, so there is no native dependency to compile, the same
 * reasoning behind using scrypt for passwords.
 */
export type CloudinaryConfig = {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
};

export function cloudinaryConfig(): CloudinaryConfig | null {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) return null;
  return { cloudName, apiKey, apiSecret };
}

/** Which Cloudinary variables are missing, for the admin settings page.
 *  Same trap as email: these live in the server's environment, so uploads can
 *  work perfectly in development and fail silently on the live site. */
export function uploadStatus(): {
  configured: boolean;
  cloudName: string | null;
  missing: string[];
} {
  const missing = (
    ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"] as const
  ).filter((key) => !process.env[key]);

  return {
    configured: missing.length === 0,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME ?? null,
    missing,
  };
}

export function isCloudinaryConfigured(): boolean {
  return cloudinaryConfig() !== null;
}

/**
 * Cloudinary signs the alphabetically sorted parameters, excluding `file`,
 * `api_key` and `resource_type`, with the API secret appended.
 */
export function signParams(
  params: Record<string, string>,
  secret: string
): string {
  const canonical = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");

  return createHash("sha1").update(canonical + secret).digest("hex");
}

export const UPLOAD_FOLDER = "kidoclassic";

/**
 * Cloudinary identifies a file by its `public_id`, not by its URL, so deleting
 * one means recovering that id from the URL we stored.
 *
 * A delivery URL looks like:
 *   https://res.cloudinary.com/<cloud>/image/upload/v1712345678/kidoclassic/abc.jpg
 * The id is everything after the version segment, without the extension:
 *   kidoclassic/abc
 *
 * Returns null for anything that is not one of our Cloudinary URLs, so pasted
 * third-party links are left alone rather than producing bogus delete calls.
 */
export function publicIdFromUrl(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  if (parsed.hostname !== "res.cloudinary.com") return null;

  const marker = "/upload/";
  const at = parsed.pathname.indexOf(marker);
  if (at === -1) return null;

  const segments = parsed.pathname.slice(at + marker.length).split("/");

  // Drop transformation segments (they contain "_", e.g. w_200) and the version.
  while (segments.length > 1 && /^(v\d+|[a-z]+_[^/]+)$/.test(segments[0])) {
    segments.shift();
  }

  const path = segments.join("/");
  if (!path) return null;

  return path.replace(/\.[a-z0-9]+$/i, "");
}

/** Cloudinary stores video under a different resource type, and deleting one
 *  through the image endpoint silently reports "not found" — so the type has to
 *  be picked from the URL before the call. */
function resourceTypeFor(url: string): "image" | "video" {
  // Cloudinary puts the resource type in the path: /video/upload/...
  if (/\/video\/upload\//.test(url)) return "video";
  if (/\.(mp4|webm|mov|m4v|avi|ogv)(\?|$)/i.test(url)) return "video";
  return "image";
}

/**
 * Permanently removes uploads from Cloudinary. Best effort: a failure here must
 * not fail the save or delete that triggered it, because the database is
 * already the source of truth for what the storefront shows.
 *
 * Safe to call with anything — non-Cloudinary URLs, blanks and duplicates are
 * dropped — so callers can hand it a raw "before" list without filtering.
 */
export async function destroyUploads(
  urls: (string | null | undefined)[]
): Promise<void> {
  const config = cloudinaryConfig();
  if (!config) return;

  const seen = new Set<string>();

  for (const url of urls) {
    if (!url) continue;

    const publicId = publicIdFromUrl(url);
    if (!publicId) continue;

    const resourceType = resourceTypeFor(url);
    const key = `${resourceType}:${publicId}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = signParams(
      { public_id: publicId, timestamp },
      config.apiSecret
    );

    const body = new FormData();
    body.append("public_id", publicId);
    body.append("api_key", config.apiKey);
    body.append("timestamp", timestamp);
    body.append("signature", signature);

    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${config.cloudName}/${resourceType}/destroy`,
        { method: "POST", body }
      );
      const result = await response.json().catch(() => null);

      if (result?.result !== "ok" && result?.result !== "not found") {
        console.error("cloudinary destroy failed", publicId, result);
      }
    } catch (error) {
      console.error("cloudinary destroy threw", publicId, error);
    }
  }
}

/**
 * Removes whatever appears in `before` but no longer in `after`.
 *
 * This is the shape every admin save needs: replacing a photo should clear out
 * the old file, while keeping the ones the admin left alone.
 */
export async function destroyRemoved(
  before: (string | null | undefined)[],
  after: (string | null | undefined)[]
): Promise<void> {
  const kept = new Set(after.filter(Boolean) as string[]);
  await destroyUploads(before.filter((url) => url && !kept.has(url)));
}

