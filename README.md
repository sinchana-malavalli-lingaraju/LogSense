# LogSense — GenAI Debugging Assistant

An on-premises AI-powered debugging assistant that uses **RAG (Retrieval-Augmented Generation)** and **vector embeddings** to enable semantic search across 10,000+ test logs, supporting faster root-cause analysis via an interactive chatbot.

Built with Python, React, Ollama, MongoDB, and FAISS — everything runs locally, no cloud required.

---

## Features

- **Log Ingestion** — Upload `.txt` / `.log` files via drag-and-drop; lines are parsed, embedded, and indexed automatically
- **Semantic Search** — Find log entries by meaning, not just keywords (powered by vector embeddings)
- **AI Chat** — Ask natural language questions about your logs; the assistant retrieves relevant context and explains root causes
- **Analytics Dashboard** — Visualize severity distribution, top services, most frequent errors, and component breakdown
- **Filters** — Filter search and chat by log file, service, and severity level
- **Fully On-Prem** — No data leaves your machine; all AI runs via Ollama locally

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, Recharts |
| Backend | Python, FastAPI, Motor (async MongoDB) |
| Vector Search | FAISS (in-memory, cosine similarity) |
| Embeddings | `nomic-embed-text` via Ollama |
| LLM / Chat | `llama3.2` via Ollama |
| Database | MongoDB 7 |
| Infrastructure | Docker Compose |

---

## Log Format Supported

Standard syslog-style ILO/BMC logs:

```
Mar 23 07:10:08 ILO123456789 svcsHost[449]: hostService_VC : DPLL module not installed.
```

Fields parsed: `timestamp · hostname · service · PID · component · message`

Severity is inferred automatically from message keywords (`ERROR`, `WARNING`, `INFO`).

---

## Architecture

```
┌─────────────┐     HTTP/REST      ┌──────────────────────────────┐
│   React UI  │ ◄────────────────► │     FastAPI Backend          │
│  Port 3000  │                    │     Port 8000                │
└─────────────┘                    │                              │
                                   │  ┌─────────┐  ┌──────────┐   │
                                   │  │  FAISS  │  │ MongoDB  │   │
                                   │  │ (memory)│  │  (disk)  │   │
                                   │  └─────────┘  └──────────┘   │
                                   │         │           │        │
                                   │         └─── sync ──┘        │
                                   └──────────────────────────────┘
                                                  │
                                           Ollama (host)
                                    nomic-embed-text + llama3.2
```

**RAG Flow:**
1. User uploads log file → lines parsed and embedded via `nomic-embed-text`
2. Embeddings stored in MongoDB + added to FAISS index
3. User asks a question → question embedded → FAISS retrieves top-K similar log lines
4. Retrieved lines passed as context to `llama3.2` → AI generates answer with citations

**Performance optimization:** Repeated log lines (very common in firmware logs) share the same embedding via an in-process deduplication cache. 10,000+ lines typically resolve to ~400 unique embeddings, completing ingestion in ~1 minute.

---

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) — for running MongoDB, backend, and frontend
- [Ollama](https://ollama.com) — for running LLM and embedding models locally

### Pull required Ollama models

```bash
ollama pull nomic-embed-text
ollama pull llama3.2
```

---

## Getting Started

### Option A — Docker Compose (recommended)

```bash
# 1. Clone the repo
git clone https://github.com/sinchana-malavalli-lingaraju/LogSense.git
cd LogSense

# 2. Copy environment config
cp .env.example .env

# 3. Start everything
docker compose up --build
```

Open **http://localhost:3000**

### Option B — Run locally without Docker

**Terminal 1 — Backend:**
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**

> Make sure MongoDB is running locally on port 27017 and Ollama is running (`ollama serve`).

---

## Environment Variables

Copy `.env.example` to `.env` and adjust if needed:

```env
MONGODB_URL=mongodb://mongodb:27017
MONGODB_DB=logsense
OLLAMA_URL=http://host.docker.internal:11434
OLLAMA_EMBED_MODEL=nomic-embed-text
OLLAMA_CHAT_MODEL=llama3.2
```

> `.env` is git-ignored — never commit it.

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/logs/upload` | Upload and ingest a log file |
| `GET` | `/api/logs/sessions` | List past ingestion sessions |
| `GET` | `/api/logs/sessions/{id}/status` | Poll ingestion progress |
| `GET` | `/api/logs` | Paginated log listing with filters |
| `POST` | `/api/search` | Semantic vector search |
| `POST` | `/api/chat` | RAG-powered AI chat |
| `GET` | `/api/analytics` | Aggregated stats and error patterns |

---

## Project Structure

```
LogSense/
├── docker-compose.yml
├── .env.example
├── .gitignore
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── main.py              # FastAPI app entry point
│   ├── config.py            # Environment settings
│   ├── database.py          # MongoDB async client
│   ├── log_parser.py        # Syslog regex parser + severity inference
│   ├── embeddings.py        # Ollama embeddings with dedup cache
│   ├── vector_index.py      # FAISS in-memory cosine index
│   ├── rag.py               # RAG prompt + Ollama chat
│   └── routers/
│       ├── logs.py          # Upload + ingestion
│       ├── search.py        # Semantic search
│       ├── chat.py          # AI chat
│       └── analytics.py     # Aggregation queries
└── frontend/
    ├── Dockerfile
    ├── nginx.conf
    ├── src/
    │   ├── App.jsx
    │   ├── api/client.js    # Axios API calls
    │   ├── components/
    │   │   └── Sidebar.jsx
    │   └── pages/
    │       ├── Upload.jsx   # Drag-drop ingestion + progress
    │       ├── Chat.jsx     # RAG chatbot with source citations
    │       ├── Search.jsx   # Semantic search with filters
    │       └── Analytics.jsx # Charts and error tables
```

---

## Example Questions to Ask the AI

- *"What errors are occurring most frequently?"*
- *"Why is the semaphore failing in evtsrv?"*
- *"What does HPM FRU invalid board info area mean?"*
- *"Summarize the root causes of failures in this log"*
- *"Which service is generating the most errors?"*

---

## License

MIT
