# NexCorpus

## AI-Powered Document and Knowledge Assistant (RAG)

NexCorpus is a web application that allows users to upload their own documents and ask natural-language questions about their content.

Instead of returning a list of search results, NexCorpus retrieves relevant information from the uploaded documents and generates direct, grounded answers based on that content.

NexCorpus is commonly described as:

- Chat with your documents
- AI knowledge assistant
- Retrieval-Augmented Generation (RAG)

At a high level, NexCorpus places an AI layer on top of a private document collection so answers are generated from uploaded source content rather than relying only on the model's general knowledge.

## 1. What Is It?

NexCorpus allows a user to:

1. Upload documents.
2. Process and index their content.
3. Ask natural-language questions.
4. Retrieve relevant portions of uploaded documents.
5. Generate answers grounded in the retrieved content.
6. See which source content was used to produce the answer.

The core idea is:

```text
Document
  -> Text Extraction
  -> Chunking
  -> Embeddings
  -> Vector Search
  -> Relevant Chunks
  -> LLM
  -> Grounded Answer
```

## 2. Why We Need It

General-purpose AI models such as ChatGPT and Claude are trained primarily on public data and do not automatically have access to a company's private, internal, or newly created documents.

Manually searching through long documents to find a single answer is slow and inefficient. Support and documentation teams may also repeatedly answer questions that are already addressed somewhere in their documentation.

NexCorpus addresses this by allowing users to ask questions directly against their own document collection.

### Example

A SaaS company has a 200-page documentation set.

Customers repeatedly ask support:

> "How do I cancel my subscription?"

The answer already exists somewhere in the documentation, but manually finding it requires searching through the available material.

NexCorpus can retrieve the relevant section and provide a grounded answer directly from the actual documentation. This reduces repetitive searching and can reduce repetitive support requests while keeping answers tied to source material.

## 3. What Problem It Solves

| Problem | How NexCorpus Solves It |
| --- | --- |
| AI hallucination | Answers are grounded in retrieved source content rather than relying only on model memory. |
| Private or internal data is unavailable to general AI models | Documents are indexed and searched at query time. |
| Limited context window | Only relevant chunks are provided to the model rather than the entire document collection. |
| Stale or scattered knowledge | Documents can be re-indexed when their contents change. |
| Difficult document discovery | Semantic retrieval can find relevant content even when the user's wording differs from the document. |

## 4. Why Not Just Store Documents and Use Search?

This is an important architectural question.

Plain search is not obsolete. It is still the better choice for some situations.

### Where Plain Search Is Fine

Plain search works well for:

- Small document collections
- Exact-match lookups
- Filenames
- Error codes
- Function names
- Situations where simplicity and cost matter more than convenience

### Where Keyword Search Breaks Down

#### 4.1 Wording Mismatch

Keyword search generally looks for literal terms.

For example, a document may contain:

> "termination clause"

while the user searches:

> "How do I cancel?"

A keyword search may fail to connect those two expressions. Semantic retrieval can identify that the two queries have related meaning.

#### 4.2 Search Returns Documents, RAG Returns Answers

A search engine generally returns a ranked list of documents or passages.

The user still needs to:

1. Open the result.
2. Read the relevant section.
3. Find the answer.
4. Combine information if necessary.

A RAG system performs the retrieval and synthesis step for the user.

#### 4.3 Multi-Source Synthesis

Some questions require information from multiple parts of a document collection.

For example:

```text
Document A -> Pricing information
Document B -> Cancellation policy
Document C -> Enterprise restrictions
```

A traditional search system may return three separate results.

A RAG system can retrieve the relevant pieces and use them together to construct one coherent answer.

#### 4.4 Conversational Context

Traditional search treats every search as an isolated lookup.

A RAG assistant can use conversational context to understand follow-up questions.

For example:

```text
User:
What is the refund policy?

Assistant:
...

User:
What about enterprise customers?
```

The second question can be interpreted in relation to the previous conversation.

#### 4.5 Scale

With a small number of documents, manually searching and reading may be perfectly reasonable.

With thousands of documents, manually finding the correct information becomes increasingly difficult. A properly indexed retrieval system can search a large collection efficiently.

### Honest Caveat

RAG is not automatically better than traditional search.

RAG introduces:

- Embedding costs
- LLM costs
- Vector database infrastructure
- An ingestion pipeline
- Additional debugging complexity
- Retrieval-quality problems

Plain search should be preferred when queries are simple and exact.

RAG becomes more useful when users ask natural-language questions across large or loosely organized document collections.

## 5. Planned Tech Stack

| Layer | Technology | Purpose |
| --- | --- | --- |
| Frontend and API | Next.js App Router, TypeScript | UI and API routes for upload, chat, and authentication |
| Authentication | OAuth 2.0 with Google | Keeps each user's documents private to their account |
| File Storage | AWS S3 | Stores original uploaded files |
| Document Parsing | `pdf-parse`, Python `PyPDF2`, or `unstructured` | Extracts raw text from uploaded files |
| Chunking | Custom splitter or LangChain text splitter | Breaks text into overlapping, meaningful chunks |
| Embeddings | OpenAI Embeddings API | Converts text chunks and queries into vectors |
| Vector Storage | MongoDB Atlas Vector Search | Stores and searches vectors by semantic similarity |
| Answer Generation | OpenAI API | Generates grounded answers from retrieved chunks |
| Real-Time Delivery | WebSockets or streaming responses | Streams the answer token by token |
| Notifications | Resend | Emails the user when a large document finishes processing |
| Background Jobs | AWS SNS/SQS | Queues document ingestion so large files do not block uploads |
| Security | CloudFront, signed URLs, rate limiting | Protects file access and public endpoints |

