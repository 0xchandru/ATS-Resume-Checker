# ATS Resume Checker

An ATS (Applicant Tracking System) resume analysis platform with AI-powered scoring, smart editing, and cover letter generation.

## Features

- **ATS Score** — 7-dimension scoring: keyword match, domain alignment, evidence quality, seniority fit, ATS format, section completeness, and impact quantification
- **Smart Resume Editor** — Full rich-text editor with live score updates as you type, AI Optimize (injects missing skills), AI Clean (removes clichés), and PDF export
- **Cover Letter Generator** — Tone-aware AI cover letter with edit mode and PDF export
- **Skills Matrix** — Visual breakdown of matched vs missing skills
- **Scan History** — Compare scores across multiple uploads

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- An [NVIDIA NIM API key](https://build.nvidia.com/) (free tier available)

### Setup

```bash
# 1. Clone the repo
git clone <repo-url>
cd ats-resume-checker

# 2. Copy env file and add your API key
cp .env.example .env
# Edit .env: set NVIDIA_API_KEY=your_key

# 3. Install Python dependencies
pip install -r requirements.txt
python -m spacy download en_core_web_sm

# 4. Install Node dependencies
npm install

# 5. Start the app
bash run.sh
```

Open http://localhost:5000 in your browser.

## Architecture

```
ats-resume-checker/
├── backend/
│   └── app/
│       ├── routers/          # FastAPI route handlers
│       │   ├── analyze.py    # Main scoring pipeline + quick_score
│       │   ├── editor.py     # Smart Editor AI endpoints
│       │   ├── upload.py     # File upload
│       │   └── ...
│       └── engine/
│           ├── parsing/      # PDF/DOCX parser + format checker
│           ├── matching/     # 8-layer keyword matching
│           ├── scoring/      # 7-dimension scoring model
│           └── intelligence/ # Career analysis + feedback
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── editor/       # Smart Resume Editor
│       │   ├── results/      # Score report tabs
│       │   └── upload/       # Upload panel
│       └── App.tsx
└── run.sh                    # Starts both servers
```

## Scoring Model

| Dimension | Weight | Description |
|---|---|---|
| Hard Skills Match | 25% | Keyword + concept matching across 8 layers |
| Domain Alignment | 15% | Semantic similarity to job description |
| Evidence Quality | 15% | Are skills backed by concrete examples? |
| Seniority Fit | 15% | Candidate vs role level alignment |
| ATS Parseability | 15% | Format, columns, fonts, encoding |
| Section Completeness | 8% | Required resume sections present |
| Impact Quantification | 7% | Quantified achievements in bullets |

## Smart Editor

The Smart Editor provides a live editing environment:

- **AI Optimize** — Rewrites your resume to better match the job description, weaving in your top missing skills where your experience supports it
- **AI Clean** — Strips AI clichés (leveraged, spearheaded, synergistic, etc.) with regex + optional LLM polish
- **Export PDF** — Generates an ATS-friendly single-column PDF via fpdf2
- **Live Score** — Score updates 0.9s after you stop typing, using the same pipeline as the full analysis

## Environment Variables

See `.env.example` for all configurable options.

| Variable | Required | Description |
|---|---|---|
| `NVIDIA_API_KEY` | Yes | API key for NVIDIA NIM (LLM inference) |
| `BACKEND_PORT` | No | FastAPI port (default: 8787) |
| `DATABASE_URL` | No | SQLite path (default: `./ats_data.db`) |

## Tech Stack

**Backend:** FastAPI · SQLAlchemy · pdfplumber · python-docx · spaCy · fpdf2

**Frontend:** React · Vite · TailwindCSS · Tiptap · TanStack Query · shadcn/ui
