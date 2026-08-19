import crypto from "crypto";
import { AskDocumentResult } from "../rag.service";

interface CacheEntry {
  documentId: string;
  result: AskDocumentResult;
  expiresAt: number;
}

export class RagCacheService {
  private cache = new Map<string, CacheEntry>();
  private readonly defaultTTLMs = 5 * 60 * 1000; // 5 minutes TTL

  private generateKey(
    documentId: string,
    query: string,
    conversation: Array<{ role: string; content: string }>
  ): string {
    const rawString = `${documentId}:${query.toLowerCase().trim()}:${JSON.stringify(
      conversation
    )}`;
    return crypto.createHash("sha256").update(rawString).digest("hex");
  }

  get(
    documentId: string,
    query: string,
    conversation: Array<{ role: string; content: string }> = []
  ): AskDocumentResult | null {
    const key = this.generateKey(documentId, query, conversation);
    const entry = this.cache.get(key);

    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.result;
  }

  set(
    documentId: string,
    query: string,
    conversation: Array<{ role: string; content: string }> = [],
    result: AskDocumentResult,
    ttlMs: number = this.defaultTTLMs
  ): void {
    const key = this.generateKey(documentId, query, conversation);
    this.cache.set(key, {
      documentId,
      result,
      expiresAt: Date.now() + ttlMs,
    });
  }

  invalidateDocument(documentId: string): void {
    for (const [key, entry] of this.cache.entries()) {
      if (entry.documentId === documentId) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }
}

export const ragCacheService = new RagCacheService();
