"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { colorSwatch } from "@/lib/format";
import Money from "@/app/_components/money";

export type Facet = { value: string; count: number };

export default function ShopFilters({
  categories,
  colors,
  sizes,
  priceCeilingKobo,
}: {
  categories: { slug: string; name: string; count: number }[];
  colors: Facet[];
  sizes: Facet[];
  priceCeilingKobo: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const selected = (key: string) =>
    (searchParams.get(key) ?? "").split(",").filter(Boolean);

  function commit(params: URLSearchParams) {
    // Any filter change invalidates the current page number.
    params.delete("page");
    const query = params.toString();
    router.push(query ? `/shop?${query}` : "/shop");
  }

  function toggle(key: string, value: string) {
    const params = new URLSearchParams(searchParams);
    const current = selected(key);
    const next = current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value];

    if (next.length > 0) params.set(key, next.join(","));
    else params.delete(key);

    commit(params);
  }

  const activeCount =
    selected("category").length + selected("color").length + selected("size").length;
  const maxPriceParam = searchParams.get("maxPrice");

  return (
    <div className="space-y-2">
      {(activeCount > 0 || maxPriceParam) && (
        <button
          type="button"
          onClick={() => commit(new URLSearchParams())}
          className="mb-4 text-sm underline"
        >
          Clear all filters
        </button>
      )}

      <FilterGroup title="Product Categories">
        <ul className="space-y-2.5">
          {categories.map((category) => (
            <li key={category.slug}>
              <Checkbox
                label={category.name}
                count={category.count}
                checked={selected("category").includes(category.slug)}
                onChange={() => toggle("category", category.slug)}
              />
            </li>
          ))}
        </ul>
      </FilterGroup>

      <FilterGroup title="Filter by Price">
        <PriceSlider
          ceilingKobo={priceCeilingKobo}
          valueKobo={
            maxPriceParam ? Number(maxPriceParam) : priceCeilingKobo
          }
          onCommit={(kobo) => {
            const params = new URLSearchParams(searchParams);
            if (kobo >= priceCeilingKobo) params.delete("maxPrice");
            else params.set("maxPrice", String(kobo));
            commit(params);
          }}
        />
      </FilterGroup>

      <FilterGroup title="Filter by Color">
        <ul className="space-y-2.5">
          {colors.map((color) => (
            <li key={color.value}>
              <Checkbox
                label={color.value}
                count={color.count}
                checked={selected("color").includes(color.value)}
                onChange={() => toggle("color", color.value)}
                swatch={colorSwatch(color.value)}
              />
            </li>
          ))}
        </ul>
      </FilterGroup>

      <FilterGroup title="Filter by Size">
        <ul className="space-y-2.5">
          {sizes.map((size) => (
            <li key={size.value}>
              <Checkbox
                label={size.value}
                count={size.count}
                checked={selected("size").includes(size.value)}
                onChange={() => toggle("size", size.value)}
              />
            </li>
          ))}
        </ul>
      </FilterGroup>
    </div>
  );
}

function FilterGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);

  return (
    <section className="border-b border-line py-4 last:border-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center justify-between text-sm font-semibold"
      >
        {title}
        <ChevronDown
          aria-hidden
          className={`size-4 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && <div className="mt-4">{children}</div>}
    </section>
  );
}

function Checkbox({
  label,
  count,
  checked,
  onChange,
  swatch,
}: {
  label: string;
  count: number;
  checked: boolean;
  onChange: () => void;
  swatch?: string;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="size-4 shrink-0 accent-brand"
      />
      {swatch && (
        <span
          aria-hidden
          className="size-4 shrink-0 rounded border border-line"
          style={{ backgroundColor: swatch }}
        />
      )}
      <span className="flex-1">{label}</span>
      <span className="text-muted">({count})</span>
    </label>
  );
}

/** The mockup shows a two-handled range. This filters on an upper bound only,
 *  which is the half shoppers actually use, and keeps the control accessible. */
function PriceSlider({
  ceilingKobo,
  valueKobo,
  onCommit,
}: {
  ceilingKobo: number;
  valueKobo: number;
  onCommit: (kobo: number) => void;
}) {
  const [draft, setDraft] = useState(valueKobo);

  return (
    <div>
      <p className="text-sm text-muted">
        Up to <Money kobo={draft} />
      </p>
      <input
        type="range"
        min={0}
        max={ceilingKobo}
        step={50000}
        value={draft}
        aria-label="Maximum price"
        onChange={(event) => setDraft(Number(event.target.value))}
        onPointerUp={() => onCommit(draft)}
        onKeyUp={() => onCommit(draft)}
        className="mt-3 w-full accent-brand"
      />
    </div>
  );
}
