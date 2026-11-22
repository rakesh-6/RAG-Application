# Architecture

This document describes the target design. Parts are built step by step (see [DEVELOPMENT_ROADMAP.md](DEVELOPMENT_ROADMAP.md)); the roadmap shows what exists today.

## 1. System overview

```mermaid
flowchart LR
    U[User browser] --> FE[React app<br/>Vite + Tailwind]
    FE -- "Axios + JWT<br/>REST / JSON" --> API[FastAPI<br/>api/routes]
    API --> SVC[Service layer<br/>app/services]
    SVC --> DB[(SQLite<br/>users, documents,<br/>conversations, messages)]
    SVC --> FS[(File storage<br/>data/uploads)]
    SVC --> VDB[(ChromaDB<br/>chunk vectors)]
    SVC -- "embeddings + chat" --> GEM[Google Gemini API]
```

**Layers and their jobs**

| Layer | Folder | Responsibility |
|---|---|---|
| UI | `frontend/src/pages`, `components` | Show data, collect input. No API details. |
| API client | `frontend/src/services` | Axios calls, attach JWT, handle 401. |
| Routes | `backend/app/api/routes` | Parse request, call a service, return a schema. No business logic. |
| Dependencies | `backend/app/api/deps.py` | DB session per request, current user from JWT. |
| Schemas | `backend/app/schemas` | Pydantic validation of request and response bodies. |
| Services | `backend/app/services` | Business rules and the RAG pipeline. |
| Models | `backend/app/models` | SQLAlchemy table definitions. |
| Database | `backend/app/database` | Engine, session factory. |
| Core | `backend/app/core` | Settings, security (JWT, hashing), logging, error types. |

## 2. Document ingestion flow

```mermaid
sequenceDiagram
    participant FE as React
    participant API as /api/documents
    participant DS as document_service
    participant IS as ingestion_service
    participant VS as vector_store
    participant G as Gemini embeddings
    participant C as ChromaDB
    participant DB as SQLite

    FE->>API: POST file (multipart) + JWT
    API->>DS: validate type, extension, size
    DS->>DS: SHA-256 hash, check duplicate for this user
    DS->>DB: insert document (status=processing)
    DS->>IS: load → clean → split into chunks (keep page numbers)
    IS->>VS: chunks + metadata (user_id, document_id, filename, page)
    VS->>G: embed chunks
    VS->>C: store vectors
    DS->>DB: update status=ready, page_count, chunk_count
    API-->>FE: 201 document details
```

## 3. Question answering flow

```mermaid
sequenceDiagram
    participant FE as React
    participant API as /api/chat/ask
    participant CS as chat_service
    participant RS as retrieval_service
    participant C as ChromaDB
    participant G as Gemini

    FE->>API: question + conversation_id + JWT
    API->>CS: ask(user, question)
    CS->>G: rewrite follow-up into standalone question (uses recent history)
    CS->>RS: retrieve(standalone question, user_id, top_k)
    RS->>G: embed question
    RS->>C: similarity search, filter user_id
    C-->>RS: top-K chunks + metadata
    CS->>G: prompt = rules + context chunks + question
    G-->>CS: answer (or "not in your documents")
    CS->>CS: save user + assistant messages with sources
    API-->>FE: answer + sources (filename, page, snippet)
```

**Grounding rule.** The prompt tells Gemini to answer only from the given context and to reply with a fixed "I couldn't find this in your documents" message when the context is not enough. If retrieval returns no chunks at all, the service returns that message without calling Gemini.

## 4. Authentication flow

```mermaid
sequenceDiagram
    participant FE as React
    participant API as FastAPI
    participant DB as SQLite

    FE->>API: POST /api/auth/register {email, password}
    API->>DB: save user with bcrypt hash
    FE->>API: POST /api/auth/login {email, password}
    API->>DB: find user, bcrypt check
    API-->>FE: {access_token (JWT, expires), token_type}
    FE->>FE: store token, Axios adds "Authorization: Bearer <token>"
    FE->>API: any protected request
    API->>API: get_current_user decodes + verifies JWT
    API-->>FE: 401 if missing / invalid / expired
```

**Authorization** is ownership-based: every query adds `user_id == current_user.id`, so a user asking for another user's document gets 404 (not 403, so the app doesn't reveal that the ID exists).

