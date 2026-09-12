"use client";

import { useMemo, useState } from "react";
import { nairaToKobo } from "@/lib/format";

// The whole point of this screen: pick sizes by tapping them, then fill a grid.
// No attributes, no terms, no generate step.
const SIZE_SETS: Record<string, string[]> = {
  Clothing: ["XS", "S", "M", "L", "XL", "XXL"],
  Shoes: ["36", "37", "38", "39", "40", "41", "42", "43", "44", "45"],
  "One size": ["One size"],
};

type Row = { price: string; stock: string };

export default function NewProductPage() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imagesRaw, setImagesRaw] = useState("");

  const [setName_, setSetName] = useState<keyof typeof SIZE_SETS>("Clothing");
  const [selected, setSelected] = useState<string[]>([]);
  const [customSize, setCustomSize] = useState("");
  const [extraSizes, setExtraSizes] = useState<string[]>([]);

  const [rows, setRows] = useState<Record<string, Row>>({});
  const [bulkPrice, setBulkPrice] = useState("");
  const [bulkStock, setBulkStock] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const available = useMemo(
    () => [...SIZE_SETS[setName_], ...extraSizes],
    [setName_, extraSizes]
  );

  function toggleSize(size: string) {
    setSelected((prev) => {
      const next = prev.includes(size)
        ? prev.filter((s) => s !== size)
        : [...prev, size];
      return next;
    });
    setRows((prev) => {
      if (prev[size]) return prev;
      return { ...prev, [size]: { price: bulkPrice, stock: bulkStock } };
    });
  }

  function addCustomSize() {
    const value = customSize.trim();
    if (!value || available.includes(value)) {
      setCustomSize("");
      return;
    }
    setExtraSizes((prev) => [...prev, value]);
    toggleSize(value);
    setCustomSize("");
  }

  function applyToAll() {
    setRows((prev) => {
      const next = { ...prev };
      for (const size of selected) {
        next[size] = {
          price: bulkPrice || next[size]?.price || "",
          stock: bulkStock || next[size]?.stock || "",
        };
      }
      return next;
    });
  }

  function updateRow(size: string, field: keyof Row, value: string) {
    setRows((prev) => ({
      ...prev,
      [size]: { ...(prev[size] ?? { price: "", stock: "" }), [field]: value },
    }));
  }

  async function save(status: "DRAFT" | "PUBLISHED") {
    setError(null);
    setSaved(null);

    if (!name.trim()) return setError("Give the product a name.");
    if (selected.length === 0) return setError("Pick at least one size.");

    const variants = [];
    for (const size of selected) {
      const row = rows[size] ?? { price: "", stock: "" };
      const priceKobo = nairaToKobo(row.price);
      if (priceKobo === null) return setError(`Set a valid price for size ${size}.`);
      const stock = parseInt(row.stock || "0", 10);
      if (Number.isNaN(stock) || stock < 0)
        return setError(`Set a valid stock count for size ${size}.`);
      variants.push({ size, priceKobo, stock });
    }

    setSaving(true);
    try {
      const response = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description,
          status,
          images: imagesRaw
            .split(/[\n,]/)
            .map((s) => s.trim())
            .filter(Boolean),
          variants,
        }),
      });

      const json = await response.json();
      if (!response.ok) {
        setError(json.error ?? "Could not save the product.");
        return;
      }

      setSaved(
        status === "PUBLISHED"
          ? `${json.product.name} is live with ${json.product.variants.length} sizes.`
          : `${json.product.name} saved as a draft.`
      );
      setName("");
      setDescription("");
      setImagesRaw("");
      setSelected([]);
      setRows({});
    } catch {
      setError("Could not reach the server. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10 text-neutral-900">
      <h1 className="text-2xl font-semibold">Add a product</h1>
      <p className="mt-1 text-sm text-neutral-600">
        Pick the sizes this style comes in, then set price and stock for each.
      </p>

      <div className="mt-8 space-y-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium">
            Product name
          </label>
          <input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="High-waist mom jeans"
            className="mt-1 w-full rounded border border-neutral-300 px-3 py-2 focus:border-neutral-900 focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium">
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded border border-neutral-300 px-3 py-2 focus:border-neutral-900 focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="images" className="block text-sm font-medium">
            Image URLs
          </label>
          <textarea
            id="images"
            value={imagesRaw}
            onChange={(e) => setImagesRaw(e.target.value)}
            rows={2}
            placeholder="One per line. The first one is used on the product card."
            className="mt-1 w-full rounded border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
          />
        </div>
      </div>

      <section className="mt-10 border-t border-neutral-200 pt-6">
        <h2 className="text-lg font-semibold">Sizes</h2>

        <div className="mt-3 flex gap-2">
          {Object.keys(SIZE_SETS).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setSetName(key as keyof typeof SIZE_SETS)}
              className={`rounded px-3 py-1.5 text-sm ${
                setName_ === key
                  ? "bg-neutral-900 text-white"
                  : "border border-neutral-300 hover:border-neutral-900"
              }`}
            >
              {key}
            </button>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {available.map((size) => (
            <button
              key={size}
              type="button"
              aria-pressed={selected.includes(size)}
              onClick={() => toggleSize(size)}
              className={`min-w-12 rounded border px-3 py-2 text-sm ${
                selected.includes(size)
                  ? "border-neutral-900 bg-neutral-900 text-white"
                  : "border-neutral-300 hover:border-neutral-900"
              }`}
            >
              {size}
            </button>
          ))}
        </div>

        <div className="mt-3 flex gap-2">
          <input
            value={customSize}
            onChange={(e) => setCustomSize(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCustomSize();
              }
            }}
            placeholder="Add another size"
            className="w-48 rounded border border-neutral-300 px-3 py-1.5 text-sm focus:border-neutral-900 focus:outline-none"
          />
          <button
            type="button"
            onClick={addCustomSize}
            className="rounded border border-neutral-300 px-3 py-1.5 text-sm hover:border-neutral-900"
          >
            Add
          </button>
        </div>
      </section>

      {selected.length > 0 && (
        <section className="mt-8">
          <div className="flex flex-wrap items-end gap-3 rounded bg-neutral-50 p-4">
            <div>
              <label htmlFor="bulk-price" className="block text-xs font-medium">
                Price for all sizes
              </label>
              <input
                id="bulk-price"
                value={bulkPrice}
                onChange={(e) => setBulkPrice(e.target.value)}
                placeholder="12500"
                className="mt-1 w-32 rounded border border-neutral-300 px-3 py-1.5 text-sm focus:border-neutral-900 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="bulk-stock" className="block text-xs font-medium">
                Stock for all sizes
              </label>
              <input
                id="bulk-stock"
                value={bulkStock}
                onChange={(e) => setBulkStock(e.target.value)}
                placeholder="5"
                className="mt-1 w-24 rounded border border-neutral-300 px-3 py-1.5 text-sm focus:border-neutral-900 focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={applyToAll}
              className="rounded bg-neutral-900 px-3 py-1.5 text-sm text-white"
            >
              Apply to all
            </button>
          </div>

          <table className="mt-4 w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-xs text-neutral-600">
                <th className="pb-2 font-medium">Size</th>
                <th className="pb-2 font-medium">Price (₦)</th>
                <th className="pb-2 font-medium">Stock</th>
              </tr>
            </thead>
            <tbody>
              {selected.map((size) => (
                <tr key={size} className="border-b border-neutral-100">
                  <td className="py-2 font-medium">{size}</td>
                  <td className="py-2">
                    <input
                      aria-label={`Price for size ${size}`}
                      value={rows[size]?.price ?? ""}
                      onChange={(e) => updateRow(size, "price", e.target.value)}
                      className="w-32 rounded border border-neutral-300 px-2 py-1 focus:border-neutral-900 focus:outline-none"
                    />
                  </td>
                  <td className="py-2">
                    <input
                      aria-label={`Stock for size ${size}`}
                      value={rows[size]?.stock ?? ""}
                      onChange={(e) => updateRow(size, "stock", e.target.value)}
                      className="w-24 rounded border border-neutral-300 px-2 py-1 focus:border-neutral-900 focus:outline-none"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {error && (
        <p role="alert" className="mt-6 rounded bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      )}
      {saved && (
        <p role="status" className="mt-6 rounded bg-green-50 px-4 py-3 text-sm text-green-800">
          {saved}
        </p>
      )}

      <div className="mt-8 flex gap-3 border-t border-neutral-200 pt-6">
        <button
          type="button"
          disabled={saving}
          onClick={() => save("PUBLISHED")}
          className="rounded bg-neutral-900 px-5 py-2.5 text-sm text-white disabled:opacity-50"
        >
          {saving ? "Saving" : "Publish product"}
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => save("DRAFT")}
          className="rounded border border-neutral-300 px-5 py-2.5 text-sm hover:border-neutral-900 disabled:opacity-50"
        >
          Save as draft
        </button>
      </div>
    </main>
  );
}
