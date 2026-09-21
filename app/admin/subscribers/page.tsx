import type { Metadata } from "next";
import { Download, Trash2 } from "lucide-react";
import { getPrisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { broadcastToSubscribers, removeSubscriber } from "@/app/_actions/admin";
import SubmitButton from "@/app/_components/submit-button";

export const metadata: Metadata = { title: "Subscribers" };

export default async function AdminSubscribersPage() {
  if (!(await requireAdmin())) return null;

  const prisma = getPrisma();

  const [subscribers, unsubscribed] = await Promise.all([
    prisma.subscriber.findMany({
      where: { unsubscribedAt: null },
      orderBy: { createdAt: "desc" },
      take: 500,
    }),
    prisma.subscriber.count({ where: { unsubscribedAt: { not: null } } }),
  ]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Subscribers</h1>
          <p className="mt-1 text-sm text-muted">
            {subscribers.length} active
            {unsubscribed > 0 && ` · ${unsubscribed} unsubscribed`}
          </p>
        </div>

        <a
          href="/api/admin/subscribers/export"
          className="flex items-center gap-2 border border-brand px-5 py-2.5 text-sm text-brand-deep hover:bg-brand-soft/40"
        >
          <Download aria-hidden className="size-4" />
          Export CSV
        </a>
      </div>

      <p className="mt-3 max-w-2xl text-xs text-muted">
        The CSV opens directly in Excel, Numbers or Google Sheets, and imports
        into Mailchimp, Brevo and the rest. Only active subscribers are included.
      </p>

      <section className="mt-10 max-w-2xl border border-line p-6">
        <h2 className="font-semibold">Email all subscribers</h2>
        <p className="mt-1 text-sm text-muted">
          Sent from your store address with everyone in BCC, so no recipient sees
          another&rsquo;s address.
        </p>

        <form action={broadcastToSubscribers} className="mt-5">
          <label className="block">
            <span className="text-xs text-muted">Subject</span>
            <input
              name="subject"
              required
              placeholder="New arrivals this week"
              className="mt-1.5 w-full border border-line px-4 py-3 text-sm outline-none focus:border-brand"
            />
          </label>

          <label className="mt-4 block">
            <span className="text-xs text-muted">Message</span>
            <textarea
              name="body"
              rows={7}
              required
              placeholder={"Hello,\n\nA blank line starts a new paragraph."}
              className="mt-1.5 w-full border border-line px-4 py-3 text-sm outline-none focus:border-brand"
            />
          </label>

          <SubmitButton variant="primary"
            disabled={subscribers.length === 0} className="mt-5">Send to {subscribers.length}{" "}
            {subscribers.length === 1 ? "subscriber" : "subscribers"}</SubmitButton>
        </form>

        <p className="mt-3 text-xs text-muted">
          Sent in batches of 40. There is no undo, so read it twice.
        </p>
      </section>

      {subscribers.length === 0 ? (
        <p className="mt-10 text-muted">
          No subscribers yet. The footer form on the storefront adds them.
        </p>
      ) : (
        <ul className="mt-10 divide-y divide-line border-y border-line">
          {subscribers.map((subscriber) => (
            <li
              key={subscriber.id}
              className="flex flex-wrap items-center gap-4 py-3"
            >
              <p className="min-w-56 flex-1 text-sm">{subscriber.email}</p>
              <p className="text-sm text-muted">{subscriber.source}</p>
              <p className="text-sm text-muted">
                {subscriber.createdAt.toLocaleDateString("en-NG", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </p>

              <form action={removeSubscriber}>
                <input
                  type="hidden"
                  name="subscriberId"
                  value={subscriber.id}
                />
                <SubmitButton variant="danger"><Trash2 aria-hidden className="size-3.5" />
                  Unsubscribe</SubmitButton>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