## 5. Database design

```mermaid
erDiagram
    USERS ||--o{ DOCUMENTS : owns
    USERS ||--o{ CONVERSATIONS : owns
    CONVERSATIONS ||--o{ MESSAGES : contains

    USERS {
        int id PK
        string email UK
        string hashed_password
        datetime created_at
    }
    DOCUMENTS {
        int id PK
        int user_id FK
        string original_filename
        string stored_path
        string file_type
        int size_bytes
        string content_hash
        int page_count
        int chunk_count
        string status
        string error_message
        datetime created_at
    }
    CONVERSATIONS {
        int id PK
        int user_id FK
        string title
        datetime created_at
        datetime updated_at
    }
    MESSAGES {
        int id PK
        int conversation_id FK
        string role
        text content
        json sources
        datetime created_at
    }
```

- `documents` has a unique constraint on `(user_id, content_hash)`, so a user can't upload the same file twice (two different users can).
- `messages.sources` stores the citations as JSON, so old answers still show their sources.
- ChromaDB holds one collection of chunks; each chunk's metadata is `user_id`, `document_id`, `filename`, `page`, `chunk_index`. The Chroma chunk IDs are `{document_id}-{chunk_index}`, so deleting a document deletes its vectors by `document_id`.

**Why SQLite + ChromaDB:** SQLite needs no server and fits a single-instance portfolio app; SQLAlchemy makes moving to PostgreSQL a config change. ChromaDB runs embedded (no separate server), persists to disk, and supports metadata filters, which per-user isolation depends on.

## 6. API overview

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/health` | No | App and database status |
| POST | `/api/auth/register` | No | Create account |
| POST | `/api/auth/login` | No | Get JWT |
| GET | `/api/auth/me` | Yes | Current user |
| POST | `/api/documents` | Yes | Upload and process a document |
| GET | `/api/documents` | Yes | List my documents |
| GET | `/api/documents/{id}` | Yes | Document details |
| DELETE | `/api/documents/{id}` | Yes | Delete document, file and vectors |
| POST | `/api/chat/ask` | Yes | Ask a question, get answer + sources |
| GET | `/api/conversations` | Yes | List my conversations |
| GET | `/api/conversations/{id}/messages` | Yes | Conversation history |
| DELETE | `/api/conversations/{id}` | Yes | Delete a conversation |

Errors return `{"detail": "..."}` (for 422 validation errors, `detail` is a list of problems) with a suitable status: 400 bad input, 401 not logged in, 404 not found or not yours, 409 duplicate, 413 file too large, 422 validation error, 429 Gemini rate limit, 500 unexpected, 502 Gemini failed, 503 database down or Gemini key missing.

## 7. Deployment (planned, free tiers only)

```mermaid
flowchart LR
    GH[GitHub public repo] -- push --> CI[GitHub Actions<br/>pytest + vitest]
    GH -- auto deploy --> V[Render Static Site<br/>React static build]
    GH -- auto deploy --> R[Render free web service<br/>uvicorn FastAPI]
    R --- D[(Local disk, temporary<br/>SQLite, ChromaDB, uploads)]
    V -- HTTPS API calls --> R
    R --> G[Gemini API free tier]
```

Secrets (`GEMINI_API_KEY`, `JWT_SECRET_KEY`) are set in the Render dashboard, never in the repo. The frontend gets the API URL from `VITE_API_BASE_URL`.

**Free tier trade-offs:** Render free sleeps after about 15 minutes idle (slow first request, so the UI shows a "waking up" hint) and its disk is temporary, so data resets on restart or redeploy. Tokens carry the account's email as well as its ID, so a token from before a reset can't log into a new account that reuses the ID. Gemini's free tier has per-minute and per-day request limits, so embeddings are sent in batches and 429 errors become a friendly "try again shortly" message.

## 8. Known limitations of this design
- Processing runs inside the upload request, so very large files make the request slow (a background job queue is a later improvement).
- SQLite and embedded ChromaDB tie the backend to one server instance; scaling out needs PostgreSQL and a client/server vector database.
- No refresh tokens: when the JWT expires, the user logs in again.
- On the free hosting tier, stored data is lost on restart (no persistent disk). The fix is a free managed PostgreSQL plus a hosted vector store or a paid disk; both are out of scope for now.
