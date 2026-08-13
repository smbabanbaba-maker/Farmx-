import { getS3SignedUploadUrl, getS3SignedDownloadUrl } from "./storage.functions";

function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "-").toLowerCase();
}

export function makeObjectKey(folder: string, file: File) {
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  return `${folder}/${ts}-${rand}-${safeName(file.name)}`;
}

export async function uploadFileToS3(folder: string, file: File): Promise<{ objectKey: string }> {
  const objectKey = makeObjectKey(folder, file);
  const contentType = file.type || "application/octet-stream";
  if (
    !["image/jpeg", "image/png", "image/heic", "image/webp", "video/mp4", "video/webm"].includes(
      contentType,
    )
  ) {
    throw new Error("Unsupported image or video format.");
  }
  const { uploadUrl, method } = await getS3SignedUploadUrl({ data: { objectKey, contentType } });
  const res = await fetch(uploadUrl, {
    method,
    body: file,
    headers: { "Content-Type": contentType },
  });
  if (!res.ok)
    throw new Error(`S3 upload failed [${res.status}]: ${await res.text().catch(() => "")}`);
  return { objectKey };
}

export async function getS3ViewUrl(objectKey: string): Promise<string> {
  const { downloadUrl } = await getS3SignedDownloadUrl({ data: { objectKey } });
  return downloadUrl;
}
