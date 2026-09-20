import { ChevronDown, Ruler } from "lucide-react";

/**
 * Kidoclassic's women's size chart, transcribed from the printed tag chart.
 *
 * Centimetres are the measurement on the garment tag; the inch figure beside
 * each is reproduced exactly as the source chart gives it, not recalculated,
 * so what a customer reads here matches what is sewn into the clothes.
 * (Several inch values in the source do not convert cleanly from their
 * centimetre figure — those are flagged in the notes to the admin, not
 * silently corrected here.)
 */
const SIZES = ["S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"] as const;

const ROWS: { label: string; cells: [string, string][] }[] = [
  {
    label: "Shoulder",
    cells: [
      ["38.75", "15.3"], ["40", "15.7"], ["41.25", "16.2"], ["42.5", "16.7"],
      ["43.75", "17.2"], ["45", "17.7"], ["46.25", "18.2"], ["47.5", "18.7"],
    ],
  },
  {
    label: "Bust",
    cells: [
      ["89", "35.0"], ["94", "37.0"], ["99", "39.0"], ["109", "42.9"],
      ["113", "44.9"], ["117", "46.9"], ["122", "48.9"], ["124", "48.8"],
    ],
  },
  {
    label: "Waist",
    cells: [
      ["97", "38.2"], ["105", "41.2"], ["108", "43.5"], ["113", "45.0"],
      ["118", "47.5"], ["124", "49.0"], ["133", "52.0"], ["138", "54.5"],
    ],
  },
  {
    label: "Hips",
    cells: [
      ["106", "41.5"], ["111", "43.5"], ["114", "45.0"], ["123", "48.5"],
      ["140", "55.0"], ["145", "57.0"], ["149", "58.5"], ["150", "60"],
    ],
  },
  {
    label: "Length",
    cells: [
      ["136", "53.3"], ["138", "54"], ["140", "55.1"], ["142", "55.9"],
      ["144", "57.5"], ["146", "57.5"], ["148", "58.3"], ["150", "59.1"],
    ],
  },
];

/**
 * Collapsed by default, and built on <details> rather than React state: it
 * opens without any JavaScript, keyboard and screen-reader behaviour comes
 * free, and it costs the product page no client bundle at all.
 */
export default function SizeChart() {
  return (
    <details className="group mt-6 border border-line">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold hover:bg-brand-soft/30">
        <span className="flex items-center gap-2">
          <Ruler aria-hidden className="size-4 text-brand-deep" />
          Size chart
        </span>
        <ChevronDown
          aria-hidden
          className="size-4 shrink-0 transition-transform group-open:rotate-180"
        />
      </summary>

      <div className="border-t border-line px-4 py-4">
        <p className="text-xs text-muted">
          Measurements are of the garment, in centimetres with inches beside
          them. If you are between sizes, take the larger one.
        </p>

        {/* The table is wider than a phone, so it scrolls on its own rather
            than pushing the whole page sideways. */}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[34rem] border-collapse text-left text-xs">
            <caption className="sr-only">
              Women&rsquo;s size chart, measurements in centimetres and inches
            </caption>
            <thead>
              <tr className="border-b border-line">
                <th scope="col" className="py-2 pr-3 font-semibold">
                  CM / Inches
                </th>
                {SIZES.map((size) => (
                  <th
                    key={size}
                    scope="col"
                    className="px-2 py-2 text-center font-semibold"
                  >
                    {size}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr key={row.label} className="border-b border-line/60">
                  <th
                    scope="row"
                    className="py-2.5 pr-3 font-medium text-muted"
                  >
                    {row.label}
                  </th>
                  {row.cells.map(([cm, inches], index) => (
                    <td key={SIZES[index]} className="px-2 py-2.5 text-center">
                      <span className="block">{cm}cm</span>
                      <span className="block text-muted">{inches}in</span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </details>
  );
}
