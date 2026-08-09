import { connectToDatabase } from "@/lib/db/mongodb";
import { Document } from "../models/document.model";

export interface CreateDocumentInput {
  ownerId: string;

  originalFilename: string;
  mimeType: string;
  extension: string;
  size: number;
}

export async function createDocument(input: CreateDocumentInput) {
  await connectToDatabase();

  return Document.create({
    ownerId: input.ownerId,

    originalFilename: input.originalFilename,
    mimeType: input.mimeType,
    extension: input.extension,
    size: input.size,

    storageStatus: "PENDING",
    securityStatus: "PENDING",
    processingStatus: "NOT_STARTED",
    indexingStatus: "NOT_STARTED",
  });
}

export async function findDocumentById(
  documentId: string,
  ownerId: string
) {
  await connectToDatabase();

  return Document.findOne({
    _id: documentId,
    ownerId,
  });
}

export async function findDocumentsByOwner(ownerId: string) {
  await connectToDatabase();

  return Document.find({
    ownerId,
  }).sort({
    createdAt: -1,
  });
}

export async function deleteDocument(
  documentId: string,
  ownerId: string
) {
  await connectToDatabase();

  return Document.findOneAndDelete({
    _id: documentId,
    ownerId,
  });
}