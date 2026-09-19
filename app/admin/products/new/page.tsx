import type { Metadata } from "next";
import { getPrisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import NewProductForm from "./new-product-form";

export const metadata: Metadata = { title: "Add product" };

export default async function NewProductPage() {
  if (!(await requireAdmin())) return null;

  const categories = await getPrisma().category.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return <NewProductForm categories={categories} />;
}
