"use server";

import { revalidatePath } from "next/cache";
import { getPrisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { destroyUploads } from "@/lib/cloudinary";

async function guard() {
  if (!(await requireAdmin())) throw new Error("Not authorised.");
  return getPrisma();
}

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}
/** The admin offers an uploader and a paste-a-URL fallback for the same value,
 *  so whichever the user filled in is the one that counts. */
function mediaField(formData: FormData, uploaded: string, pasted: string) {
  return text(formData, uploaded) || text(formData, pasted);
}


function refresh() {
  revalidatePath("/", "layout");
}

export async function createStory(formData: FormData): Promise<void> {
  const prisma = await guard();
  const title = text(formData, "title");
  const coverImage = mediaField(formData, "coverImage", "coverImageUrl");
  const brandHandle = text(formData, "brandHandle") || "@kidoclassic";

  if (!title || !coverImage) return;

  const lastStory = await prisma.story.findFirst({ orderBy: { position: "desc" } });
  const position = (lastStory?.position ?? 0) + 1;

  await prisma.story.create({
    data: {
      title,
      brandHandle,
      coverImage,
      position,
      active: true,
    },
  });

  refresh();
}

export async function updateStory(formData: FormData): Promise<void> {
  const prisma = await guard();
  const id = text(formData, "id");
  const title = text(formData, "title");
  const coverImage = mediaField(formData, "coverImage", "coverImageUrl");
  const brandHandle = text(formData, "brandHandle") || "@kidoclassic";

  if (!id || !title || !coverImage) return;

  await prisma.story.update({
    where: { id },
    data: { title, brandHandle, coverImage },
  });

  refresh();
}

export async function toggleStoryActive(formData: FormData) {
  const prisma = await guard();
  const id = text(formData, "id");
  const story = await prisma.story.findUnique({ where: { id } });

  if (!story) return;

  await prisma.story.update({
    where: { id },
    data: { active: !story.active },
  });

  refresh();
}

export async function deleteStory(formData: FormData) {
  const prisma = await guard();
  const id = text(formData, "id");

  // Slides cascade in the database, so their media has to be collected here —
  // once the rows are gone there is nothing left pointing at those files.
  const story = await prisma.story.findUnique({
    where: { id },
    include: { slides: { select: { mediaUrl: true } } },
  });

  await prisma.story.delete({ where: { id } });

  if (story) {
    await destroyUploads([
      story.coverImage,
      ...story.slides.map((slide) => slide.mediaUrl),
    ]);
  }

  refresh();
}

export async function addStoryItem(formData: FormData): Promise<void> {
  const prisma = await guard();
  const storyId = text(formData, "storyId");
  const mediaUrl = mediaField(formData, "mediaUrl", "mediaUrlText");
  const mediaType = text(formData, "mediaType") === "VIDEO" ? "VIDEO" : "IMAGE";
  const caption = text(formData, "caption") || null;
  const productId = text(formData, "productId") || null;
  const durationSec = Number(formData.get("durationSec")) || 5;

  if (!storyId || !mediaUrl) return;

  const lastItem = await prisma.storyItem.findFirst({
    where: { storyId },
    orderBy: { position: "desc" },
  });
  const position = (lastItem?.position ?? 0) + 1;

  await prisma.storyItem.create({
    data: {
      storyId,
      mediaUrl,
      mediaType,
      caption,
      durationSec,
      productId,
      position,
    },
  });

  refresh();
}


export async function deleteStoryItem(formData: FormData) {
  const prisma = await guard();
  const id = text(formData, "id");

  const item = await prisma.storyItem.findUnique({ where: { id } });
  await prisma.storyItem.delete({ where: { id } });

  if (item) await destroyUploads([item.mediaUrl]);
  refresh();
}
