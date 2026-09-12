import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

// Placeholder photography. Swap these for real product shots.
const photo = (seed: string) => `https://picsum.photos/seed/${seed}/900/1200`;

const url = (process.env.DATABASE_URL ?? "").replace(/^mysql:\/\//, "mariadb://");
const prisma = new PrismaClient({ adapter: new PrismaMariaDb(url) });

const letterSizes = (priceKobo: number, compareAtKobo: number | null) =>
  [
    { size: "S", stock: 6 },
    { size: "M", stock: 4 },
    { size: "L", stock: 2 },
    { size: "XL", stock: 0 },
  ].map((row) => ({ ...row, priceKobo, compareAtKobo }));

const shoeSizes = (priceKobo: number, compareAtKobo: number | null) =>
  [
    { size: "41", stock: 1 },
    { size: "37", stock: 4 },
    { size: "39", stock: 0 },
    { size: "38", stock: 3 },
    { size: "40", stock: 5 },
  ].map((row) => ({ ...row, priceKobo, compareAtKobo }));

async function main() {
  const categories = [
    { name: "Denim", slug: "denim", imageUrl: photo("cat-denim") },
    { name: "Jeans", slug: "jeans", imageUrl: photo("cat-jeans") },
    { name: "Footwear", slug: "footwear", imageUrl: photo("cat-footwear") },
  ];

  const saved = new Map<string, string>();
  for (const category of categories) {
    const row = await prisma.category.upsert({
      where: { slug: category.slug },
      update: { imageUrl: category.imageUrl },
      create: category,
    });
    saved.set(row.slug, row.id);
  }

  const products = [
    {
      brand: "Kido Denim",
      name: "High Waist Mom Jeans",
      slug: "high-waist-mom-jeans",
      description: "Rigid denim, high rise, tapered leg.\nRuns true to size.",
      images: [photo("jeans-a1"), photo("jeans-a2")],
      categorySlug: "jeans",
      variants: letterSizes(1850000, 2200000),
    },
    {
      brand: "Kido Denim",
      name: "Straight Leg Rigid Jeans",
      slug: "straight-leg-rigid-jeans",
      description: "Mid rise, straight through the leg.",
      images: [photo("jeans-b1")],
      categorySlug: "jeans",
      variants: letterSizes(1650000, null),
    },
    {
      brand: "Kido Denim",
      name: "Wide Leg Cargo Jeans",
      slug: "wide-leg-cargo-jeans",
      description: "Utility pockets, heavyweight denim.",
      images: [photo("jeans-c1"), photo("jeans-c2")],
      categorySlug: "jeans",
      variants: letterSizes(2100000, 2500000),
    },
    {
      brand: "Kido Denim",
      name: "Cropped Denim Jacket",
      slug: "cropped-denim-jacket",
      description: "Boxy fit, raw hem.",
      images: [photo("denim-d1")],
      categorySlug: "denim",
      variants: letterSizes(2750000, 3200000),
    },
    {
      brand: "Kido Denim",
      name: "Stretch Skinny Jeans",
      slug: "stretch-skinny-jeans",
      description: "Four-way stretch, holds its shape.",
      images: [photo("jeans-e1")],
      categorySlug: "jeans",
      variants: letterSizes(1750000, 1950000),
    },
    {
      brand: "Kido Studio",
      name: "Leather Block Heel",
      slug: "leather-block-heel",
      description: "Softened leather upper, 7cm block heel.",
      images: [photo("heel-a1"), photo("heel-a2"), photo("heel-a3")],
      categorySlug: "footwear",
      variants: shoeSizes(2400000, 2900000),
    },
    {
      brand: "Kido Studio",
      name: "Strappy Flat Sandal",
      slug: "strappy-flat-sandal",
      description: "Everyday flat, cushioned footbed.",
      images: [photo("sandal-a1")],
      categorySlug: "footwear",
      variants: shoeSizes(1250000, null),
    },
    {
      brand: "Kido Studio",
      name: "Pointed Court Shoe",
      slug: "pointed-court-shoe",
      description: "Pointed toe, covered heel.",
      images: [photo("court-a1"), photo("court-a2")],
      categorySlug: "footwear",
      variants: shoeSizes(2200000, 2600000),
    },
    {
      brand: "Kido Denim",
      name: "Everything Sold Out Jean",
      slug: "everything-sold-out-jean",
      description: null,
      images: [photo("jeans-f1")],
      categorySlug: "jeans",
      variants: [
        { size: "S", priceKobo: 1450000, compareAtKobo: null, stock: 0 },
        { size: "M", priceKobo: 1450000, compareAtKobo: null, stock: 0 },
      ],
    },
    {
      brand: "Kido Denim",
      name: "Unpublished Draft Jacket",
      slug: "unpublished-draft-jacket",
      description: "Should never appear on the storefront.",
      images: [photo("jacket-a1")],
      categorySlug: "denim",
      status: "DRAFT" as const,
      variants: letterSizes(3200000, null),
    },
  ];

  for (const { variants, categorySlug, ...product } of products) {
    await prisma.product.deleteMany({ where: { slug: product.slug } });
    await prisma.product.create({
      data: {
        ...product,
        status: product.status ?? "PUBLISHED",
        categoryId: saved.get(categorySlug) ?? null,
        variants: { create: variants },
      },
    });
    console.log("seeded", product.slug);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
