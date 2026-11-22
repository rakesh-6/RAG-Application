# Development Roadmap

Build one step at a time. Each step ends with passing tests and a manual check. Tick the box when it's done.

## MVP

- [x] **Step 0: Docs and repo setup.** PRD, CLAUDE.md, architecture, roadmap, README, `.gitignore`, `git init`.
- [x] **Step 1: Backend skeleton.** Settings from `.env`, logging, SQLite connection, consistent error handling, CORS, `GET /api/health`, first pytest test.
- [x] **Step 2: Authentication.** `users` table, `POST /api/auth/register`, `POST /api/auth/login` (returns JWT), `GET /api/auth/me`, `get_current_user` dependency, bcrypt hashing. Tests: register, duplicate email, wrong password, protected route without a token.
- [x] **Step 3: Document upload and management.** `documents` table, `POST /api/documents` (type, extension and size validation, SHA-256 duplicate check, saved under `data/uploads/{user_id}/` with a generated name), `GET /api/documents`, `GET /api/documents/{id}`, `DELETE /api/documents/{id}`. Tests: each validation error, duplicates, user isolation.
- [x] **Step 4: Processing pipeline.** Text extraction (pypdf, docx2txt, UTF-8 text) → cleaning → `RecursiveCharacterTextSplitter` (size/overlap from config) → Gemini embeddings → ChromaDB with metadata (`user_id`, `document_id`, `filename`, `page`, `chunk_index`). Status `processing` → `ready`/`failed`. Delete also removes vectors. Tests with mocked embeddings.
- [x] **Step 5: Retrieval and grounded answers.** `POST /api/chat/ask`: top-K retrieval filtered by user, context building, grounded prompt, Gemini answer, "not in your documents" handling (`found: false`), citations (filename, page, snippet). Tests with a mocked LLM.
- [x] **Step 6: Conversations and follow-ups.** `conversations` and `messages` tables, `GET /api/conversations`, `DELETE /api/conversations/{id}` (a conversation is created by its first question), `GET /api/conversations/{id}/messages`, standalone-question rewriting from recent history.
- [x] **UI/UX design.** All screens, states and the design system in [UI_UX_DESIGN.md](UI_UX_DESIGN.md) and the [visual mockups](https://claude.ai/artifact/6eq25v21Q9XT5NfFKVTw3x). Steps 3–6 must return the fields listed in its section 5; Steps 7–9 build the screens it describes.
- [x] **Step 7: Frontend setup and auth.** Vite + React + Tailwind + React Router, Axios client with JWT interceptor and 401 handling, `AuthContext`, Login and Register pages, protected routes, app layout.
- [x] **Step 8: Documents page.** Upload (drag-and-drop + button, progress), document list with status and details, delete with confirmation, error messages.
- [x] **Step 9: Chat page.** Conversation sidebar, message list, input box, citations under each answer, loading and error states, responsive layout.
- [ ] **Step 10: Testing and API docs.** Done: 68 pytest tests (every API, Gemini mocked), 40 Vitest tests (pages, API client, route protection), Postman collection with 21 self-checking requests ([docs/postman](postman/)), documented error responses in Swagger, portfolio README. **Remaining (yours): take the 4 screenshots listed in [docs/screenshots/README.md](screenshots/README.md).**
- [ ] **Step 11: Deployment (free tiers only).** Done in code: login attempt limiting (5 failures per IP + email per 15 minutes), tokens bound to the account's email (safe after a data reset), proxy-aware client IPs, CORS that ignores a trailing slash, a "server is waking up" hint, GitHub Actions CI, and the step-by-step guide [DEPLOYMENT.md](DEPLOYMENT.md). **Remaining (yours): push to GitHub and create the two Render services (backend Web Service + frontend Static Site) by following the guide.** Optional later: a demo account with sample documents, recreated after each restart.

## Phase 2: Advanced RAG (after the MVP works end to end)

- [ ] **Step 12: Streaming answers** with Server-Sent Events.
- [ ] **Step 13: Document selection:** search only the documents the user picks.
- [ ] **Step 14: Configurable chunk size and overlap** from the UI, with re-indexing.
- [ ] **Step 15: Hybrid search:** BM25 (`rank-bm25`) + vector search, merged with Reciprocal Rank Fusion.
- [ ] **Step 16: Reranking:** reorder retrieved chunks with Gemini before answering.
- [ ] **Step 17: Context compression:** keep only the relevant sentences of each chunk.
- [ ] **Step 18: Retrieval evaluation:** labelled question set, Recall@K and MRR script in `backend/evaluation/`, comparing vector vs hybrid vs reranked.
- [ ] **Step 19: Grounded answer evaluation:** Gemini-as-judge faithfulness check on answers vs their cited context.
