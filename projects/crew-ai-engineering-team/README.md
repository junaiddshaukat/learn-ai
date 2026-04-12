# AI Engineering Team

A full-stack application powered by **CrewAI** that simulates an AI engineering team with 5 specialized agents working in a hierarchical structure to build production-ready applications.

## Architecture

```
┌─────────────────────┐         SSE Stream         ┌──────────────────────┐
│   Next.js Frontend  │ ◄─────────────────────────► │   FastAPI Backend    │
│   (localhost:3000)   │          REST API           │   (localhost:8000)   │
└─────────────────────┘                             └──────────┬───────────┘
                                                               │
                                                    ┌──────────▼───────────┐
                                                    │    CrewAI Engine     │
                                                    │  (Hierarchical Mode) │
                                                    └──────────┬───────────┘
                                                               │
                                         ┌─────────────────────┼─────────────────────┐
                                         │                     │                     │
                                    ┌────▼────┐          ┌─────▼─────┐         ┌─────▼─────┐
                                    │   CTO   │          │ Frontend  │         │ Backend   │
                                    │(Manager)│          │    Dev    │         │    Dev    │
                                    └─────────┘          └───────────┘         └───────────┘
                                         │
                                    ┌────┴──────────┐
                               ┌────▼────┐    ┌─────▼─────┐
                               │   DB    │    │  Testing  │
                               │Architect│    │ Engineer  │
                               └─────────┘    └───────────┘
```

## The 5 Agents

| Agent | Role | Responsibility |
|-------|------|----------------|
| **CTO** (Manager) | Tech Lead & Architect | Breaks down requirements, delegates tasks, reviews all output |
| **Frontend Dev** | React/Next.js Specialist | UI components, layouts, state management, styling |
| **Backend Dev** | API Engineer | REST endpoints, auth, server logic, data models |
| **DB Architect** | Schema Designer | Database design, migrations, indexing, relationships |
| **Testing Engineer** | QA Specialist | Test plans, unit/integration/E2E tests |

## Tech Stack

### Backend
- **Python 3.13** with virtual env via `uv`
- **CrewAI 1.14+** - Multi-agent orchestration framework
- **FastAPI** - Async web framework with auto-generated docs
- **SSE (Server-Sent Events)** - Real-time streaming to frontend
- **LiteLLM** (built into CrewAI) - Multi-provider LLM support

### Frontend
- **Next.js 16.2** - React framework with App Router
- **React 19** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS 4** - Utility-first styling
- **shadcn/ui** - Beautiful, accessible component library
- **Lucide React** - Icon library

## Quick Start

### 1. Backend Setup

```bash
cd backend

# Create virtual environment (uses Python 3.13)
uv venv --python 3.13
source .venv/bin/activate

# Install dependencies
uv pip install -e .

# Configure API keys
cp .env.example .env
# Edit .env and add at least one LLM provider key

# Start the backend
PYTHONPATH=src uvicorn engineering_team.api:app --reload --port 8000
```

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start the dev server
npm run dev
```

### 3. Open the App

- **Frontend**: http://localhost:3000
- **Backend API Docs**: http://localhost:8000/docs
- **Backend Health Check**: http://localhost:8000/api/health

## Supported LLM Models

CrewAI uses LiteLLM under the hood, supporting 100+ providers:

| Provider | Model String | Notes |
|----------|-------------|-------|
| OpenAI | `gpt-4o`, `gpt-4o-mini` | Needs `OPENAI_API_KEY` |
| Anthropic | `anthropic/claude-sonnet-4-20250514` | Needs `ANTHROPIC_API_KEY` |
| Google | `gemini/gemini-2.5-pro`, `gemini/gemini-2.0-flash` | Needs `GEMINI_API_KEY` |
| Groq | `groq/llama-3.3-70b-versatile` | Needs `GROQ_API_KEY` |

## Project Structure

```
crew-ai-engineering-team/
├── backend/
│   ├── src/engineering_team/
│   │   ├── api.py              # FastAPI app + SSE endpoints
│   │   ├── crew.py             # CrewAI crew definition (5 agents)
│   │   ├── models.py           # Pydantic request/response schemas
│   │   ├── main.py             # CLI entry point for testing
│   │   └── config/
│   │       ├── agents.yaml     # Agent roles, goals, backstories
│   │       └── tasks.yaml      # Task definitions with context chains
│   ├── .env                    # API keys (git-ignored)
│   └── pyproject.toml          # Python project config
├── frontend/
│   ├── src/
│   │   ├── app/                # Next.js pages (App Router)
│   │   ├── components/         # React components
│   │   └── lib/                # API client, types, utils
│   └── package.json
└── README.md
```

## Two Modes of Operation

1. **Plan Only** - Agents produce architecture docs, API specs, component trees, and schema designs (markdown output)
2. **Plan + Code** - Full specs first, then actual generated code files
