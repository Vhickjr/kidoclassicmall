import type { Metadata } from "next";
import { Trash2 } from "lucide-react";
import { getPrisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { deleteDeal, saveDeal } from "@/app/_actions/admin";
import ImageUploader from "@/app/_components/image-uploader";
import SubmitButton from "@/app/_components/submit-button";

export const metadata: Metadata = { title: "Deals of the Month" };

/** datetime-local wants "YYYY-MM-DDTHH:mm" in local time. */
function forInput(date: Date): string {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export default async function AdminDealsPage({
  searchParams,
}: PageProps<"/admin/deals">) {
  if (!(await requireAdmin())) return null;

  const params = await searchParams;
  const editingId = typeof params.edit === "string" ? params.edit : null;

  const deals = await getPrisma().deal.findMany({ orderBy: { createdAt: "desc" } });
  const editing = deals.find((deal) => deal.id === editingId) ?? null;

  const defaultEnds = new Date();
  defaultEnds.setMonth(defaultEnds.getMonth() + 1);

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Deals of the Month</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        The active deal fills the countdown block on the home page. Only the most
        recent active one is shown; switch the others off.
      </p>

      <form action={saveDeal} className="mt-8 max-w-2xl border border-line p-6">
        <h2 className="font-semibold">{editing ? "Edit deal" : "New deal"}</h2>
        {editing && <input type="hidden" name="dealId" value={editing.id} />}

        <label className="mt-5 block">
          <span className="text-xs text-muted">Title</span>
          <input
            name="title"
            required
            defaultValue={editing?.title ?? "Deals of the Month"}
            className="mt-1.5 w-full border border-line px-4 py-3 text-sm outline-none focus:border-brand"
          />
        </label>

        <label className="mt-5 block">
          <span className="text-xs text-muted">Description</span>
          <textarea
            name="body"
            rows={4}
            defaultValue={editing?.body ?? ""}
            className="mt-1.5 w-full border border-line px-4 py-3 text-sm outline-none focus:border-brand"
          />
        </label>

        <label className="mt-5 block">
          <span className="text-xs text-muted">Countdown ends at</span>
          <input
            type="datetime-local"
            name="endsAt"
            required
            defaultValue={forInput(editing?.endsAt ?? defaultEnds)}
            className="mt-1.5 block border border-line px-4 py-3 text-sm outline-none focus:border-brand"
          />
        </label>

        <div className="mt-5">
          <span className="text-xs text-muted">Image</span>
          <div className="mt-1.5">
            <ImageUploader
              name="imageUrl"
              multiple={false}
              initial={editing?.imageUrl ? [editing.imageUrl] : []}
            />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-4">
          <label className="block flex-1">
            <span className="text-xs text-muted">Button label</span>
            <input
              name="ctaLabel"
              defaultValue={editing?.ctaLabel ?? "View all products"}
              className="mt-1.5 w-full border border-line px-4 py-3 text-sm outline-none focus:border-brand"
            />
          </label>
          <label className="block flex-1">
            <span className="text-xs text-muted">Button link</span>
            <input
              name="ctaHref"
              defaultValue={editing?.ctaHref ?? "/shop"}
              className="mt-1.5 w-full border border-line px-4 py-3 text-sm outline-none focus:border-brand"
            />
          </label>
        </div>

        <label className="mt-5 flex items-center gap-2.5 text-sm">
          <input
            type="checkbox"
            name="active"
            defaultChecked={editing?.active ?? true}
            className="size-4 accent-brand"
          />
          Show on the home page
        </label>

        <div className="mt-6 flex gap-3">
          {editing && (
            <a href="/admin/deals" className="bg-line/60 px-6 py-3 text-sm hover:bg-line">
              Cancel
            </a>
          )}
          <SubmitButton variant="primary">{editing ? "Save changes" : "Create deal"}</SubmitButton>
        </div>
      </form>

      {deals.length > 0 && (
        <ul className="mt-10 divide-y divide-line border-y border-line">
          {deals.map((deal) => (
            <li key={deal.id} className="flex flex-wrap items-center gap-4 py-4">
              <div className="min-w-48 flex-1">
                <p className="text-sm font-semibold">{deal.title}</p>
                <p className="mt-0.5 text-sm text-muted">
                  ends {deal.endsAt.toLocaleString("en-NG")}
                  {deal.endsAt < new Date() && " · expired"}
                </p>
              </div>

              <span
                className={`px-2 py-1 text-xs ${
                  deal.active ? "bg-green-100 text-green-800" : "bg-line text-muted"
                }`}
              >
                {deal.active ? "Live" : "Off"}
              </span>

              <a href={`/admin/deals?edit=${deal.id}`} className="text-sm underline">
                Edit
              </a>

              <form action={deleteDeal}>
                <input type="hidden" name="dealId" value={deal.id} />
                <SubmitButton variant="danger"><Trash2 aria-hidden className="size-3.5" />
                  Delete</SubmitButton>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
