# Chunking & RAG Retrieval Architecture

This document details the multi-stage document chunking algorithm, parent-child hierarchical segmentation, dual indexing (dense + sparse), reranking, and parent-context expanded retrieval pipeline in NexCorpus.

---

## Overview

Traditional RAG systems slice documents into fixed-size character windows (e.g., 512 tokens with 50-token overlap), losing structural context, table boundaries, and section relationships. 

NexCorpus implements a **Structure-Aware Parent/Child Chunking & Hybrid Retrieval Pipeline**. First, raw documents in S3 are parsed into canonical blocks (`ProcessedDocument`). Next, deterministic layout analysis is combined with LLM document understanding to build a semantic hierarchy. Large **Parent Chunks** preserve global section context, while small **Child Chunks** enable precise vector search. Finally, **Hybrid Search (Dense + Sparse)** combined with **Cross-Encoder Reranking** and **Parent Context Expansion** delivers grounded LLM responses with exact page and block citations.

---

## 14-Stage End-to-End Pipeline

| Step # | Stage Name | Initiator / Component | Target Layer / Model | Technical Description | Data / State Output |
| :-: | :--- | :--- | :--- | :--- | :--- |
| **1** | **S3 Private File** | AWS S3 | Storage Layer | Raw document binary payload stored in private AWS S3 bucket. | S3 Object |
| **2** | **File Processor** | Ingestion Engine | `pdf.processor.ts` | Formats, parses, normalizes, and cleans text and layout blocks. | Extracted line & block array |
| **3** | **ProcessedDocument** | MongoDB | Document Service | Persists canonical document blocks with page numbers, layout, and UUIDs. | `ProcessedDocument` record |
| **4a** | **Deterministic Analysis** | Analysis Engine | `document-structure.service` | Extracts layout rules, headings, section bounds, tables, and reading order. | `DocumentStructure` outline |
| **4b** | **OpenAI Enhancement** | AI Engine | `OpenAIProvider` | Extracts semantic topics, entities, relationships, summaries, and key points. | `DocumentAIAnalysis` |
| **5** | **Document Understanding** | Reconciliation Layer | `DocumentAnalysisService` | Merges deterministic layout + AI insights to build a unified semantic hierarchy. | Reconciled Document Hierarchy |
| **6** | **Semantic Chunking** | Chunking Engine | `chunker.service.ts` | Builds cohesive, size-aware, and overlap-aware semantic units from section bounds. | Semantic text segments |
| **7** | **Parent / Child Hierarchy** | Chunking Engine | `DocumentChunk` | Generates multi-level hierarchy: Large Parent chunks contain Small Child chunks. | Hierarchical Chunk Tree |
| **8** | **Chunks Storage** | MongoDB | Persistence Layer | Saves chunk records with rich metadata (`parentChunkId`, `sectionPath`, `sourceBlockIds`, `pageStart`, `pageEnd`). | `DocumentChunk` records |
| **9a** | **Dense Embeddings** | Vector Pipeline | OpenAI Embeddings | Generates dense vector representations for child chunks for semantic search. | Dense Vector Index |
| **9b** | **Sparse BM25 Index** | Search Engine | MongoDB Text / BM25 | Generates sparse lexical index for exact keyword, code, and term matching. | Sparse Lexical Index |
| **10** | **Hybrid Retrieval** | Retrieval Pipeline | Hybrid Search Engine | Combines dense vector search results + sparse BM25 keyword search results. | Top-K Candidate Chunks |
| **11** | **Reranker** | Ranking Engine | Cross-Encoder / LLM Ranker | Re-ranks top-K candidate chunks using fine-grained relevance scoring. | Re-ranked Candidate Chunks |
| **12** | **Parent Context Expansion** | Context Resolver | `DocumentChunk` | Resolves child chunks back to their parent chunks and adjacent siblings. | Expanded LLM Context |
| **13** | **LLM Generation** | AI Model | OpenAI GPT-4o | Generates answer strictly grounded on the expanded parent context payload. | Grounded Response |
| **14** | **Answer + Citations** | API / UI | Client Application | Returns answer accompanied by verified citations (source document, pages, block IDs). | Final Answer with Citations |

---

## Detailed Pipeline Breakdown

### 1. Ingestion & Canonical Processing (Steps 1–3)
* **Raw Binary Fetching**: The file is retrieved from private AWS S3 via deterministic keys (`documents/{ownerId}/{documentId}/original.{ext}`).
* **Canonical Representation**: `pdf.processor.ts` extracts positioned text lines and groups them into canonical content blocks (`heading`, `paragraph`, `code`, `list`, `table`).
* **Block Identifiers**: Every content block receives a stable UUID `id` and page index `page`.

### 2. Dual-Path Document Understanding (Steps 4–5)
* **Deterministic Path**: Extracts section trees (`DocumentStructure`) by evaluating font height ratios, heading levels, and uppercase patterns.
* **AI Path**: `OpenAIProvider` analyzes block flows to detect high-level topics, document classification (`resume`, `report`, `manual`), and semantic relationships.
* **Reconciliation**: Deterministic bounds provide precise byte/line offsets, while AI insights resolve ambiguous section breaks.

### 3. Parent / Child Semantic Chunking Strategy (Steps 6–8)
* **Parent Chunks**:
  * **Size**: ~1,000–2,000 tokens.
  * **Purpose**: Preserves entire logical sections, complete tables, and context.
  * **Storage**: Saved with `chunkType = "parent"` and `parentChunkId = null`.
* **Child Chunks**:
  * **Size**: ~200–400 tokens.
  * **Purpose**: Provides fine-grained semantic focus for vector embeddings.
  * **Storage**: Saved with `chunkType = "child"` and `parentChunkId = <Parent_ObjectID>`.
* **Provenance**: Every chunk tracks exact `sourceBlockIds`, `sectionPath`, `pageStart`, and `pageEnd`.

### 4. Dual Indexing & Hybrid Retrieval (Steps 9–11)
* **Hybrid Search (Dense + Sparse)**:
  * **Dense Vector Search**: Captures conceptual meaning, synonyms, and intent using OpenAI vector embeddings.
  * **Sparse Lexical Search (BM25)**: Captures exact entity names, serial numbers, code symbols, and technical terms.
* **Cross-Encoder Reranking**: Re-evaluates top-K candidates from both search indices simultaneously using a cross-encoder model to filter out false positives.

### 5. Parent Context Expansion & Grounded Answer (Steps 12–14)
* **Small-to-Large Retrieval**: Retrieval is performed on small **Child Chunks** for high precision, but the **Parent Chunk** (and adjacent siblings) is fetched for LLM generation.
* **Zero Hallucination**: The LLM receives complete, un-truncated context blocks, allowing it to produce accurate answers.
* **Verifiable Citations**: Every answer includes precise citations linking directly back to source documents, page numbers, and original block IDs.

---

## Architectural & Security Benefits

1. **High Precision & Recall**: Hybrid retrieval (Dense + BM25) ensures both semantic meaning and exact keyword hits are captured.
2. **Context Integrity**: Parent/Child chunking prevents truncated sentence errors during generation.
3. **Traceable Lineage**: Every retrieved chunk maps directly to `sourceBlockIds` and `pageStart`/`pageEnd`.
4. **Isolated Multi-Tenant Security**: Storage and search indexes strictly filter by `documentId` and user `ownerId`.
