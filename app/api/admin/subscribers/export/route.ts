import { getPrisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

/** CSV rather than a real .xlsx: Excel, Numbers and Google Sheets all open it,
 *  and every mailing-list provider imports it, with no library to maintain. */
function csvCell(value: string): string {
  // A leading =, +, - or @ is treated as a formula by spreadsheet apps, so it is
  // prefixed to stop a crafted address running as one.
  const safe = /^[=+\-@]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

export async function GET() {
  if (!(await requireAdmin())) {
    return new Response("Not authorised.", { status: 401 });
  }

  const subscribers = await getPrisma().subscriber.findMany({
    where: { unsubscribedAt: null },
    orderBy: { createdAt: "desc" },
  });

  const rows = [
    ["email", "source", "subscribed_at"],
    ...subscribers.map((s) => [
      s.email,
      s.source,
      s.createdAt.toISOString(),
    ]),
  ];

  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
  const stamp = new Date().toISOString().slice(0, 10);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="kidoclassic-subscribers-${stamp}.csv"`,
    },
  });
}
