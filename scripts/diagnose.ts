import mongoose from "mongoose";
import { connectToDatabase } from "../src/lib/db/mongodb";
import { openAIEmbeddingProvider } from "../src/features/documents/services/embedding/providers/openai.embedding.provider";
import { DocumentChunk } from "../src/features/documents/models/document-chunk.model";

async function diagnose() {
  await connectToDatabase();

  const docId = new mongoose.Types.ObjectId("6a788892aba263e5f921bdcb");
  const rawQuery = "What AWS services have I worked with?";

  console.log("=== DIAGNOSTIC FOR QUERY: \"" + rawQuery + "\" ===\n");

  const queryVector = await openAIEmbeddingProvider.embed(rawQuery);

  console.log("--- PIPELINE 1: STANDALONE $vectorSearch ---");
  const vectorRes = await DocumentChunk.aggregate([
    {
      $vectorSearch: {
        index: "document_chunks_vector_index",
        path: "embedding",
        queryVector,
        numCandidates: 100,
        limit: 10,
        filter: {
          $and: [
            { documentId: docId },
            { chunkType: "child" },
          ],
        },
      },
    },
    {
      $project: {
        _id: 1,
        sectionPath: 1,
        text: 1,
        score: { $meta: "vectorSearchScore" },
      },
    },
  ]);

  vectorRes.forEach((r, i) => {
    console.log(
      `[Rank ${i + 1}] Score: ${r.score.toFixed(6)} | Section: ${r.sectionPath.join(" > ")} | Snippet: "${r.text.substring(0, 70).replace(/\n/g, " ")}"`
    );
  });

  console.log("\n--- PIPELINE 2: STANDALONE $search (Lexical BM25) ---");
  try {
    const textRes = await DocumentChunk.aggregate([
      {
        $search: {
          index: "document_chunks_search_index",
          compound: {
            must: [
              {
                text: {
                  query: rawQuery,
                  path: "text",
                },
              },
            ],
            filter: [
              {
                equals: {
                  path: "documentId",
                  value: docId,
                },
              },
              {
                equals: {
                  path: "chunkType",
                  value: "child",
                },
              },
            ],
          },
        },
      },
      { $limit: 10 },
      {
        $project: {
          _id: 1,
          sectionPath: 1,
          text: 1,
          score: { $meta: "searchScore" },
        },
      },
    ]);

    if (textRes.length === 0) {
      console.log("(No results returned by $search)");
    } else {
      textRes.forEach((r, i) => {
        console.log(
          `[Rank ${i + 1}] Score: ${r.score.toFixed(6)} | Section: ${r.sectionPath.join(" > ")} | Snippet: "${r.text.substring(0, 70).replace(/\n/g, " ")}"`
        );
      });
    }
  } catch (err: any) {
    console.log("ERROR IN $search:", err.message);
  }

  console.log("\n--- PIPELINE 3: COMBINED $rankFusion ---");
  const hybridRes = await DocumentChunk.aggregate([
    {
      $rankFusion: {
        input: {
          pipelines: {
            vectorSearch: [
              {
                $vectorSearch: {
                  index: "document_chunks_vector_index",
                  path: "embedding",
                  queryVector,
                  numCandidates: 100,
                  limit: 20,
                  filter: {
                    $and: [
                      { documentId: docId },
                      { chunkType: "child" },
                    ],
                  },
                },
              },
            ],
            textSearch: [
              {
                $search: {
                  index: "document_chunks_search_index",
                  compound: {
                    must: [
                      {
                        text: {
                          query: rawQuery,
                          path: "text",
                        },
                      },
                    ],
                    filter: [
                      {
                        equals: {
                          path: "documentId",
                          value: docId,
                        },
                      },
                      {
                        equals: {
                          path: "chunkType",
                          value: "child",
                        },
                      },
                    ],
                  },
                },
              },
              { $limit: 20 },
            ],
          },
        },
        combination: {
          weights: {
            vectorSearch: 1,
            textSearch: 1,
          },
        },
        scoreDetails: true,
      },
    },
    { $limit: 10 },
    {
      $project: {
        _id: 1,
        sectionPath: 1,
        text: 1,
        score: { $meta: "score" },
      },
    },
  ] as any[]);

  hybridRes.forEach((r, i) => {
    console.log(
      `[Rank ${i + 1}] Fusion Score: ${r.score.toFixed(6)} | Section: ${r.sectionPath.join(" > ")} | Snippet: "${r.text.substring(0, 70).replace(/\n/g, " ")}"`
    );
  });

  process.exit(0);
}

diagnose().catch(console.error);
