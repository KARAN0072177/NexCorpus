import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db/mongodb";
import { User } from "../models/user.model";
import { Document } from "@/features/documents/models/document.model";
import { DocumentChunk } from "@/features/documents/models/document-chunk.model";
import { ProcessedDocument } from "@/features/documents/models/processed-document.model";
import { DocumentAIAnalysis } from "@/features/documents/models/document-ai-analysis.model";
import { DocumentMetadata } from "@/features/documents/models/document-metadata.model";
import { DocumentStructure } from "@/features/documents/models/document-structure.model";
import { ChatSession } from "@/features/chat/models/chat-session.model";
import { ChatMessage } from "@/features/chat/models/chat-message.model";
import { deleteS3Object } from "@/features/documents/services/storage/s3.service";
import { ragCacheService } from "@/features/documents/services/rag/cache/rag-cache.service";

interface CreateUserInput {
  googleId: string;
  email: string;
  name?: string;
  image?: string;
}

export async function findUserByGoogleId(googleId: string) {
  await connectToDatabase();

  return User.findOne({ googleId });
}

export async function findUserByEmail(email: string) {
  await connectToDatabase();

  return User.findOne({ email });
}

export async function findUserById(userId: string) {
  await connectToDatabase();

  return User.findById(userId);
}

export async function findUserByUsername(username: string) {
  await connectToDatabase();

  return User.findOne({ username });
}

export async function createUser(input: CreateUserInput) {
  await connectToDatabase();

  return User.create({
    googleId: input.googleId,
    email: input.email,
    name: input.name,
    image: input.image,
  });
}

export async function updateUsername(
  userId: string,
  username: string
) {
  await connectToDatabase();

  return User.findByIdAndUpdate(
    userId,
    {
      $set: {
        username,
      },
    },
    {
      new: true,
      runValidators: true,
    }
  );
}

export async function deleteUserAccount(userId: string) {
  await connectToDatabase();

  const user = await User.findById(userId);
  if (!user) {
    return null;
  }

  const userObjectId = new mongoose.Types.ObjectId(userId);

  // 1. Find all documents owned by this user
  const userDocuments = await Document.find({ ownerId: userObjectId });
  const documentIds = userDocuments.map((doc) => doc._id);

  // 2. Cascade delete all chunks belonging to this user's documents
  if (documentIds.length > 0) {
    await DocumentChunk.deleteMany({ documentId: { $in: documentIds } });

    // 3. Cascade delete all processed documents, AI analyses, metadata, and structures
    await Promise.allSettled([
      ProcessedDocument.deleteMany({ documentId: { $in: documentIds } }),
      DocumentAIAnalysis.deleteMany({ documentId: { $in: documentIds } }),
      DocumentMetadata.deleteMany({ documentId: { $in: documentIds } }),
      DocumentStructure.deleteMany({ documentId: { $in: documentIds } }),
    ]);

    // 4. Delete all user document files from S3 storage
    for (const doc of userDocuments) {
      if (doc.storageKey) {
        try {
          await deleteS3Object({ key: doc.storageKey });
        } catch (s3Err) {
          console.warn(
            `[deleteUserAccount] S3 deletion warning for key ${doc.storageKey}:`,
            s3Err
          );
        }
      }

      // Invalidate RAG in-memory cache for each document
      ragCacheService.invalidateDocument(doc._id.toString());
    }

    // 5. Delete all document records owned by this user
    await Document.deleteMany({ ownerId: userObjectId });
  }

  // 6. Cascade delete all chat sessions and messages for this user
  await Promise.allSettled([
    ChatSession.deleteMany({ userId: userObjectId }),
    ChatMessage.deleteMany({ userId: userObjectId }),
  ]);

  // 7. Delete the User record from MongoDB
  await User.findByIdAndDelete(userId);

  return { success: true };
}