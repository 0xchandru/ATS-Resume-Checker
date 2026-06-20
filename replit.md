# ATS Resume Checker

A full-stack ATS resume analyzer that scores resumes against job descriptions using 5-layer AI keyword matching (ESCO + O*NET), with a premium dark-themed web app and mobile companion.

## Run & Operate

- `pnpm --filter @workspace/open-resume run dev` — run the web frontend (port 18897)
- `pnpm --filter @workspace/api-server run dev` — run the Express API server (port 8080)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- Python backend: `cd backend && uvicorn main:app --reload` (handles /api/upload, /api/analyze, etc.)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind CSS v4, shadcn/ui components
- API: Express 5 (healthz + proxy layer), Python FastAPI (core AI analysis)
- DB: PostgreSQL + Drizzle ORM (Express side), SQLite (Python side via SQLAlchemy)
- AI: spaCy, sentence-transformers, KeyBERT, YAKE — ESCO + O*NET keyword matching
- Mobile: Expo (React Native) at `/mobile/`
- Validation: Zod, drizzle-zod
- API codegen: Orval (from OpenAPI spec)

## Where things live

- `artifacts/open-resume/` — React + Vite web frontend (ATS checker UI)
- `artifacts/open-resume-mobile/` — Expo mobile companion app
- `artifacts/api-server/` — Express API server (health check, proxy)
- `backend/` — Python FastAPI backend (resume parsing, AI analysis, history)
- `lib/api-spec/openapi.yaml` — OpenAPI contract
- `lib/db/` — Drizzle ORM schema + migrations

## Architecture decisions

- The Python FastAPI backend handles all heavy AI processing (resume parsing, ESCO/O*NET keyword matching, scoring)
- The Express API server provides health checks and acts as a thin layer; the frontend calls the Python backend directly via `/api/*` routes
- Vite frontend uses `import.meta.env.BASE_URL` for all API calls so routing works in both dev and production
- Tailwind CSS v4 with CSS variable-based theming for dark/light mode toggle

## Product

- Upload PDF/DOCX resume + paste job description → get ATS compatibility score
- 5-layer AI keyword matching using ESCO occupations and O*NET skills databases
- Section-by-section analysis, action verb suggestions, format checking
- History panel to view and compare past scans
- Mobile companion app for on-the-go access

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- The Python backend must be running for resume analysis to work (Express API server alone only covers /api/healthz)
- Run `pnpm --filter @workspace/api-spec run codegen` after changing `lib/api-spec/openapi.yaml`

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
