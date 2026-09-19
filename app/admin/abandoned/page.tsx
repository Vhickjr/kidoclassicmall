import type { Metadata } from "next";
import { MailCheck, Send } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { abandonedCheckouts } from "@/lib/abandoned";
import { storeSettings } from "@/lib/settings-store";
import { koboToNaira } from "@/lib/format";
import { sendAbandonedFollowUpAction } from "@/app/_actions/admin";

export const metadata: Metadata = { title: "Abandoned checkouts" };

function ago(date: Date): string {
  const hours = Math.floor((Date.now() - date.getTime()) / 3_600_000);
  if (hours < 1) return "under an hour";
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"}`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"}`;
}

export default async function AdminAbandonedPage() {
  // The gate has to sit here, not only in the layout: a layout returning early
  // does not stop its child page running, and customer emails would still
  // reach the client in the RSC payload.
  if (!(await requireAdmin())) return null;

  // Zero, so staff can see baskets that are still inside the waiting period —
  // the automatic mail respects the configured wait, this list does not have to.
  const [entries, settings] = await Promise.all([
    abandonedCheckouts(0),
    storeSettings(),
  ]);

  const recoverable = entries.filter((entry) => entry.email);
  const valueKobo = recoverable.reduce((sum, e) => sum + e.totalKobo, 0);

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Abandoned checkouts</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Baskets that went quiet, and orders that reached the payment step and
        were never paid. {koboToNaira(valueKobo)} across {recoverable.length}{" "}
        {recoverable.length === 1 ? "checkout" : "checkouts"} you can still
        reach.
      </p>

      <p className="mt-3 max-w-2xl text-sm text-muted">
        {settings.abandoned.enabled ? (
          <>
            Reminders send automatically after{" "}
            <strong>{settings.abandoned.afterHours} hours</strong>. You can
            still send one by hand at any time.
          </>
        ) : (
          <>
            Automatic reminders are <strong>off</strong> — switch them on under
            Store settings, or send each one by hand below.
          </>
        )}
      </p>

      {entries.length === 0 ? (
        <p className="mt-10 text-sm text-muted">
          Nothing abandoned right now.
        </p>
      ) : (
        <ul className="mt-8 divide-y divide-line border-y border-line">
          {entries.map((entry) => (
            <li
              key={`${entry.kind}:${entry.id}`}
              className="flex flex-wrap items-center justify-between gap-4 py-4"
            >
              <div className="min-w-56">
                <p className="text-sm font-semibold">
                  {entry.email ?? "Guest — no email on file"}
                </p>
                <p className="mt-0.5 text-sm text-muted">
                  {entry.name ? `${entry.name} · ` : ""}
                  {entry.itemCount} item{entry.itemCount === 1 ? "" : "s"} ·{" "}
                  {koboToNaira(entry.totalKobo)}
                </p>
                <p className="mt-0.5 text-xs text-muted">
                  {entry.kind === "order"
                    ? "Reached payment, never paid"
                    : "Left in the basket"}{" "}
                  · {ago(entry.lastActivity)} ago
                  {entry.phone ? ` · ${entry.phone}` : ""}
                </p>
              </div>

              {entry.email ? (
                <form action={sendAbandonedFollowUpAction}>
                  <input type="hidden" name="kind" value={entry.kind} />
                  <input type="hidden" name="id" value={entry.id} />
                  <button
                    type="submit"
                    className="flex items-center gap-2 border border-brand px-4 py-2.5 text-sm text-brand-deep hover:bg-brand-soft/40"
                  >
                    {entry.followUpSentAt ? (
                      <>
                        <MailCheck aria-hidden className="size-4" />
                        Send again
                      </>
                    ) : (
                      <>
                        <Send aria-hidden className="size-4" />
                        Send follow-up
                      </>
                    )}
                  </button>
                  {entry.followUpSentAt && (
                    <p className="mt-1 text-xs text-muted">
                      Sent {ago(entry.followUpSentAt)} ago
                    </p>
                  )}
                </form>
              ) : (
                // Honest about the limit rather than showing a dead button:
                // a guest who never reached the payment step left no address.
                <p className="max-w-56 text-xs text-muted">
                  No way to contact this one — a guest only leaves an email once
                  they reach the payment step.
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
