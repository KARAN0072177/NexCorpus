# NexCorpus System Architecture Flow

This document details the 13-stage end-to-end system architecture flow for NexCorpus, spanning document management, security boundaries, vector processing, retrieval, and grounded AI response generation.

---

## Overview

The NexCorpus system architecture establishes a modular pipeline that ingests raw documents, processes and indexes them into vector space, enforces tenant security boundaries, and retrieves grounded context to answer user queries with source attribution.

---

## 13-Stage Pipeline Breakdown

| Stage # | Stage Name | Category / Layer | Technical Description |
| :-: | :--- | :--- | :--- |
| **1** | **Filesystem** | Storage Layer | Store and manage raw uploaded files in a structured filesystem (e.g., AWS S3 or local storage). |
| **2** | **MongoDB Foundation** | Database Layer | Initialize MongoDB as the primary database for storing documents, metadata, and user identities. |
| **3** | **Authentication** | Security Layer | Verify user identity using secure login mechanisms and session token management (Auth.js / Google OAuth). |
| **4** | **Authorization Foundation** | Security Layer | Define roles, scopes, and access control policies to regulate resource access across users. |
| **5** | **Document Domain** | Domain Layer | Define document schemas, status lifecycles, and structural metadata. |
| **6** | **Document Ownership** | Domain Layer | Associate documents explicitly with user owners and enforce strict tenant access rights. |
| **7** | **Ingestion / Security Boundary** | Pipeline Boundary | Validate, sanitize, virus-scan, and enforce security policies on incoming file content before parsing. |
| **8** | **Parsing** | Processing Layer | Extract clean text and structured data from different file formats (PDF, DOCX, TXT). |
| **9** | **Chunking** | Processing Layer | Split parsed text into smaller, overlapping, semantic segments optimized for embedding and LLM context windows. |
| **10** | **Embeddings** | AI Vector Layer | Generate vector embeddings for each document chunk using an embedding model (e.g., OpenAI Embeddings). |
| **11** | **Vector Retrieval** | Retrieval Layer | Retrieve top-K relevant chunks using vector similarity search (MongoDB Atlas Vector Search) based on user query embeddings. |
| **12** | **Generation** | AI Generation Layer | Generate accurate, grounded responses from retrieved context chunks using an LLM (e.g., OpenAI GPT-4o-mini). |
| **13** | **API / UI** | Presentation Layer | Expose system functionality via API routes and provide an interactive frontend user interface. |

---

## Architectural Principles

1. **Incremental Complexity**: Introduce infrastructure layers (queues, re-rankers, caches) only when scale demands it.
2. **Strict Data Isolation**: Documents and vector embeddings are bound to specific owner IDs at every stage of the pipeline.
3. **Grounded Answers**: Generation strictly relies on retrieved document chunks to eliminate hallucinations and provide source evidence.
