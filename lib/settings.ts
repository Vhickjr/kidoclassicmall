import { cookies } from "next/headers";

export const SETTINGS_COOKIE = "kido_settings";

export type Settings = {
  appearance: "light" | "dark";
  language: string;
  twoFactor: boolean;
  pushNotifications: boolean;
  desktopNotifications: boolean;
  emailNotifications: boolean;
};

export const DEFAULT_SETTINGS: Settings = {
  appearance: "light",
  language: "English",
  twoFactor: false,
  pushNotifications: true,
  desktopNotifications: false,
  emailNotifications: true,
};

/** Preferences live in a cookie rather than a table, so they work for a guest
 *  and survive without a login. They move to the User row when auth lands. */
export async function readSettings(): Promise<Settings> {
  const jar = await cookies();
  const raw = jar.get(SETTINGS_COOKIE)?.value;

  if (!raw) return DEFAULT_SETTINGS;

  try {
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}
