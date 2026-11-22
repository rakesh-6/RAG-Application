# UI / UX Design

Visual mockups (all screens, clickable in Play mode): https://claude.ai/artifact/6eq25v21Q9XT5NfFKVTw3x

This document is the spec that Steps 7–9 (frontend) follow. If the mockup and this document disagree, this document wins.

## 1. Design principles

1. **Answers you can check.** Every answer shows its sources (file, page, quoted snippet). Citation numbers in the text link to the source cards.
2. **Honest when it doesn't know.** "Not in your documents" is a normal, calm answer (amber), never an error (red).
3. **Always show what's happening.** Every action has a visible state: uploading, processing, searching, failed, done.
4. **Prevent mistakes before they reach the server.** Check file type and size in the browser first; ask before deleting.
5. **Accessible by default.** Real buttons, links and labels; 44 px touch targets; text contrast ≥ 4.5:1; status never shown by color alone.

## 2. User journeys

| Journey | Path |
|---|---|
| First visit | Register → Chat (first-run empty state) → "Upload documents" → Documents → upload → "Ask a question" → Chat |
| Daily use | Log in → Chat (last conversation) → ask → read answer → check sources → follow-up |
| Manage library | Documents → see status → delete a failed or old file (confirm dialog) |
| Session expired | Any request returns 401 → redirect to Log in with "Your session expired" banner → after login, return to the page they were on |

## 3. Routes (React Router)

| Route | Screen | Access |
|---|---|---|
| `/login` | Log in | Public (redirects to `/chat` if already logged in) |
| `/register` | Create account | Public (same redirect) |
| `/chat` | Chat: new conversation, or first-run state when there are no ready documents | Protected |
| `/chat/:conversationId` | Chat: an existing conversation | Protected |
| `/documents` | Documents library | Protected |
| `*` | Redirect to `/chat` (logged in) or `/login` | — |

Protected routes use a `ProtectedRoute` component that redirects to `/login` and remembers the original location.

## 4. Screens

### 4.1 Log in and Create account
- **Layout:** two halves. Left: brand panel (indigo-50) with the value statement and 3 steps; right: the form, max 400 px wide. Below 960 px the halves stack (form first on phones).
- **Fields:** email, password (with Show/Hide button). Register adds confirm password and a live checklist: 8+ characters, a letter, a number (matches the backend rules).
- **Submit:** disabled while sending; button text changes to "Logging in…" with a spinner.
- **Errors:** field errors under the field (browser-side checks); server errors (`401 Incorrect email or password`, `409 email taken`) in a red banner above the button, using the API's `detail` text.
- **Register note:** free-tier notice "Don't upload private or confidential documents."
- **API:** `POST /api/auth/register` then automatically `POST /api/auth/login`; `POST /api/auth/login`.

### 4.2 Documents
- **Header:** title, summary "N documents · M chunks ready to search", primary button "Ask a question" (goes to Chat).
- **Upload zone:** drag-and-drop area plus a "browse" link (a real `<input type="file" multiple accept=".pdf,.docx,.txt">`). Helper text: "PDF, DOCX or TXT · up to 10 MB each · scanned PDFs are not supported".
- **Browser checks before upload:** extension and size. Rejected files show a red toast with the exact reason, and nothing is sent.
- **Upload progress:** one row per file with a progress bar (Axios `onUploadProgress`), then the row's status turns to Processing until the API responds.
- **Duplicate (409):** red banner "X is already in your library". Dismissible.
- **Table columns:** Name · Type · Size · Pages · Chunks · Uploaded · Status · Delete. "—" when a value doesn't exist (DOCX/TXT have no pages). Failed rows show the `error_message` under the name. The table scrolls sideways on small screens.
- **Status badges:** Queued (`uploaded`), Processing, Ready, Failed; each has an icon and a word.
- **Delete:** trash icon button (aria-label names the file) → confirm dialog naming the file and its chunk count → `DELETE /api/documents/{id}` → row removed + success toast. Delete is disabled while a document is processing.
- **States:** loading = 3 skeleton rows; empty = upload zone plus "No documents yet" text; error loading list = banner with "Try again".
- **API:** `GET /api/documents`, `POST /api/documents` (multipart), `DELETE /api/documents/{id}`.

### 4.3 Chat
- **Layout:** left sidebar (conversations) + main column (max 860 px wide messages). Below 768 px the sidebar becomes a drawer opened by a menu button, and the top nav becomes a bottom tab bar (see the phone mockup).
- **Sidebar:** "New chat" button; "Recent" list (title + relative date), active item highlighted with its delete button; empty text "Your conversations will appear here."
- **Header:** conversation title + chip "Searching N ready documents".
- **Messages:** user = indigo bubble on the right. Assistant = left, with the logo avatar, answer text, then **Sources** cards (number, file name, "Page 14" or "No page numbers", quoted snippet). Citation numbers in the text are links that jump to their card. A "Copy" button under each answer.
- **Follow-ups:** when the backend rewrote the question, show "Searched for: “<standalone question>”" above the answer, so users see how their follow-up was understood.
- **Not found:** amber box "I couldn't find this in your documents." plus a hint to rephrase or upload a document.
- **Waiting:** three-dot "Searching your documents…" status; send button disabled; the question stays visible.
- **Errors:** red inline box under the question with "Try again" (resends the same question). Gemini rate limit (429) shows "The AI service is busy right now. Try again in a minute."
- **Input:** auto-growing textarea, Enter sends, Shift+Enter adds a new line, empty input can't be sent. Auto-scroll to the newest message.
- **First run (no ready documents):** centered empty state "Upload a document to get started" with the "Upload documents" button; the input is disabled with the placeholder "Upload a document first to ask questions".
- **API:** `GET /api/conversations`, `GET /api/conversations/{id}/messages`, `DELETE /api/conversations/{id}`, `POST /api/chat/ask`.

