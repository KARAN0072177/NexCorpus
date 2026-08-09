import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";

import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import {
  s3Client,
  S3_BUCKET_NAME,
} from "@/lib/aws/s3";

const PRESIGNED_UPLOAD_EXPIRATION = 60 * 5;
const PRESIGNED_DOWNLOAD_EXPIRATION = 60 * 5;

export async function createUploadPresignedUrl({
  key,
  contentType,
}: {
  key: string;
  contentType: string;
}) {
  const command = new PutObjectCommand({
    Bucket: S3_BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });

  return getSignedUrl(s3Client, command, {
    expiresIn: PRESIGNED_UPLOAD_EXPIRATION,
    signableHeaders: new Set(["content-type"]),
  });
}

export async function createDownloadPresignedUrl({
  key,
}: {
  key: string;
}) {
  const command = new GetObjectCommand({
    Bucket: S3_BUCKET_NAME,
    Key: key,
  });

  return getSignedUrl(s3Client, command, {
    expiresIn: PRESIGNED_DOWNLOAD_EXPIRATION,
  });
}

export async function getObjectMetadata({
  key,
}: {
  key: string;
}) {
  const command = new HeadObjectCommand({
    Bucket: S3_BUCKET_NAME,
    Key: key,
  });

  return s3Client.send(command);
}