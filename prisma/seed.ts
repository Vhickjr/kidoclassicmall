import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

// Placeholder photography. Swap these for real product shots.
const photo = (seed: string) => `https://picsum.photos/seed/${seed}/900/1200`;

const url = (process.env.DATABASE_URL ?? "").replace(/^mysql:\/\//, "mariadb://");
const prisma = new PrismaClient({ adapter: new PrismaMariaDb(url) });

const LETTER_STOCK = [
  { size: "S", stock: 6 },
  { size: "M", stock: 4 },
  { size: "L", stock: 2 },
  { size: "XL", stock: 0 },
];

const SHOE_STOCK = [
  { size: "37", stock: 4 },
  { size: "38", stock: 3 },
  { size: "39", stock: 0 },
  { size: "40", stock: 5 },
  { size: "41", stock: 1 },
];

/** One row per size/colour pair, which is what the unique constraint expects.
 *  The second colour carries less stock so the grid has sold-out combinations. */
function variants(
  rows: { size: string; stock: number }[],
  colors: string[],
  priceKobo: number,
  compareAtKobo: number | null
) {
  return colors.flatMap((color, colorIndex) =>
    rows.map((row) => ({
      size: row.size,
      color,
      priceKobo,
      compareAtKobo,
      stock: colorIndex === 0 ? row.stock : Math.max(0, row.stock - 2),
    }))
  );
}

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
      description:
        "Rigid denim with a high rise and a tapered leg. Sits at the natural waist and holds its shape through the day.\n\nRuns true to size. Model is 5'8\" and wears a size M.",
      images: [photo("jeans-a1"), photo("jeans-a2"), photo("jeans-a3"), photo("jeans-a4")],
      categorySlug: "jeans",
      variants: variants(LETTER_STOCK, ["Mid Wash", "Black"], 1850000, 2200000),
    },
    {
      brand: "Kido Denim",
      name: "Straight Leg Rigid Jeans",
      slug: "straight-leg-rigid-jeans",
      description:
        "Mid rise, straight through the leg, no stretch. The pair you reach for when nothing else fits right.",
      images: [photo("jeans-b1"), photo("jeans-b2")],
      categorySlug: "jeans",
      variants: variants(LETTER_STOCK, ["Light Wash"], 1650000, null),
    },
    {
      brand: "Kido Denim",
      name: "Wide Leg Cargo Jeans",
      slug: "wide-leg-cargo-jeans",
      description:
        "Heavyweight denim with utility pockets at the thigh. Wide through the leg, cropped at the ankle.",
      images: [photo("jeans-c1"), photo("jeans-c2"), photo("jeans-c3")],
      categorySlug: "jeans",
      variants: variants(LETTER_STOCK, ["Dark Wash", "Cream"], 2100000, 2500000),
    },
    {
      brand: "Kido Denim",
      name: "Cropped Denim Jacket",
      slug: "cropped-denim-jacket",
      description: "Boxy fit with a raw hem and antique brass hardware.",
      images: [photo("denim-d1"), photo("denim-d2")],
      categorySlug: "denim",
      variants: variants(LETTER_STOCK, ["Indigo", "White"], 2750000, 3200000),
    },
    {
      brand: "Kido Denim",
      name: "Stretch Skinny Jeans",
      slug: "stretch-skinny-jeans",
      description: "Four-way stretch that recovers overnight rather than bagging at the knee.",
      images: [photo("jeans-e1")],
      categorySlug: "jeans",
      variants: variants(LETTER_STOCK, ["Black"], 1750000, 1950000),
    },
    {
      brand: "Kido Studio",
      name: "Leather Block Heel",
      slug: "leather-block-heel",
      description:
        "Softened leather upper on a 7cm block heel. Leather lined, with a padded insole for standing all evening.",
      images: [photo("heel-a1"), photo("heel-a2"), photo("heel-a3"), photo("heel-a4")],
      categorySlug: "footwear",
      variants: variants(SHOE_STOCK, ["Black", "Tan"], 2400000, 2900000),
    },
    {
      brand: "Kido Studio",
      name: "Strappy Flat Sandal",
      slug: "strappy-flat-sandal",
      description: "An everyday flat with a cushioned footbed and an adjustable ankle strap.",
      images: [photo("sandal-a1"), photo("sandal-a2")],
      categorySlug: "footwear",
      variants: variants(SHOE_STOCK, ["Tan"], 1250000, null),
    },
    {
      brand: "Kido Studio",
      name: "Pointed Court Shoe",
      slug: "pointed-court-shoe",
      description: "Pointed toe, covered heel, and a shape that reads formal without the height.",
      images: [photo("court-a1"), photo("court-a2")],
      categorySlug: "footwear",
      variants: variants(SHOE_STOCK, ["Burgundy", "Black"], 2200000, 2600000),
    },
    {
      brand: "Kido Denim",
      name: "Everything Sold Out Jean",
      slug: "everything-sold-out-jean",
      description: null,
      images: [photo("jeans-f1")],
      categorySlug: "jeans",
      variants: [
        { size: "S", color: "Grey", priceKobo: 1450000, compareAtKobo: null, stock: 0 },
        { size: "M", color: "Grey", priceKobo: 1450000, compareAtKobo: null, stock: 0 },
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
      variants: variants(LETTER_STOCK, ["Black"], 3200000, null),
    },
  ];

  await prisma.cartItem.deleteMany();
  await prisma.orderItem.deleteMany();

  for (const { variants: rows, categorySlug, ...product } of products) {
    await prisma.product.deleteMany({ where: { slug: product.slug } });
    await prisma.product.create({
      data: {
        ...product,
        status: product.status ?? "PUBLISHED",
        categoryId: saved.get(categorySlug) ?? null,
        variants: { create: rows },
      },
    });
    console.log("seeded", product.slug, `(${rows.length} variants)`);
  }

  // ---------------------------------------------------------------------------
  // Instagram Stories Seeding
  // ---------------------------------------------------------------------------
  await prisma.story.deleteMany();

  const momJeans = await prisma.product.findUnique({ where: { slug: "high-waist-mom-jeans" } });
  const denimJacket = await prisma.product.findUnique({ where: { slug: "cropped-denim-jacket" } });
  const blockHeel = await prisma.product.findUnique({ where: { slug: "leather-block-heel" } });
  const sandal = await prisma.product.findUnique({ where: { slug: "strappy-flat-sandal" } });

  await prisma.story.create({
    data: {
      title: "Denim Staples 👖",
      brandHandle: "@kidoclassic",
      coverImage: photo("jeans-a1"),
      position: 1,
      active: true,
      slides: {
        create: [
          {
            mediaUrl: photo("jeans-a1"),
            mediaType: "IMAGE",
            caption: "High-waist mom jeans with rigid denim fit ✨",
            durationSec: 5,
            productId: momJeans?.id || null,
            position: 1,
          },
          {
            mediaUrl: photo("denim-d1"),
            mediaType: "IMAGE",
            caption: "Pair it with our raw-hem cropped denim jacket 🔥",
            durationSec: 5,
            productId: denimJacket?.id || null,
            position: 2,
          },
        ],
      },
    },
  });

  await prisma.story.create({
    data: {
      title: "Weekend Footwear 👠",
      brandHandle: "@kidoclassic",
      coverImage: photo("heel-a1"),
      position: 2,
      active: true,
      slides: {
        create: [
          {
            mediaUrl: photo("heel-a1"),
            mediaType: "IMAGE",
            caption: "Softened leather block heels for all-night comfort 💃",
            durationSec: 5,
            productId: blockHeel?.id || null,
            position: 1,
          },
          {
            mediaUrl: photo("sandal-a1"),
            mediaType: "IMAGE",
            caption: "Casual strappy flat sandals for everyday lounge ☀️",
            durationSec: 5,
            productId: sandal?.id || null,
            position: 2,
          },
        ],
      },
    },
  });

  await prisma.story.create({
    data: {
      title: "Cargo Trends 🎒",
      brandHandle: "@kidoclassic",
      coverImage: photo("jeans-c1"),
      position: 3,
      active: true,
      slides: {
        create: [
          {
            mediaUrl: photo("jeans-c1"),
            mediaType: "IMAGE",
            caption: "Wide-leg cargo jeans with utility thigh pockets",
            durationSec: 5,
            productId: null,
            position: 1,
          },
        ],
      },
    },
  });

  await prisma.story.create({
    data: {
      title: "New Arrivals ✨",
      brandHandle: "@kidoclassic",
      coverImage: photo("court-a1"),
      position: 4,
      active: true,
      slides: {
        create: [
          {
            mediaUrl: photo("court-a1"),
            mediaType: "IMAGE",
            caption: "Pointed court shoes now back in stock!",
            durationSec: 5,
            productId: null,
            position: 1,
          },
        ],
      },
    },
  });

  console.log("seeded Instagram stories with product attachments");
}


main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
