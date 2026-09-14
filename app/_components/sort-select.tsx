"use client";

import { useRouter, useSearchParams } from "next/navigation";

export const SORT_OPTIONS = [
  { value: "latest", label: "Sort by latest" },
  { value: "price-asc", label: "Price, low to high" },
  { value: "price-desc", label: "Price, high to low" },
  { value: "name", label: "Name, A to Z" },
];

export default function SortSelect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  return (
    <select
      value={searchParams.get("sort") ?? "latest"}
      aria-label="Sort products"
      onChange={(event) => {
        const params = new URLSearchParams(searchParams);
        if (event.target.value === "latest") params.delete("sort");
        else params.set("sort", event.target.value);
        params.delete("page");

        const query = params.toString();
        router.push(query ? `/shop?${query}` : "/shop");
      }}
      className="border border-line px-3 py-2 text-sm outline-none focus:border-brand"
    >
      {SORT_OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
