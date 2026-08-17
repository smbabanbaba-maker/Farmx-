import { createS3UploadUrl, getS3SignedDownloadUrl } from "./storage.functions";

async function describeS3Failure(response: Response) {
  const body = await response.text().catch(() => "");
  const code = body.match(/<Code>([^<]+)<\/Code>/i)?.[1];
  const message = body.match(/<Message>([^<]+)<\/Message>/i)?.[1];
  if (code === "SignatureDoesNotMatch") {
    return "S3 rejected the upload signature. Refresh the page and try again.";
  }
  if (code === "AccessDenied") {
    return "S3 denied the upload. Check the FarmX media bucket permissions.";
  }
  return message
    ? `S3 upload failed (${response.status}): ${message} (${code})`
    : `S3 upload failed (${response.status}). ${body.slice(0, 200)}`;
}

export async function uploadFileToS3(folder: string, file: File): Promise<{ objectKey: string }> {
  // Normalize content type to avoid charset additions by browser that break signatures
  const contentType = (file.type || "application/octet-stream").split(";")[0].toLowerCase().trim();
  if (!["image/jpeg", "image/png", "image/webp", "video/mp4", "video/webm"].includes(contentType)) {
    throw new Error("Unsupported image or video format.");
  }
  if (!["listings", "products", "community", "messages"].includes(folder)) {
    throw new Error("Unsupported storage folder.");
  }
  const { objectKey, uploadUrl, method } = await createS3UploadUrl({
    data: {
      folder: folder as "listings" | "products" | "community" | "messages",
      contentType: contentType as
        "image/jpeg" | "image/png" | "image/webp" | "video/mp4" | "video/webm",
    },
  });
  const res = await fetch(uploadUrl, {
    method,
    body: file,
    headers: { "Content-Type": contentType },
  });
  if (!res.ok) {
    throw new Error(await describeS3Failure(res));
  }
  return { objectKey };
}

export async function getS3ViewUrl(objectKey: string): Promise<string> {
  const { downloadUrl } = await getS3SignedDownloadUrl({ data: { objectKey } });
  return downloadUrl;
}
