# Project overview
RAG AI Knowledge Assistant: a web app where users create an account, upload PDF, DOCX and TXT documents, and ask questions about them. The backend extracts and chunks the text, stores Gemini embeddings in ChromaDB, retrieves the most relevant chunks for each question, and asks Google Gemini to answer using only that context, with source document names and page numbers. If the documents don't contain the answer, the assistant says so instead of guessing. This is a portfolio project. See [docs/PRD.md](docs/PRD.md) for requirements, [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for design, [docs/UI_UX_DESIGN.md](docs/UI_UX_DESIGN.md) for screens, states and Tailwind tokens (frontend must follow it), and [docs/DEVELOPMENT_ROADMAP.md](docs/DEVELOPMENT_ROADMAP.md) for the build order.

# Tech stack
- Frontend: React + Vite + Tailwind CSS + Axios + React Router (in `frontend/`)
- Backend: Python 3.12 + FastAPI + Pydantic + SQLAlchemy (in `backend/`)
- AI / RAG: LangChain + Google Gemini API (chat + embeddings) + ChromaDB
- Database: SQLite (users, documents, conversations, messages) + ChromaDB (vectors)
- Auth: JWT access tokens (PyJWT) + bcrypt password hashing
- Architecture: React → Axios → FastAPI routes (`app/api/`) → services (`app/services/`) → database / RAG engine. Keep these layers separate.

# Folder structure
```
backend/
  app/
    main.py          # create_app(): middleware, error handlers, routers, startup
    api/routes/      # one file per resource (health, auth, documents, chat); thin, no business logic
    api/deps.py      # shared dependencies: get_db, get_current_user
    core/            # config.py (settings), security.py (JWT, hashing), logging.py, exceptions.py
    database/        # base.py (SQLAlchemy Base), session.py (engine, SessionLocal, get_db)
    models/          # SQLAlchemy tables: User, Document, Conversation, Message
    schemas/         # Pydantic request/response models
    services/        # business logic and the RAG engine (ingestion, vector_store, retrieval, chat)
  data/uploads/      # uploaded files, one folder per user (git-ignored)
  data/chroma_db/    # ChromaDB files (git-ignored)
  evaluation/        # Phase 2: Recall@K / MRR scripts
  tests/             # pytest tests
frontend/src/
  components/  pages/  services/ (Axios API calls)  hooks/  context/ (AuthContext)  App.jsx
docs/                # PRD.md, ARCHITECTURE.md, UI_UX_DESIGN.md, DEVELOPMENT_ROADMAP.md
```

# Commands
Windows / PowerShell. Always use `py -3.12` (the `py` launcher defaults to 3.14 on this machine). Run backend and frontend in separate terminals.
- Backend setup (first time): `cd backend; py -3.12 -m venv .venv; .venv\Scripts\Activate.ps1; pip install -r requirements.txt`
- Backend env: copy `backend/.env.example` to `backend/.env` and fill in the values yourself
- Run backend dev server: `cd backend; .venv\Scripts\Activate.ps1; uvicorn app.main:app --reload` (API at http://localhost:8000, Swagger docs at http://localhost:8000/docs)
- Run backend tests: `cd backend; .venv\Scripts\Activate.ps1; pytest`
- API tests: import `docs/postman/RAG_Knowledge_Assistant.postman_collection.json` into Postman and run the collection (backend running, Postman working directory = project folder). Keep it in sync when endpoints change
- Frontend: `cd frontend; npm install`, then `npm run dev` (app at http://localhost:5173), `npm test`, `npm run build`

# Workflow
- Build in the order of [docs/DEVELOPMENT_ROADMAP.md](docs/DEVELOPMENT_ROADMAP.md), one step at a time. Tick the step's checkbox when it's done and tested.
- Each step ends with: tests passing, and run instructions for me. Then stop and wait for me before the next step.
- Phase 2 (advanced RAG) starts only after the MVP works end to end.

# Approved libraries
Adding these doesn't need a new question, but add each one to `requirements.txt` / `package.json` only in the step that needs it.
- Backend: fastapi, uvicorn[standard], pydantic-settings, sqlalchemy, pytest, httpx, PyJWT, bcrypt, email-validator, python-multipart, langchain-core, langchain-text-splitters, langchain-google-genai, langchain-chroma, chromadb, pypdf, docx2txt, rank-bm25
- Not used: `langchain` and `langchain-community` (pip couldn't resolve langchain-community's dependencies alongside the rest; pypdf and docx2txt are called directly instead)
- Frontend: react, react-dom, react-router-dom, axios, tailwindcss, @tailwindcss/vite, vite, @vitejs/plugin-react, vitest, @testing-library/react, @testing-library/dom, @testing-library/jest-dom, jsdom
- Anything else (e.g. Alembic, react-markdown, reranker models): ask first.

# Code style
- Keep functions small, name things clearly
- Add comments only where the "why" is not obvious
- Python: type hints on functions, Pydantic schemas for request/response bodies, business logic in services (not in routes)
- Raise `AppError` subclasses from `app/core/exceptions.py` for expected errors so every error returns `{"detail": ...}`
- React: functional components and hooks, API calls only in `src/services/`
- Config (chunk size, overlap, top-K, model names, file size limit, JWT expiry) comes from `app/core/config.py` settings, not hardcoded values
- Tests must not call the real Gemini API: mock it

# Free tier only
- Every tool, library, API and hosting service must be free. No paid plans, nothing that needs a credit card.
- Gemini is used on its free tier: batch embedding calls, turn HTTP 429 rate-limit errors into a clear JSON error (not a 500), and keep model names in config.
- Hosting: Render free Static Site (frontend) and free Web Service (backend); see docs/DEPLOYMENT.md. Render free has no persistent disk, so don't design features that assume data survives a restart in production.
- Before suggesting any new service, say which free tier it uses.

# Security rules
- Every query for documents, chunks (Chroma metadata filter) and conversations must filter by the current user's ID.
- Store uploaded files under generated names, never the user-supplied file name.
- Never log passwords, tokens or API keys.

# Rules for Claude
- I am a beginner. Before writing code, explain your approach in 3-4 lines.
- Make small changes: one feature at a time.
- Do not add new libraries without asking me first.
- Never read, edit or print the .env file. Never hardcode secrets.
- After each change, tell me how to run it and what to expect.
