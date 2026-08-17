export const MAX_LISTING_PHOTOS = 10;
export const MAX_LISTING_IMAGE_BYTES = 10 * 1024 * 1024;
export const LISTING_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export function isListingImageType(file: File) {
  return LISTING_IMAGE_TYPES.includes(file.type as (typeof LISTING_IMAGE_TYPES)[number]);
}

export function validateListingImage(file: File) {
  if (!isListingImageType(file)) {
    return "Unsupported image format. Use JPG, PNG, or WEBP.";
  }
  if (file.size > MAX_LISTING_IMAGE_BYTES) {
    return "Image is too large. Please choose a smaller image.";
  }
  return null;
}

/**
 * Compresses large listing images in the browser while keeping a safe fallback
 * for browsers that do not expose createImageBitmap or canvas conversion.
 */
export async function optimizeListingImage(file: File): Promise<File> {
  if (typeof window === "undefined" || file.size <= 2 * 1024 * 1024) return file;
  if (typeof createImageBitmap !== "function") return file;

  try {
    const bitmap = await createImageBitmap(file);
    const maxDimension = 2400;
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
      bitmap.close();
      return file;
    }
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", 0.86),
    );
    if (!blob) return file;
    return new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.webp`, {
      type: "image/webp",
      lastModified: Date.now(),
    });
  } catch {
    return file;
  }
}

export function createLocalPhotoId() {
  return `photo_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}
