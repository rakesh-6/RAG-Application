# Project: RAG AI Knowledge Assistant

## Problem
People who work with many documents (notes, reports, manuals, policies) waste time searching through them for specific answers, and general-purpose chatbots either don't know the content or confidently make things up. This app lets a user upload their own documents and get answers grounded only in those documents, with citations to the exact source and page.

## Users
- **Primary:** Individual users (students, developers, professionals) who want to ask questions about their own PDF, DOCX and TXT files. Each user has their own account and private document library.
- **Secondary:** Interviewers and reviewers evaluating this project as a portfolio piece; they should be able to run it, try it, and follow how the RAG pipeline works.

## MVP features (max 5, the smallest version that works)
1. **User accounts**
   - Register and log in with email and password (password stored as a bcrypt hash).
   - Login returns a JWT access token; the frontend sends it on every API request.
   - Every document, chunk and conversation belongs to one user; users can never see each other's data.
2. **Document upload and management**
   - Upload PDF, DOCX and TXT files; reject other types and files over the size limit (default 10 MB, set in config).
   - Detect duplicate uploads (same file content for the same user) using a SHA-256 hash and reject them with a clear message.
   - List uploaded documents with details: name, type, size, page count, chunk count, upload date, processing status.
   - Delete a document, which also removes its stored file and all its vectors from ChromaDB.
3. **Document processing pipeline**
   - Extract text with LangChain document loaders (PDF, DOCX, TXT).
   - Clean extracted text (extra whitespace, broken lines, empty pages).
   - Split into chunks with a recursive text splitter; chunk size and overlap come from config.
   - Keep metadata on every chunk: user ID, document ID, file name, page number (where available), chunk index.
   - Generate embeddings with the Gemini embedding model and store them in ChromaDB.
   - Track processing status (`uploaded` → `processing` → `ready` / `failed`) and save the error message on failure.
4. **Grounded question answering with citations**
   - Embed the user's question and retrieve the top-K most relevant chunks across all of that user's documents (multi-document retrieval).
   - Build a prompt from the retrieved context and send it to Google Gemini to generate the answer.
   - Every answer lists its sources: document name, page number and the cited text snippet.
   - If the retrieved context doesn't contain enough information, the assistant clearly says it cannot answer from the uploaded documents instead of guessing.
5. **Conversation history and follow-up questions**
   - Conversations and messages (including their sources) are saved in SQLite.
   - Users can start a new conversation, reopen an old one, and delete one.
   - Follow-up questions use recent chat history: the question is rewritten into a standalone query before retrieval (e.g. "what about its price?" → "what is the price of product X?").

## Phase 2: Advanced RAG (planned scope, built after the MVP works end to end)
- **Streaming responses:** the answer appears word by word (Server-Sent Events).
- **Document selection:** the user chooses which documents to search (multi-document filter).
- **Configurable chunk size and overlap** from the UI, with re-indexing of existing documents.
- **Hybrid search:** combine BM25 keyword search with vector search.
- **Retrieval reranking:** reorder retrieved chunks by relevance before answering.
- **Context compression:** keep only the relevant parts of each chunk before sending to Gemini.
- **Retrieval evaluation:** Recall@K and MRR on a small labelled question set.
- **Grounded answer evaluation:** check that answers stay faithful to the cited context.

## Later / nice-to-have
- Move from SQLite to PostgreSQL (e.g. a free-tier managed Postgres), so data survives restarts in production; database migrations with Alembic.
- Background job queue for processing large documents.
- OCR for scanned PDFs.
- Refresh tokens and password reset.

## Non-functional requirements
- **Security:** bcrypt password hashing; JWT tokens with an expiry time; every database and vector query filtered by the current user; file type, extension and size validation; uploaded files stored under generated names (never the user's file name); secrets only in `.env` (never committed); CORS limited to the frontend URL.
- **Error handling:** every API error returns consistent JSON (`{"detail": "..."}`) with the correct HTTP status code; unexpected errors are logged and return a generic message.
- **Validation:** all request and response bodies use Pydantic schemas.
- **Logging:** one log format for the backend; key events logged (uploads, processing results, errors).
- **Architecture:** routes → services → database / RAG engine; routes contain no business logic.
- **Testing:** pytest tests for every API (Gemini calls mocked); Vitest tests for key frontend components.
- **API documentation:** FastAPI Swagger UI at `/docs` plus a Postman collection.
- **Responsive UI:** usable on desktop and mobile widths.

## Tech stack (everything free)
- **Frontend:** React.js, Vite, Tailwind CSS, Axios, React Router (all open source)
- **Backend:** Python 3.12, FastAPI, Pydantic, SQLAlchemy (all open source)
- **AI / RAG:** LangChain, ChromaDB (open source); Google Gemini API **free tier** via a Google AI Studio key (chat model + Gemini embedding model); document loaders, text splitters, semantic search, Retrieval-Augmented Generation
- **Database:** SQLite (users, documents, conversations, messages) and ChromaDB (vector storage), both running locally inside the backend with no paid server
- **Tools:** VS Code, Git, GitHub (free public repo + GitHub Actions), Postman (free plan), Python virtual environment
- **Hosting:** Render, free plan: a Static Site (frontend) and a Web Service (backend)

## Cost constraint: free tier only
- No paid service, paid plan or credit card. Any new tool must have a free tier that covers this project.
- **Gemini free tier limits:** requests per minute and per day are capped. The app sends chunk embeddings in batches, and when Gemini returns a rate-limit error (HTTP 429) it shows a clear "AI service is busy, try again shortly" message instead of crashing. Model names are set in config, so they can be switched if a free-tier model changes.
- **Gemini free tier data use:** Google may use free-tier prompts to improve its products, so only upload documents that are safe to share (no private or confidential files). The README says this.
- **Render free tier:** the server sleeps after about 15 minutes idle (the first request then takes up to a minute) and has no persistent disk, so uploaded files, SQLite and ChromaDB data reset on every restart or redeploy. That is acceptable for a portfolio demo; the README explains the limitation, and login tokens are tied to the account's email so a token from before a reset can't open a new account with the same ID.
- Check current free-tier limits on the providers' pricing pages before deploying; they change over time.

## Out of scope (what I will NOT build now)
- Other file types (PPTX, XLSX, images, web pages).
- Team workspaces, sharing documents between users, admin roles.
- LLM providers other than Gemini, or running local models.
- Fine-tuning or training any model.
- Mobile app, payments, real-time collaboration.

## Done when
- A user can register, log in, upload a PDF, DOCX or TXT file, ask a question about it, and get a Gemini-generated answer with document name and page citations, end to end through the React UI.
- Asking about something not in the documents returns a clear "not found in your documents" response, not a made-up answer.
- Follow-up questions work within a conversation, and past conversations are saved and can be reopened.
- One user cannot see or query another user's documents or conversations.
- Deleting a document removes it from the list, from disk and from ChromaDB, and it no longer shows up in answers.
- Invalid file types, oversized files and duplicates are rejected with clear error messages.
- Backend and frontend tests pass, and the API is documented (Swagger `/docs` + Postman collection).
- It is deployed on free tiers only (frontend and backend on Render) and has a README covering setup, `.env` variables, architecture, free-tier limitations and screenshots.
- Phase 2 features are added one at a time after this, each with its own test or evaluation result.
