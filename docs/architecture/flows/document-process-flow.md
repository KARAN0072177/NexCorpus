# Document Process Flow

This document details the document processing lifecycle, status state transitions, and stage gate constraints for uploaded documents in NexCorpus.

---

## Overview

The document processing architecture tracks documents across five distinct pipeline stages: **Upload**, **Storage**, **Security**, **Processing**, and **Indexing**, leading to a final derived state of **Ready**. Each stage maintains explicit status tracking and requires strict completion gates before advancing a document to subsequent stages.

---

## Document Pipeline Stages & Status Lifecycles

| Stage | Stage Name | Purpose & Description | Possible Status Values | Gate Constraint to Next Stage |
| :-: | :--- | :--- | :--- | :--- |
| **1** | **UPLOAD** | Initial file submission initiated by the user. | N/A (Entry Action) | Proceeds immediately to Storage initialization. |
| **2** | **STORAGE** | File upload & physical storage persistence (S3 / disk). | `PENDING`, `UPLOADED`, `FAILED` | Must reach `UPLOADED` state. |
| **3** | **SECURITY** | Content validation, virus scanning, and format inspection. | `PENDING`, `SCANNING`, `APPROVED`, `REJECTED`, `FAILED` | **APPROVED ONLY** (Rejections & failures halt processing). |
| **4** | **PROCESSING** | Text extraction, parsing (PDF/DOCX/TXT), and text chunking. | `NOT_STARTED`, `PROCESSING`, `COMPLETED`, `FAILED` | **COMPLETED ONLY** (Parsing/chunking must succeed). |
| **5** | **INDEXING** | Vector embedding generation (OpenAI) and vector indexing (MongoDB Atlas). | `NOT_STARTED`, `PROCESSING`, `COMPLETED`, `FAILED` | **COMPLETED ONLY** (Vector embedding must succeed). |
| **6** | **READY** | **Derived State**: Document is fully indexed and ready for RAG vector queries. | `READY` (Derived) | Available for query retrieval. |

---

## Detailed State Transition Matrix

### 1. Storage Status (`storageStatus`)
* **`PENDING`**: Storage upload initiated, awaiting file stream completion.
* **`UPLOADED`**: File successfully persisted to storage bucket/disk.
* **`FAILED`**: File stream or network upload failed.

### 2. Security Status (`securityStatus`)
* **`PENDING`**: Queued for security validation.
* **`SCANNING`**: Virus scan and content sanitization in progress.
* **`APPROVED`**: File passed all security checks. **(Required to proceed)**
* **`REJECTED`**: Malicious or invalid content detected; file rejected.
* **`FAILED`**: Security scanner failure.

### 3. Processing Status (`processingStatus`)
* **`NOT_STARTED`**: Awaiting security approval.
* **`PROCESSING`**: Text extraction and chunking currently running.
* **`COMPLETED`**: Text extracted into overlapping semantic chunks. **(Required to proceed)**
* **`FAILED`**: Text extraction or parser error.

### 4. Indexing Status (`indexingStatus`)
* **`NOT_STARTED`**: Awaiting processing completion.
* **`PROCESSING`**: Generating embeddings and indexing vectors.
* **`COMPLETED`**: Embeddings stored in MongoDB Atlas Vector Search. **(Required for Ready state)**
* **`FAILED`**: Embedding API or vector store error.

---

## Derived Ready State Rule

A document achieves the derived **`READY`** state if and only if all three gate conditions are satisfied simultaneously:

$$\text{Ready State} = (\text{securityStatus} = \text{"APPROVED"}) \land (\text{processingStatus} = \text{"COMPLETED"}) \land (\text{indexingStatus} = \text{"COMPLETED"})$$

Only documents in the **`READY`** state are surfaced for RAG retrieval and vector similarity search.
