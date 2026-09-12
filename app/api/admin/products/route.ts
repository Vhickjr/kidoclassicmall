import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/format";
import { requireAdmin } from "@/lib/auth";

type IncomingVariant = {
  size: string;
  color?: string | null;
  priceKobo: number;
  stock: number;
  sku?: string | null;
};

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Not authorised." }, { status: 401 });
  }

  let body: {
    name?: string;
    description?: string;
    categoryId?: string | null;
    images?: string[];
    status?: "DRAFT" | "PUBLISHED";
    variants?: IncomingVariant[];
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Could not read that request." }, { status: 400 });
  }

  const name = (body.name ?? "").trim();
  const variants = body.variants ?? [];

  if (!name) {
    return NextResponse.json({ error: "Give the product a name." }, { status: 400 });
  }

  if (variants.length === 0) {
    return NextResponse.json({ error: "Pick at least one size." }, { status: 400 });
  }

  // Validate every variant before writing anything, so a bad row on line 6 does
  // not leave you with a half-created product.
  for (const v of variants) {
    if (!v.size?.trim()) {
      return NextResponse.json({ error: "Every size needs a label." }, { status: 400 });
    }
    if (!Number.isInteger(v.priceKobo) || v.priceKobo <= 0) {
      return NextResponse.json(
        { error: `Set a price for size ${v.size}.` },
        { status: 400 }
      );
    }
    if (!Number.isInteger(v.stock) || v.stock < 0) {
      return NextResponse.json(
        { error: `Stock for size ${v.size} must be zero or more.` },
        { status: 400 }
      );
    }
  }

  // Slugs must be unique. Append a short suffix rather than failing, so adding
  // a second "Blue Mom Jeans" does not make you rename the first one.
  const base = slugify(name);
  let slug = base;
  for (let attempt = 0; attempt < 5; attempt++) {
    const clash = await prisma.product.findUnique({ where: { slug } });
    if (!clash) break;
    slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
  }

  try {
    const product = await prisma.product.create({
      data: {
        name,
        slug,
        description: body.description?.trim() || null,
        images: body.images?.filter(Boolean) ?? [],
        status: body.status === "PUBLISHED" ? "PUBLISHED" : "DRAFT",
        categoryId: body.categoryId || null,
        variants: {
          create: variants.map((v) => ({
            size: v.size.trim(),
            color: v.color?.trim() || null,
            priceKobo: v.priceKobo,
            stock: v.stock,
            sku: v.sku?.trim() || null,
          })),
        },
      },
      include: { variants: true },
    });

    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { error: "That SKU is already used by another product." },
        { status: 409 }
      );
    }
    console.error("create product failed", error);
    return NextResponse.json({ error: "Could not save the product." }, { status: 500 });
  }
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Not authorised." }, { status: 401 });
  }

  const products = await prisma.product.findMany({
    orderBy: { createdAt: "desc" },
    include: { variants: true, category: true },
    take: 100,
  });

  return NextResponse.json({ products });
}
