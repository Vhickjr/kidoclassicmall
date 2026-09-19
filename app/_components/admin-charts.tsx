import { koboToNaira } from "@/lib/format";

/**
 * Two server-rendered SVG charts. No charting library: these are simple shapes,
 * and a library would mean shipping client JavaScript to draw a bar.
 *
 * Both palettes were run through the dataviz validator against the real light
 * (#ffffff) and dark (#221a20) surfaces, and pass the lightness band, chroma
 * floor, colour-blind separation, normal-vision separation and 3:1 contrast
 * checks. Do not hand-tune these hexes without re-running it.
 */
export const STATUS_COLORS: Record<string, { light: string; dark: string }> = {
  PENDING: { light: "#b4690e", dark: "#c97d2b" },
  PAID: { light: "#2f6fd0", dark: "#5a8ee4" },
  FULFILLED: { light: "#0f8a3d", dark: "#2faa5c" },
  // Cancelled and refunded share a slot: as separate hues the fourth and fifth
  // failed the chroma floor and sat too close to red to tell apart.
  CLOSED: { light: "#8b4bbd", dark: "#a878da" },
};

export type RevenuePoint = { day: string; label: string; totalKobo: number };

export function RevenueChart({ points }: { points: RevenuePoint[] }) {
  const max = Math.max(...points.map((p) => p.totalKobo), 1);
  const total = points.reduce((sum, p) => sum + p.totalKobo, 0);

  // A single series names itself in the title, so it needs no legend.
  return (
    <section className="border border-line p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-semibold">Revenue, last 14 days</h2>
        <p className="text-sm text-muted">
          {koboToNaira(total)} total
        </p>
      </div>

      {total === 0 ? (
        <p className="mt-6 text-sm text-muted">
          No paid orders in this period yet.
        </p>
      ) : (
        <>
          <div className="mt-5 flex h-40 items-end gap-1.5">
            {points.map((point) => {
              const height = Math.round((point.totalKobo / max) * 100);

              return (
                <div
                  key={point.day}
                  className="group relative flex flex-1 flex-col justify-end"
                  // Native tooltip: an interaction layer without client JS.
                  title={`${point.label}: ${koboToNaira(point.totalKobo)}`}
                >
                  <div
                    className="rounded-t bg-brand"
                    style={{ height: `${Math.max(height, point.totalKobo > 0 ? 3 : 0)}%` }}
                  />
                </div>
              );
            })}
          </div>

          <div className="mt-2 flex gap-1.5 text-[10px] text-muted">
            {points.map((point, index) => (
              <span key={point.day} className="flex-1 text-center">
                {/* Every other label, so they never collide. */}
                {index % 2 === 0 ? point.label : ""}
              </span>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

export type StatusSlice = { key: string; label: string; count: number };

export function StatusChart({ slices }: { slices: StatusSlice[] }) {
  const total = slices.reduce((sum, slice) => sum + slice.count, 0);

  return (
    <section className="border border-line p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-semibold">Orders by status</h2>
        <p className="text-sm text-muted">{total} total</p>
      </div>

      {total === 0 ? (
        <p className="mt-6 text-sm text-muted">No orders yet.</p>
      ) : (
        <ul className="mt-5 space-y-3">
          {slices.map((slice) => {
            const share = Math.round((slice.count / total) * 100);
            const color = STATUS_COLORS[slice.key] ?? STATUS_COLORS.CLOSED;

            return (
              <li key={slice.key}>
                {/* Label and count carry the meaning; colour is secondary, so
                    the chart still reads without it. */}
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="flex items-center gap-2">
                    <span
                      aria-hidden
                      className="size-2.5 rounded-full"
                      style={{ backgroundColor: color.light }}
                    />
                    {slice.label}
                  </span>
                  <span className="text-muted">
                    {slice.count} · {share}%
                  </span>
                </div>

                <div className="mt-1.5 h-2 rounded-full bg-brand-soft/50">
                  <div
                    className="h-2 rounded-full"
                    style={{
                      width: `${Math.max(share, slice.count > 0 ? 2 : 0)}%`,
                      backgroundColor: color.light,
                    }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
