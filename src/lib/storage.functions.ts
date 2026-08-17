import { createServerFn } from "@tanstack/react-start";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { z } from "zod";
import { getAwsClientOptions } from "@/lib/aws-config";
import { requireAuthenticatedUser } from "@/lib/auth-server";

const viewKeySchema = z.object({
  objectKey: z
    .string()
    .regex(/^(listings|products|community|messages|profiles|business)\/[a-z0-9][a-z0-9._/-]*$/i),
});

function getStorageConfig() {
  const region = process.env.AWS_REGION;
  const bucket = process.env.FARMX_MEDIA_BUCKET;

  if (!region || !bucket) {
    throw new Error(
      "AWS storage is not configured. Set AWS_REGION and FARMX_MEDIA_BUCKET on the server.",
    );
  }

  return { region, bucket };
}

function getS3Client(region: string) {
  return new S3Client(getAwsClientOptions(region));
}

const generatedUploadSchema = z.object({
  folder: z.enum(["listings", "products", "community", "messages", "verification"]),
  contentType: z.enum([
    "image/jpeg",
    "image/png",
    "image/webp",
    "video/mp4",
    "video/webm",
    "application/pdf",
  ]),
});

function extensionForContentType(contentType: string) {
  switch (contentType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "video/mp4":
      return "mp4";
    case "video/webm":
      return "webm";
    case "application/pdf":
      return "pdf";
    default:
      return "bin";
  }
}

export const createS3UploadUrl = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => generatedUploadSchema.parse(input))
  .handler(async ({ data }) => {
    const actor = await requireAuthenticatedUser();
    const { region, bucket } = getStorageConfig();
    const safeUserId = actor.userId.replace(/[^a-zA-Z0-9_-]/g, "-");
    const objectKey = `${data.folder}/${safeUserId}/${crypto.randomUUID()}.${extensionForContentType(data.contentType)}`;
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: objectKey,
      ContentType: data.contentType,
    });
    const uploadUrl = await getSignedUrl(getS3Client(region), command, {
      expiresIn: 300,
    });

    return { objectKey, uploadUrl, method: "PUT" as const, expiresIn: 300 };
  });

export const getS3SignedDownloadUrl = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => viewKeySchema.parse(input))
  .handler(async ({ data }) => {
    const { region, bucket } = getStorageConfig();
    const downloadUrl = await getSignedUrl(
      getS3Client(region),
      new GetObjectCommand({ Bucket: bucket, Key: data.objectKey }),
      { expiresIn: 300 },
    );

    return { downloadUrl, expiresIn: 300 };
  });
