import type { Metadata } from "next";
import { readSettings } from "@/lib/settings";
import { saveSettings } from "@/app/_actions/account";

export const metadata: Metadata = { title: "Settings" };

const TOGGLES = [
  {
    name: "twoFactor",
    label: "Two-factor Authentication",
    body: "Keep your account secure by enabling 2FA via email.",
    note: "Stored, but nothing enforces it until logins exist.",
  },
  {
    name: "pushNotifications",
    label: "Push Notifications",
    body: "Receive push notifications.",
    note: "Stored; no push service is connected.",
  },
  {
    name: "desktopNotifications",
    label: "Desktop Notification",
    body: "Receive notifications on desktop.",
    note: "Stored; no push service is connected.",
  },
  {
    name: "emailNotifications",
    label: "Email Notifications",
    body: "Receive email notifications.",
    note: "Stored; no email provider is connected.",
  },
] as const;

export default async function SettingsPage() {
  const settings = await readSettings();

  return (
    <div>
      <h2 className="font-semibold">Settings</h2>

      <form action={saveSettings} className="mt-6">
        <ul className="divide-y divide-line border-y border-line">
          <li className="flex flex-wrap items-center justify-between gap-4 py-5">
            <div>
              <p className="text-sm font-semibold">Appearance</p>
              <p className="mt-1 text-sm text-muted">
                Customise how the store looks on this device.
              </p>
            </div>
            <select
              name="appearance"
              defaultValue={settings.appearance}
              aria-label="Appearance"
              className="border border-line px-3 py-2 text-sm"
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </li>

          <li className="flex flex-wrap items-center justify-between gap-4 py-5">
            <div>
              <p className="text-sm font-semibold">Language</p>
              <p className="mt-1 text-sm text-muted">
                Select your language. Only English exists so far.
              </p>
            </div>
            <select
              name="language"
              defaultValue={settings.language}
              aria-label="Language"
              className="border border-line px-3 py-2 text-sm"
            >
              <option value="English">English</option>
            </select>
          </li>

          {TOGGLES.map((toggle) => (
            <li
              key={toggle.name}
              className="flex flex-wrap items-center justify-between gap-4 py-5"
            >
              <div>
                <p className="text-sm font-semibold">{toggle.label}</p>
                <p className="mt-1 text-sm text-muted">{toggle.body}</p>
                <p className="mt-1 text-xs text-muted">{toggle.note}</p>
              </div>
              <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name={toggle.name}
                  defaultChecked={settings[toggle.name]}
                  className="size-5 accent-brand"
                />
                <span className="sr-only">{toggle.label}</span>
              </label>
            </li>
          ))}
        </ul>

        <button
          type="submit"
          className="mt-6 bg-brand px-8 py-3.5 text-sm text-white"
        >
          Save settings
        </button>
      </form>

      <p className="mt-6 rounded border border-dashed border-line px-3 py-2 text-xs text-muted">
        Appearance takes effect immediately. Preferences are kept in a cookie for
        this browser and will move onto your account once logins exist.
      </p>
    </div>
  );
}
