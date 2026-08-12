import OpenAI from "openai";

export const OPENAI_EMBEDDING_MODEL =
  "text-embedding-3-small";

export const OPENAI_EMBEDDING_DIMENSIONS =
  1536;

export interface EmbeddingProvider {
  embed(text: string): Promise<number[]>;

  embedMany(
    texts: string[]
  ): Promise<number[][]>;
}

export class OpenAIEmbeddingProvider
  implements EmbeddingProvider
{
  private readonly client: OpenAI;

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error(
        "OPENAI_API_KEY is not configured"
      );
    }

    this.client = new OpenAI({
      apiKey:
        process.env.OPENAI_API_KEY,
    });
  }

  async embed(
    text: string
  ): Promise<number[]> {
    const normalizedText =
      this.normalizeText(text);

    if (!normalizedText) {
      throw new Error(
        "Cannot generate embedding for empty text"
      );
    }

    const response =
      await this.client.embeddings.create({
        model:
          OPENAI_EMBEDDING_MODEL,

        input: normalizedText,

        encoding_format: "float",
      });

    const embedding =
      response.data[0]?.embedding;

    if (
      !embedding ||
      embedding.length === 0
    ) {
      throw new Error(
        "OpenAI returned an empty embedding"
      );
    }

    return embedding;
  }

  async embedMany(
    texts: string[]
  ): Promise<number[][]> {
    const normalizedTexts =
      texts.map((text) =>
        this.normalizeText(text)
      );

    if (
      normalizedTexts.length === 0
    ) {
      return [];
    }

    if (
      normalizedTexts.some(
        (text) => !text
      )
    ) {
      throw new Error(
        "Cannot generate embeddings for empty text"
      );
    }

    const response =
      await this.client.embeddings.create({
        model:
          OPENAI_EMBEDDING_MODEL,

        input: normalizedTexts,

        encoding_format: "float",
      });

    /*
     * OpenAI returns embeddings with an index.
     *
     * Sort by index so the output order always
     * matches the input order.
     */

    const sortedEmbeddings =
      [...response.data].sort(
        (a, b) => a.index - b.index
      );

    if (
      sortedEmbeddings.length !==
      normalizedTexts.length
    ) {
      throw new Error(
        "OpenAI returned an unexpected number of embeddings"
      );
    }

    const embeddings =
      sortedEmbeddings.map(
        (item) => item.embedding
      );

    if (
      embeddings.some(
        (embedding) =>
          !embedding ||
          embedding.length === 0
      )
    ) {
      throw new Error(
        "OpenAI returned an empty embedding"
      );
    }

    return embeddings;
  }

  private normalizeText(
    text: string
  ): string {
    return text
      .replace(/\s+/g, " ")
      .trim();
  }
}

export const openAIEmbeddingProvider =
  new OpenAIEmbeddingProvider();