## 5. What the backend must return for this UI
These are requirements for Steps 3–6:
- Document: `id, original_filename, file_type, size_bytes, page_count (nullable), chunk_count, status, error_message (nullable), created_at` (UTC with timezone).
- Ask response: `answer, found (bool), standalone_question, sources[]` where each source is `{document_id, filename, page (nullable), snippet}`, plus `conversation_id` and the saved message ids.
- Errors: `{"detail": "<human-readable message>"}` (422 validation errors: `detail` is a list, and the UI shows the first item); the UI shows `detail` as-is for 400/401/404/409/413/429/502/503, and a generic message for 500.

## 6. Design tokens (Tailwind classes)

| Token | Value | Tailwind |
|---|---|---|
| Primary | #4F46E5 | `bg-indigo-600` (hover `bg-indigo-700`) |
| Link / active text | #4338CA | `text-indigo-700` |
| Tint | #EEF2FF | `bg-indigo-50` |
| Ink | #0F172A | `text-slate-900` |
| Muted text | #475569 / #64748B | `text-slate-600` / `text-slate-500` |
| Border | #E2E8F0 | `border-slate-200` (inputs `border-slate-300`) |
| Page ground | #F8FAFC | `bg-slate-50` |
| Success | #15803D on #F0FDF4 | `text-green-700 bg-green-50` |
| Warning | #B45309 on #FFFBEB | `text-amber-700 bg-amber-50` |
| Danger | #B91C1C on #FEF2F2; button #DC2626 | `text-red-700 bg-red-50`; `bg-red-600` |
| Radius | 10 px controls, 12–16 px cards | `rounded-[10px]`, `rounded-xl`, `rounded-2xl` |
| Control height | 44 px | `h-11` |

**Fonts:** headings Space Grotesk 600 (40 / 28 / 20 px); body and UI Inter (15 body, 14 labels, 13 meta, 12 captions; never smaller). Both are free Google Fonts.

**Icons:** simple 2 px stroke line icons, inline SVG (no icon library needed).

## 7. React component map (Steps 7–9)

| Component | Used on |
|---|---|
| `AppLayout` (top nav / bottom tab bar) | All protected pages |
| `ProtectedRoute` | Router |
| `AuthLayout` (brand panel + form slot) | Log in, Register |
| `TextField` (label, input, error) · `Button` (variants: primary, secondary, danger, ghost; `loading` prop) | Everywhere |
| `Alert` (success, error, warning, info) · `Toast` | Everywhere |
| `UploadDropzone` · `UploadProgressList` · `DocumentTable` · `StatusBadge` · `ConfirmDialog` | Documents |
| `ConversationSidebar` · `MessageList` · `UserMessage` · `AssistantMessage` · `SourceCard` · `NotFoundAnswer` · `ThinkingIndicator` · `ChatInput` · `ChatEmptyState` | Chat |

## 8. Accessibility checklist
- Every input has a `<label>`; errors are linked with `aria-describedby` and marked `aria-invalid`.
- Icon-only buttons have an `aria-label` that names the target ("Delete Leave_Policy.docx").
- Banners use `role="alert"` (errors) or `role="status"` (progress, success); the thinking indicator is `role="status"`.
- The confirm dialog traps focus, starts on Cancel, closes on Esc, and returns focus to the trash button.
- Current nav item has `aria-current="page"`.
- Visible focus ring on everything (`focus-visible:ring-2 ring-indigo-600`).
- All text meets 4.5:1 contrast (slate-500 is the lightest allowed text color on white).

## 9. Error message map

| Situation | Message shown |
|---|---|
| Wrong email/password (401) | Incorrect email or password. |
| Email taken (409) | An account with this email already exists. |
| Token expired (401 on any request) | Your session expired. Please log in again. |
| Wrong file type (browser or 400) | Slides.pptx can't be uploaded. Use PDF, DOCX or TXT. |
| File too large (browser or 413) | Annual_Report.pdf is 14.2 MB. The limit is 10 MB. |
| Duplicate (409) | Employee_Handbook_2026.pdf is already in your library. |
| Processing failed | The document's `error_message`, e.g. "No readable text found. Scanned PDFs aren't supported yet." |
| Gemini rate limit (429) | The AI service is busy right now. Try again in a minute. |
| Server error (500) / network down | Something went wrong. Please try again. / Can't reach the server. Check your connection. |
