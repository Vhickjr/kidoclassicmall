"use client";

import { useMemo, useRef, useState } from "react";
import { colorSwatch, nairaToKobo } from "@/lib/format";
import ImageUploader from "@/app/_components/image-uploader";
import { Plus, Trash2 } from "lucide-react";

const SIZE_SETS: Record<string, string[]> = {
  Clothing: ["XS", "S", "M", "L", "XL", "XXL"],
  Shoes: ["36", "37", "38", "39", "40", "41", "42", "43", "44", "45"],
  "One size": ["One size"],
};

/** Offered up front, the same way sizes are. Denim washes sit alongside the
 *  plain colours because that is how this shop's stock is actually described. */
const COLOR_PRESETS = [
  "Black", "White", "Cream", "Grey", "Red", "Burgundy", "Pink",
  "Blue", "Light wash", "Mid wash", "Dark wash", "Indigo", "Tan", "Brown",
];

type Row = {
  price: string;
  stock: string;
  customOptions?: Record<string, string>;
};

/** One line of stock is a size and a colour together, so the key has to carry
 *  both. A product with no colours chosen keys on the size alone. */
function rowKey(size: string, color: string | null): string {
  return color ? `${size}\u0000${color}` : size;
}

export default function NewProductForm({
  categories,
}: {
  categories: { id: string; name: string }[];
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imagesRaw, setImagesRaw] = useState("");
  const [categoryId, setCategoryId] = useState("");

  const [setName_, setSetName] = useState<keyof typeof SIZE_SETS>("Clothing");
  const [selected, setSelected] = useState<string[]>([]);
  const [customSize, setCustomSize] = useState("");
  const [extraSizes, setExtraSizes] = useState<string[]>([]);

  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [customColor, setCustomColor] = useState("");
  const [extraColors, setExtraColors] = useState<string[]>([]);

  // Custom Variation Field Names (e.g. ["Material", "Style"])
  const [customFieldNames, setCustomFieldNames] = useState<string[]>([]);
  const [newFieldName, setNewFieldName] = useState("");

  const [rows, setRows] = useState<Record<string, Row>>({});
  const [bulkPrice, setBulkPrice] = useState("");
  const [bulkStock, setBulkStock] = useState("");

  // This form saves with its own fetch rather than a form submit, so it has to
  // flush the picker's pending files itself before sending anything.
  const uploadImagesRef = useRef<null | (() => Promise<string[]>)>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const available = useMemo(
    () => [...SIZE_SETS[setName_], ...extraSizes],
    [setName_, extraSizes]
  );

  const availableColors = useMemo(
    () => [...COLOR_PRESETS, ...extraColors],
    [extraColors]
  );

  /** Every size crossed with every chosen colour. With no colours chosen this
   *  is just the sizes, so a product that does not vary by colour is unchanged. */
  const combos = useMemo(() => {
    if (selectedColors.length === 0) {
      return selected.map((size) => ({ size, color: null as string | null }));
    }
    return selected.flatMap((size) =>
      selectedColors.map((color) => ({ size, color: color as string | null }))
    );
  }, [selected, selectedColors]);

  function toggleSize(size: string) {
    setSelected((prev) => {
      const next = prev.includes(size)
        ? prev.filter((s) => s !== size)
        : [...prev, size];
      return next;
    });
    setRows((prev) => {
      if (prev[size]) return prev;
      return { ...prev, [size]: { price: bulkPrice, stock: bulkStock, customOptions: {} } };
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

  function addCustomField() {
    const value = newFieldName.trim();
    if (!value || customFieldNames.includes(value)) {
      setNewFieldName("");
      return;
    }
    setCustomFieldNames((prev) => [...prev, value]);
    setNewFieldName("");
  }

  function removeCustomField(fieldName: string) {
    setCustomFieldNames((prev) => prev.filter((f) => f !== fieldName));
  }

  function applyToAll() {
    setRows((prev) => {
      const next = { ...prev };
      for (const size of selected) {
        next[size] = {
          ...next[size],
          price: bulkPrice || next[size]?.price || "",
          stock: bulkStock || next[size]?.stock || "",
        };
      }
      return next;
    });
  }

  function updateRowField(key: string, field: "price" | "stock", value: string) {
    setRows((prev) => ({
      ...prev,
      [key]: { ...(prev[key] ?? { price: "", stock: "" }), [field]: value },
    }));
  }

  function updateRowCustomOption(key: string, field: string, value: string) {
    setRows((prev) => {
      const currentOpts = prev[key]?.customOptions ?? {};
      return {
        ...prev,
        [key]: {
          ...(prev[key] ?? { price: "", stock: "" }),
          customOptions: { ...currentOpts, [field]: value },
        },
      };
    });
  }

  function toggleColor(color: string) {
    setSelectedColors((prev) =>
      prev.includes(color) ? prev.filter((c) => c !== color) : [...prev, color]
    );
  }

  function addCustomColor() {
    const value = customColor.trim();
    if (!value || availableColors.includes(value)) {
      setCustomColor("");
      return;
    }
    setExtraColors((prev) => [...prev, value]);
    setSelectedColors((prev) => [...prev, value]);
    setCustomColor("");
  }

  async function save(status: "DRAFT" | "PUBLISHED") {
    setError(null);
    setSaved(null);

    if (!name.trim()) return setError("Give the product a name.");
    if (selected.length === 0) return setError("Pick at least one size.");

    const variants = [];
    for (const { size, color } of combos) {
      const key = rowKey(size, color);
      const label = color ? `${size} / ${color}` : size;
      const row = rows[key] ?? { price: "", stock: "" };

      const priceKobo = nairaToKobo(row.price);
      if (priceKobo === null) return setError(`Set a valid price for ${label}.`);
      const stock = parseInt(row.stock || "0", 10);
      if (Number.isNaN(stock) || stock < 0)
        return setError(`Set a valid stock count for ${label}.`);

      // Clean up empty custom option values
      const cleanCustomOptions: Record<string, string> = {};
      if (row.customOptions) {
        for (const [k, v] of Object.entries(row.customOptions)) {
          if (k.trim() && v.trim()) {
            cleanCustomOptions[k.trim()] = v.trim();
          }
        }
      }

      variants.push({
        size,
        color,
        customOptions: Object.keys(cleanCustomOptions).length > 0 ? cleanCustomOptions : null,
        priceKobo,
        stock,
      });
    }

    setSaving(true);
    try {
      // Pictures go to Cloudinary now, at save time, not when they were picked.
      let images = imagesRaw.split("\n").map((line) => line.trim()).filter(Boolean);
      if (uploadImagesRef.current) {
        try {
          images = await uploadImagesRef.current();
        } catch {
          setSaving(false);
          return setError("Could not upload the pictures. Nothing was saved.");
        }
      }

      const response = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description,
          status,
          categoryId: categoryId || null,
          // The URLs the upload just returned, not the stale state value.
          images,
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
          ? `${json.product.name} is live with ${json.product.variants.length} variants.`
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
    <main className="mx-auto max-w-4xl px-6 py-10 text-neutral-900">
      <h1 className="text-2xl font-semibold">Add a product</h1>
      <p className="mt-1 text-sm text-neutral-600">
        Pick the sizes and custom variations this style comes in, then set price and stock for each.
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
          <label htmlFor="categoryId" className="block text-sm font-medium">
            Category
          </label>
          <select
            id="categoryId"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="mt-1 w-full rounded border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
          >
            <option value="">Uncategorised</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          {categories.length === 0 && (
            <p className="mt-1 text-xs text-neutral-500">
              No categories yet — add one under Categories first.
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium">Photos</label>
          <div className="mt-2">
            <ImageUploader
              initial={imagesRaw.split("\n").filter(Boolean)}
              onChange={(urls) => setImagesRaw(urls.join("\n"))}
              onRegisterUpload={(upload) => {
                uploadImagesRef.current = upload;
              }}
            />
          </div>

          <details className="mt-3">
            <summary className="cursor-pointer text-sm text-muted">
              Or paste image URLs
            </summary>
            <textarea
              value={imagesRaw}
              onChange={(e) => setImagesRaw(e.target.value)}
              rows={2}
              placeholder="One per line. The first one is used on the product card."
              className="mt-2 w-full rounded border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
            />
          </details>
        </div>
      </div>

      <section className="mt-10 border-t border-neutral-200 pt-6">
        <h2 className="text-lg font-semibold">Sizes & Base Options</h2>

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

        {/* Colours are chosen here, the same way sizes are, and every chosen
            colour is paired with every chosen size below. Leaving this empty
            gives one line of stock per size, as before. */}
        <h3 className="mt-8 text-sm font-semibold">Colours</h3>
        <p className="mt-1 text-sm text-neutral-600">
          Optional. Each colour you pick is combined with each size, so you can
          price and count them separately.
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          {availableColors.map((color) => {
            const on = selectedColors.includes(color);
            return (
              <button
                key={color}
                type="button"
                onClick={() => toggleColor(color)}
                aria-pressed={on}
                className={`flex items-center gap-1.5 rounded border px-3 py-1.5 text-sm ${
                  on
                    ? "border-neutral-900 bg-neutral-900 text-white"
                    : "border-neutral-300 hover:border-neutral-900"
                }`}
              >
                <span
                  aria-hidden
                  className="size-3 rounded-full ring-1 ring-black/20"
                  style={{ backgroundColor: colorSwatch(color) }}
                />
                {color}
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex gap-2">
          <input
            value={customColor}
            onChange={(e) => setCustomColor(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCustomColor();
              }
            }}
            placeholder="Add another colour"
            className="w-48 rounded border border-neutral-300 px-3 py-1.5 text-sm focus:border-neutral-900 focus:outline-none"
          />
          <button
            type="button"
            onClick={addCustomColor}
            className="rounded border border-neutral-300 px-3 py-1.5 text-sm hover:border-neutral-900"
          >
            Add
          </button>
        </div>

        {selected.length > 0 && selectedColors.length > 0 && (
          <p className="mt-3 text-sm text-neutral-600">
            {selected.length} {selected.length === 1 ? "size" : "sizes"} &times;{" "}
            {selectedColors.length}{" "}
            {selectedColors.length === 1 ? "colour" : "colours"} ={" "}
            <strong>{selected.length * selectedColors.length}</strong> lines of
            stock to price below.
          </p>
        )}
      </section>

      {/* Custom Variation Fields Creator */}
      <section className="mt-8 border-t border-neutral-200 pt-6">
        <h2 className="text-lg font-semibold">Custom Variations</h2>
        <p className="mt-1 text-sm text-neutral-600">
          Add custom attributes beyond size and color (e.g., Material, Style, Weight, Inscription, Pack Size).
        </p>

        <div className="mt-3 flex gap-2">
          <input
            value={newFieldName}
            onChange={(e) => setNewFieldName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCustomField();
              }
            }}
            placeholder="Variation Name (e.g. Material)"
            className="w-64 rounded border border-neutral-300 px-3 py-1.5 text-sm focus:border-neutral-900 focus:outline-none"
          />
          <button
            type="button"
            onClick={addCustomField}
            className="flex items-center gap-1 rounded bg-brand px-4 py-1.5 text-sm font-semibold text-white"
          >
            <Plus className="size-4" />
            Add Variation Attribute
          </button>
        </div>

        {customFieldNames.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {customFieldNames.map((field) => (
              <span
                key={field}
                className="flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand-dark"
              >
                {field}
                <button
                  type="button"
                  onClick={() => removeCustomField(field)}
                  className="hover:text-red-600"
                >
                  &times;
                </button>
              </span>
            ))}
          </div>
        )}
      </section>

      {selected.length > 0 && (
        <section className="mt-8">
          <div className="flex flex-wrap items-end gap-3 rounded bg-neutral-50 p-4">
            <div>
              <label htmlFor="bulk-price" className="block text-xs font-medium">
                Price for all variants
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
                Stock for all variants
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

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left text-xs text-neutral-600">
                  <th className="pb-2 font-medium">Size</th>
                  <th className="pb-2 font-medium">Colour</th>
                  {customFieldNames.map((fn) => (
                    <th key={fn} className="pb-2 font-medium">{fn}</th>
                  ))}
                  <th className="pb-2 font-medium">Price (₦)</th>
                  <th className="pb-2 font-medium">Stock</th>
                </tr>
              </thead>
              <tbody>
                {combos.map(({ size, color }) => {
                  const key = rowKey(size, color);
                  const label = color ? `${size} / ${color}` : size;

                  return (
                    <tr key={key} className="border-b border-neutral-100">
                      <td className="py-2.5 font-semibold">{size}</td>
                      <td className="py-2.5">
                        {color ? (
                          <span className="inline-flex items-center gap-1.5">
                            <span
                              aria-hidden
                              className="size-3 rounded-full ring-1 ring-black/10"
                              style={{ backgroundColor: colorSwatch(color) }}
                            />
                            {color}
                          </span>
                        ) : (
                          <span className="text-neutral-400">&mdash;</span>
                        )}
                      </td>
                      {customFieldNames.map((fn) => (
                        <td key={fn} className="py-2.5">
                          <input
                            placeholder={`Value for ${fn}`}
                            value={rows[key]?.customOptions?.[fn] ?? ""}
                            onChange={(e) => updateRowCustomOption(key, fn, e.target.value)}
                            className="w-32 rounded border border-neutral-300 px-2 py-1 text-sm focus:border-neutral-900 focus:outline-none"
                          />
                        </td>
                      ))}
                      <td className="py-2.5">
                        <input
                          aria-label={`Price for ${label}`}
                          value={rows[key]?.price ?? ""}
                          onChange={(e) => updateRowField(key, "price", e.target.value)}
                          className="w-28 rounded border border-neutral-300 px-2 py-1 text-sm focus:border-neutral-900 focus:outline-none"
                        />
                      </td>
                      <td className="py-2.5">
                        <input
                          aria-label={`Stock for ${label}`}
                          value={rows[key]?.stock ?? ""}
                          onChange={(e) => updateRowField(key, "stock", e.target.value)}
                          className="w-20 rounded border border-neutral-300 px-2 py-1 text-sm focus:border-neutral-900 focus:outline-none"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
