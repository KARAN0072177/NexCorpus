import { S3Client } from "@aws-sdk/client-s3";

const region = process.env.AWS_REGION;
const bucketName = process.env.AWS_BUCKET_NAME;

if (!region) {
  throw new Error("AWS_REGION is not configured");
}

if (!bucketName) {
  throw new Error("AWS_BUCKET_NAME is not configured");
}

export const s3Client = new S3Client({
  region,
});

export const S3_BUCKET_NAME = bucketName;
export const S3_REGION = region;