# RAG Assignment Backend

A robust backend service for a Retrieval-Augmented Generation (RAG) system, built with Node.js, Express, and OpenAI.

## Repository

[https://github.com/phaneendra/rag-assignment-backend](https://github.com/phaneendra/rag-assignment-backend)

## Overview

This service handles:

1.  **Web Scraping**: Extracting content from URLs using Puppeteer.
2.  **Vector Storage**: Embedding and storing document chunks in ChromaDB.
3.  **Chat Completion**: Answering user queries using context retrieved from the vector store via OpenAI.
4.  **History Management**: Persisting conversation history in SQLite.

## Prerequisites

- Node.js (v18+)
- Docker & Docker Compose (for ChromaDB)
- OpenAI API Key

## Setup Instructions

### 1. Clone the repository

```bash
git clone https://github.com/phaneendra/rag-assignment-backend.git
cd rag-assignment-backend
```

### 2. Install dependencies

```bash
npm install
```

### 3. Environment Configuration

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Ensure the following variables are set:

```env
PORT=5001
DATABASE_URL="file:./dev.db"
OPENAI_API_KEY="sk-..."
CHROMA_DB_URL="http://localhost:8000"
```

### 4. Run the Application

#### Option A: Local Development (Recommended)

Use this method for faster feedback loops.

1.  **Start ChromaDB**:
    ```bash
    docker compose up -d chromadb
    ```
2.  **Start the Server**:
    ```bash
    npm run dev
    ```
    This command automatically runs database migrations and starts the server in watch mode.

#### Option B: Docker Compose (Full Stack)

Run the entire backend stack (App + ChromaDB) in containers.

```bash
docker compose up -d --build
```

The API will be available at `http://localhost:5001`.

## Design Decisions & Tradeoffs

### Architecture: Express & Node.js

**Decision**: Used Express for its simplicity and huge ecosystem.

### Database: SQLite & Prisma

**Decision**: SQLite was chosen for zero-configuration persistence, perfect for local development and small-to-medium deployments. Prisma acts as the ORM for type-safe database interactions.

### Vector Store: ChromaDB

**Decision**: Run ChromaDB locally via Docker.
**Tradeoff**: Self-hosting ChromaDB requires managing the container/volume, but it keeps data private and avoids external cloud vector DB costs/latency during development.

### Scraper: Puppeteer

**Decision**: Used Puppeteer (headless Chrome) instead of simple HTML parsers (like Cheerio).
**Tradeoff**: Puppeteer is heavier and slower, but it's maximizing reliability. Many modern documentation sites rely heavily on JavaScript (SPAs), which simple parsers essentially see as empty pages. Puppeteer ensures we capture the actual rendered content.

### RAG Pipeline

**Decision**: Simple "Retrieve-then-Generate" pipeline using OpenAI embeddings.
**Tradeoff**: Currently retrieves top-k chunks based on semantic similarity. A more advanced setup might include a re-ranking step or hybrid search (keyword + refreshing) to improve accuracy on specific terms, but this baseline provides strong general performance.

## Chunking & Tokenization Strategy

The system relies on a **semantic-preserving** chunking strategy to ensure that retrieved context is both coherent and fits within the LLM's context window.

### 1. Tokenization (`tiktoken`)

We use `tiktoken` to count tokens exactly as the LLM sees them. This prevents "context window overflow" errors that can happen if you rely on simple character or word counts (where 1000 characters could randomly be 200 or 500 tokens).

### 2. Hierarchical Chunking

Instead of arbitrarily slicing text every $N$ characters, we use a paragraph-first approach:

1.  **Paragraphs**: Text is first split by double newlines (`\n\n`). We attempt to group whole paragraphs into a chunk until the `MAX_CHUNK_TOKENS` (500) limit is reached. This preserves the flow of ideas.
2.  **Sentences**: If a single paragraph exceeds the limit, we fall back to splitting by sentences (using regex for `.!?`).
3.  **Hard Cut**: In the rare case of a massive sentence (e.g., a long code block or legal disclaimer) exceeding the limit, we perform a hard token-level slice to ensure strict compliance.

**Why this design?**

- **Context Quality**: Models perform better when given complete thoughts. Cutting a sentence in half destroys its semantic meaning, leading to poor embeddings and irrelevant retrieval.
- **Efficiency**: 500 tokens is a "sweet spot" — large enough to contain a full answer context, but small enough to retrieve multiple diverse chunks (top-k=5) without blowing up the prompt cost.
