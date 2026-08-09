# AWS S3 Direct Upload Flow

This document details the direct-to-S3 document upload lifecycle, presigned URL authorization, private bucket storage, and backend completion verification in NexCorpus.

---

## Overview

To prevent heavy binary payloads from blocking API server threads, NexCorpus utilizes a direct-to-S3 upload architecture. The client first registers document metadata in MongoDB (`PENDING`), requests a short-lived presigned S3 PUT URL, uploads the file directly to private AWS S3, and finally triggers backend verification (`HeadObject`) to confirm file integrity before setting the storage state to `UPLOADED`.

---

## 4-Step Direct Upload Sequence

| Step # | Flow Action | Initiator / Component | Target Endpoint / Layer | Technical Description | State Change |
| :-: | :--- | :--- | :--- | :--- | :--- |
| **1** | **Create Metadata** | Browser Client | `POST /api/documents` | Registers document metadata (filename, mimeType, extension, size) in database. | MongoDB `storage = PENDING` |
| **2** | **Request Upload URL** | Browser Client | `POST /api/documents/:id/upload` | Verifies user ownership and generates a time-limited signed S3 `PutObjectCommand` URL. | Presigned URL generated |
| **3** | **PUT File** | Browser Client | Private AWS S3 Bucket | Streams raw binary payload directly from browser to private S3 bucket using the presigned URL. | Binary stored in S3 |
| **4** | **Complete & Verify** | Browser Client | `POST /api/documents/:id/upload/complete` | Backend executes `HeadObject` on S3 to verify object existence and file size match. | MongoDB `storage = UPLOADED` |

---

## Endpoint & Verification Lifecycle Breakdown

### Step 1: Metadata Registration (`POST /api/documents`)
* **Client Request**: Sends metadata (`originalFilename`, `mimeType`, `extension`, `size`).
* **Authorization**: Guarded by `requireApiUser()`.
* **Database Action**: Creates document record in MongoDB with `storageStatus = "PENDING"`.

### Step 2: Presigned URL Generation (`POST /api/documents/:id/upload`)
* **Client Request**: Requests upload authorization for `documentId`.
* **Authorization & Ownership Check**: Confirms requesting user owns the document (`document.ownerId === user._id`).
* **Key Generation**: Generates deterministic storage key: `documents/{ownerId}/{documentId}/original.{ext}`.
* **Signed URL**: Uses `@aws-sdk/s3-request-presigner` (`PutObjectCommand`) with a 5-minute expiration and required `content-type` header binding.

### Step 3: Direct S3 Upload (`PUT [Presigned URL]`)
* **Client Action**: Issues HTTP `PUT` request with raw binary file payload directly to AWS S3.
* **Security**: Private S3 bucket enforces CORS policies and blocks public read/write access.

### Step 4: Completion Verification (`POST /api/documents/:id/upload/complete`)
* **Client Action**: Notifies backend that S3 upload completed.
* **S3 Inspection**: Backend performs `HeadObjectCommand` to retrieve physical object metadata from S3.
* **Validation Decision Tree**:
  * **Verified (`YES`)**: Object exists, `ContentLength > 0`, and `ContentLength === document.size`. Updates MongoDB `storageStatus = "UPLOADED"` and sets `storageKey`.
  * **Failed (`NO`)**: Object missing or size mismatch. Returns HTTP `400 Bad Request` upload error response.

---

## Architectural & Security Benefits

1. **Server Offloading**: Binary data transfers bypass the Next.js server entirely, protecting API memory and throughput.
2. **Deterministic Keys & Tenant Isolation**: S3 objects are isolated under `documents/{ownerId}/{documentId}/` paths.
3. **Time-Limited Signed Access**: Presigned URLs expire after 5 minutes and require exact MIME type headers.
4. **Strict Verification Gate**: Documents remain in `PENDING` state until server-side `HeadObject` confirms physical S3 storage integrity.
