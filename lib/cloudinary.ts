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

/**
 * Permanently removes images from Cloudinary. Best effort: a failure here must
 * not fail the product save that triggered it, because the database is already
 * the source of truth for what the storefront shows.
 */
export async function destroyImages(urls: string[]): Promise<void> {
  const config = cloudinaryConfig();
  if (!config) return;

  for (const url of urls) {
    const publicId = publicIdFromUrl(url);
    if (!publicId) continue;

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
        `https://api.cloudinary.com/v1_1/${config.cloudName}/image/destroy`,
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