## 6. MVP: What to Build First

Building the entire system in one pass is a mistake.

A working small version is better than an ambitious broken version. The MVP should establish the core RAG pipeline before introducing additional infrastructure.

### Phase 1: MVP

The initial version should include:

- Single-format upload: PDF only
- Store the original file in S3
- Parse text synchronously
- Fixed-size chunking with overlap
- Generate embeddings using OpenAI
- Store embeddings in MongoDB Atlas Vector Search
- Basic chat interface
- Question embedding, similarity search, top-k chunks, and GPT-generated answer
- Display the source chunk or document used to generate the answer

The core flow is:

```text
PDF Upload
  -> S3
  -> Text Extraction
  -> Chunking
  -> Embeddings
  -> MongoDB Atlas Vector Search
  -> User Question
  -> Question Embedding
  -> Similarity Search
  -> Top-K Chunks
  -> GPT
  -> Grounded Answer
  -> Source Evidence
```

Showing the source content is an important part of the MVP because it demonstrates that the answer is grounded in retrieved information rather than generated blindly.

## 7. Phase 2: After the MVP Works

Once the MVP works reliably, additional production-oriented capabilities can be introduced.

This phase demonstrates system growth and engineering decision-making rather than simply following a tutorial.

### Multi-User Support

- OAuth authentication
- Multi-user document isolation
- User-specific document access

### Multi-Format Support

Support additional sources such as:

- DOCX
- TXT
- Web pages

### Asynchronous Ingestion

Move large-document processing to an asynchronous workflow using AWS SQS.

```text
Upload
  -> API
  -> Queue
  -> Worker
  -> Parse
  -> Chunk
  -> Embed
  -> Store
```

This prevents long-running document processing from blocking the upload request.

### WebSocket Streaming

Instead of waiting for the complete answer, stream the generated response token by token to the client.

```text
Question
  -> Retrieval
  -> LLM
  -> Token
  -> Client
  -> Token
  -> Client
  -> ...
```

### Security

Introduce additional protection for public endpoints and file access:

- Rate limiting
- CloudFront
- Signed URLs
- Cloudflare Turnstile where appropriate

### Retrieval Improvements

Introduce a re-ranking stage to improve retrieval accuracy.

Initial retrieval:

```text
Question
  -> Vector Search
  -> Top-K Candidates
```

Improved retrieval:

```text
Question
  -> Vector Search
  -> Candidate Chunks
  -> Re-Ranking
  -> Best Chunks
  -> LLM
```

### Retrieval Evaluation

Create a small evaluation dataset to determine whether retrieval is actually returning the correct chunks.

The goal is not simply to measure whether the final answer looks good. The retrieval system needs to be evaluated on whether it finds the relevant source material.

## 8. Core Engineering Principle

NexCorpus should be built incrementally.

Additional infrastructure should be introduced only when it solves a demonstrated problem. The initial system should remain simple enough to understand and debug.

The development progression is:

```text
Simple Working System
  -> Understand the Pipeline
  -> Measure Its Limitations
  -> Identify Real Problems
  -> Introduce Appropriate Solutions
  -> Measure Again
```

## 9. RAG Pipeline

The central RAG pipeline is:

```text
Document
  -> Text Extraction
  -> Chunking
  -> Embeddings
  -> Vector Storage

User Question
  -> Query Embedding
  -> Vector Search
  -> Top-K Chunks
  -> Prompt + Context
  -> LLM
  -> Grounded Answer
  -> Source Evidence
```

The quality of this pipeline depends heavily on:

- Text extraction
- Chunking strategy
- Chunk size
- Chunk overlap
- Embedding quality
- Vector search
- Retrieval parameters
- Retrieved context
- Prompt construction
- Answer generation

The final answer should not be treated as the only measure of RAG quality.

## 10. Project Philosophy

NexCorpus is not being built as an AI showcase.

The objective is to build and understand a complete document intelligence system.

The project should demonstrate:

- Practical RAG implementation
- Document ingestion
- Semantic retrieval
- Vector search
- Grounded generation
- Authentication and data isolation
- Secure file handling
- Asynchronous processing
- Real-time communication
- Retrieval evaluation
- Production-oriented engineering decisions

The guiding principle is:

> Build the simplest system that solves the current problem, understand its limitations, and introduce complexity only when the problem requires it.

## Local Development

Install dependencies:

```bash
pnpm install
```

Start the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

Useful commands:

```bash
pnpm lint
pnpm build
pnpm start
```

## Status

| Field | Value |
| --- | --- |
| Project | NexCorpus |
| Stage | Initial setup |
| Current focus | Next.js foundation and system architecture |
| Repository state | Fresh Next.js App Router project |
