import type { Metadata } from "next";
import { Bell, KeyRound, Package, Truck, User } from "lucide-react";
import { getPrisma } from "@/lib/prisma";
import { readSessionId } from "@/lib/cart";
import { markNotificationsRead } from "@/app/_actions/account";

export const metadata: Metadata = { title: "Notifications" };

const ICONS: Record<string, typeof Bell> = {
  "order-placed": Package,
  "order-delivered": Truck,
  "profile-update": User,
  "password-update": KeyRound,
};

function when(date: Date) {
  const minutes = Math.floor((Date.now() - date.getTime()) / 60000);

  if (minutes < 2) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  if (minutes < 60 * 24) {
    return date.toLocaleTimeString("en-NG", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  if (minutes < 60 * 48) return "Yesterday";

  return date.toLocaleDateString("en-NG", { day: "numeric", month: "short" });
}

export default async function NotificationsPage() {
  const sessionId = await readSessionId();

  const notifications = sessionId
    ? await getPrisma().notification.findMany({
        where: { sessionId },
        orderBy: { createdAt: "desc" },
        take: 50,
      })
    : [];

  const unread = notifications.filter((item) => item.readAt === null).length;

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-semibold">Notifications</h2>
        {unread > 0 && (
          <form action={markNotificationsRead}>
            <button type="submit" className="text-sm underline">
              Mark all as read
            </button>
          </form>
        )}
      </div>

      {notifications.length === 0 ? (
        <p className="mt-6 text-sm text-muted">
          Nothing yet. Placing an order will show up here.
        </p>
      ) : (
        <ul className="mt-6 divide-y divide-line border-t border-line">
          {notifications.map((item) => {
            const Icon = ICONS[item.kind] ?? Bell;

            return (
              <li key={item.id} className="flex items-start gap-4 py-5">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-soft/60">
                  <Icon aria-hidden className="size-4" />
                </span>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">
                    {item.title}
                    {item.readAt === null && (
                      <span className="ml-2 align-middle text-xs text-red-500">
                        &bull; new
                      </span>
                    )}
                  </p>
                  {item.body && (
                    <p className="mt-1 text-sm text-muted">{item.body}</p>
                  )}
                </div>

                <span className="shrink-0 text-sm text-muted">
                  {when(item.createdAt)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
