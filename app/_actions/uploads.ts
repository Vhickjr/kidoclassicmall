"use server";

import { requireAdmin } from "@/lib/auth";
import {
  UPLOAD_FOLDER,
  cloudinaryConfig,
  signParams,
} from "@/lib/cloudinary";

export type UploadTicket =
  | {
      ok: true;
      cloudName: string;
      apiKey: string;
      timestamp: number;
      folder: string;
      signature: string;
    }
  | { ok: false; error: string };

/**
 * Hands the browser a signature valid for one upload.
 *
 * Staff only. Unsigned uploads stay switched off in Cloudinary, so without this
 * action there is no route for a stranger to put files in the account.
 */
export async function createUploadTicket(): Promise<UploadTicket> {
  if (!(await requireAdmin())) {
    return { ok: false, error: "Not authorised." };
  }

  const config = cloudinaryConfig();
  if (!config) {
    return {
      ok: false,
      error:
        "Cloudinary is not configured. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET.",
    };
  }

  const timestamp = Math.floor(Date.now() / 1000);

  return {
    ok: true,
    cloudName: config.cloudName,
    apiKey: config.apiKey,
    timestamp,
    folder: UPLOAD_FOLDER,
    signature: signParams(
      { folder: UPLOAD_FOLDER, timestamp: String(timestamp) },
      config.apiSecret
    ),
  };
}
