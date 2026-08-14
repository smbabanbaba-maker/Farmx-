import { createServerFn } from "@tanstack/react-start";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { z } from "zod";
import { getAwsClientOptions } from "@/lib/aws-config";

const keySchema = z.object({
  objectKey: z.string().regex(/^(listings|products|community)\/[a-z0-9][a-z0-9._/-]*$/i),
  contentType: z.enum([
    "image/jpeg",
    "image/png",
    "image/heic",
    "image/webp",
    "video/mp4",
    "video/webm",
  ]),
});

const viewKeySchema = z.object({
  objectKey: z.string().regex(/^(listings|products|community)\/[a-z0-9][a-z0-9._/-]*$/i),
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

export const getS3SignedUploadUrl = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => keySchema.parse(input))
  .handler(async ({ data }) => {
    const { region, bucket } = getStorageConfig();
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: data.objectKey,
      ContentType: data.contentType,
      ServerSideEncryption: "AES256",
    });
    const uploadUrl = await getSignedUrl(getS3Client(region), command, {
      expiresIn: 300,
      signableHeaders: new Set(["content-type"]),
    });

    return { uploadUrl, method: "PUT" as const, expiresIn: 300 };
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
