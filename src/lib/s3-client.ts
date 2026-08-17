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

const S3_UPLOAD_TIMEOUT_MS = 120_000;
const S3_UPLOAD_ATTEMPTS = 3;

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export async function putFileToSignedUrl(
  uploadUrl: string,
  file: Blob,
  contentType: string,
): Promise<void> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= S3_UPLOAD_ATTEMPTS; attempt += 1) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), S3_UPLOAD_TIMEOUT_MS);

    try {
      const response = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": contentType },
        body: file,
        signal: controller.signal,
      });

      if (response.ok) return;

      const error = new Error(await describeS3Failure(response));
      const retryable =
        response.status === 408 || response.status === 429 || response.status >= 500;
      if (!retryable) throw error;
      lastError = error;
    } catch (error) {
      if (error instanceof Error && (error.name === "AbortError" || error.name === "TypeError")) {
        lastError = new Error(
          error.name === "AbortError"
            ? "The upload connection timed out. Please check your network and try again."
            : "The upload connection was interrupted. Please check your network and try again.",
        );
      } else {
        throw error;
      }
    } finally {
      window.clearTimeout(timeout);
    }

    if (attempt < S3_UPLOAD_ATTEMPTS) await wait(attempt * 1200);
  }

  throw lastError ?? new Error("The upload connection failed. Please try again.");
}

export async function uploadFileToS3(folder: string, file: File): Promise<{ objectKey: string }> {
  // Normalize content type to avoid charset additions by browser that break signatures
  const contentType = (file.type || "application/octet-stream").split(";")[0].toLowerCase().trim();
  if (
    ![
      "image/jpeg",
      "image/png",
      "image/webp",
      "video/mp4",
      "video/webm",
      "application/pdf",
    ].includes(contentType)
  ) {
    throw new Error("Unsupported media format.");
  }
  if (!["listings", "products", "community", "messages", "verification"].includes(folder)) {
    throw new Error("Unsupported storage folder.");
  }
  const { objectKey, uploadUrl, method } = await createS3UploadUrl({
    data: {
      folder: folder as "listings" | "products" | "community" | "messages" | "verification",
      contentType: contentType as
        "image/jpeg" | "image/png" | "image/webp" | "video/mp4" | "video/webm" | "application/pdf",
    },
  });
  await putFileToSignedUrl(uploadUrl, file, contentType);
  return { objectKey };
}

const viewUrlCache = new Map<string, { url: string; expiresAt: number }>();

export async function getS3ViewUrl(objectKey: string): Promise<string> {
  const now = Date.now();
  const cached = viewUrlCache.get(objectKey);
  if (cached && cached.expiresAt > now) {
    return cached.url;
  }
  const { downloadUrl } = await getS3SignedDownloadUrl({ data: { objectKey } });
  // Cache for 4 minutes (signed URLs expire in 5 minutes)
  viewUrlCache.set(objectKey, { url: downloadUrl, expiresAt: now + 4 * 60 * 1000 });
  return downloadUrl;
}
