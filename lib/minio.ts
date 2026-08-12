import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const endpoint = process.env.MINIO_ENDPOINT,
  accessKeyId = process.env.MINIO_ACCESS_KEY,
  secretAccessKey = process.env.MINIO_SECRET_KEY;
export const minioBucket = process.env.MINIO_BUCKET || "xassida-media";

export function minioClient() {
  if (!endpoint || !accessKeyId || !secretAccessKey) throw new Error("MinIO n’est pas configuré");
  return new S3Client({
    endpoint,
    region: process.env.MINIO_REGION || "us-east-1",
    forcePathStyle: process.env.MINIO_FORCE_PATH_STYLE !== "false",
    credentials: { accessKeyId, secretAccessKey },
  });
}
export async function ensureBucket() {
  const client = minioClient();
  try {
    await client.send(new HeadBucketCommand({ Bucket: minioBucket }));
  } catch {
    await client.send(new CreateBucketCommand({ Bucket: minioBucket }));
  }
}
export async function putMedia(
  key: string,
  body: Uint8Array | Buffer | ReadableStream,
  contentType: string,
) {
  await ensureBucket();
  await minioClient().send(
    new PutObjectCommand({
      Bucket: minioBucket,
      Key: key,
      Body: body as Buffer,
      ContentType: contentType,
      CacheControl: "private, max-age=3600",
    }),
  );
  return key;
}
export async function deleteMedia(key: string) {
  await minioClient().send(new DeleteObjectCommand({ Bucket: minioBucket, Key: key }));
}
export async function signedMediaUrl(key: string, expiresIn = 900) {
  return getSignedUrl(minioClient(), new GetObjectCommand({ Bucket: minioBucket, Key: key }), {
    expiresIn,
  });
}
export async function signedUploadUrl(key: string, contentType: string, expiresIn = 300) {
  return getSignedUrl(
    minioClient(),
    new PutObjectCommand({ Bucket: minioBucket, Key: key, ContentType: contentType }),
    { expiresIn },
  );
}
export async function headMedia(key: string) {
  return minioClient().send(new HeadObjectCommand({ Bucket: minioBucket, Key: key }));
}
export async function readMediaPrefix(key: string, bytes = 8) {
  const result = await minioClient().send(
    new GetObjectCommand({ Bucket: minioBucket, Key: key, Range: `bytes=0-${bytes - 1}` }),
  );
  return result.Body ? Buffer.from(await result.Body.transformToByteArray()) : Buffer.alloc(0);
}
export function safeObjectName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-");
}
