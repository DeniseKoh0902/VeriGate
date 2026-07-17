# VeriGate — AI Governance Gateway

Hackathon project for Case Study 3 (AI Governance & Responsible AI in Enterprise).

## Stack

- **Frontend**: React + TypeScript + Vite + Tailwind CSS + React Router
- **Backend**: FastAPI (Python)
- **Database**: Prisma ORM → Supabase (Postgres)

## Project structure

```
VeriGate/
├── frontend/                  React + TypeScript app
│   └── src/
│       ├── assets/            Images, logos
│       ├── components/
│       │   ├── ui/            Generic reusable primitives (Button, Input, Card)
│       │   ├── common/        Shared building blocks (Logo, Navbar, Footer)
│       │   └── layout/         Page-level layout wrappers (AuthLayout)
│       ├── pages/              One folder per page/feature, grouped by area
│       │   ├── auth/
│       │   │   └── Login/
│       │   └── dashboard/
│       ├── routes/             Route definitions
│       ├── services/           API calls to the backend
│       ├── types/               Shared TypeScript types
│       └── lib/                 Small helpers (e.g. `cn` classname merge)
│
└── backend/                    FastAPI app
    ├── app/
    │   ├── api/v1/endpoints/    Route handlers, grouped by resource
    │   ├── core/                Config/settings
    │   ├── db/                  Prisma client wiring
    │   ├── schemas/             Pydantic request/response models
    │   └── services/            Business logic
    ├── prisma/
    │   └── schema.prisma        Data model, migrated to Supabase
    └── requirements.txt
```

## Getting started

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Runs at `http://localhost:5173`. The frontend works fully standalone — no backend or database
needed. On the login screen, pick **IT Infrastructure** or **Employee** to view either dashboard
directly (login currently routes by role selection rather than a live credential check, since real
auth depends on the backend below).

### Backend

```bash
cd backend
python -m venv .venv
./.venv/Scripts/activate        # Windows
pip install -r requirements.txt
cp .env.example .env            # fill in your Supabase credentials — see below
prisma migrate dev              # applies schema to Supabase
uvicorn app.main:app --reload --port 8001
```

Runs at `http://localhost:8001`; health check at `/health`.

> **Windows note:** `prisma generate` currently fails with `spawn prisma-client-py ENOENT` —
> `prisma-client-py` was archived/unmaintained in April 2025 and this is an unresolved upstream bug,
> not a local misconfiguration. `prisma migrate dev` still applies schema changes to the database fine
> on its own; only the typed Python client generation step is affected.

The backend database is not shared publicly — `backend/.env` holds live Supabase credentials and is
intentionally excluded from this repo (see below). That's not an oversight: shipping real database
credentials in a public repo is exactly the kind of governance failure this project exists to prevent.
The full intended data model is still fully visible in
[`backend/prisma/schema.prisma`](backend/prisma/schema.prisma) and the applied migrations under
[`backend/prisma/migrations/`](backend/prisma/migrations/), even though the live database itself isn't
reachable from outside the team.

## Environment variables (`backend/.env`)

| Variable | Description |
|---|---|
| `DATABASE_URL` | Supabase pooled connection string (port 6543, `pgbouncer=true`) |
| `DIRECT_URL` | Supabase direct connection string (port 5432), used for migrations |
| `JWT_SECRET` | Secret used to sign auth tokens |

`backend/.env` is your **personal, local-only** copy — every teammate creates their own from
`.env.example` and fills in real Supabase credentials (see the `cp .env.example .env` step above).

**Never commit `backend/.env`.** It's already excluded in the root [`.gitignore`](.gitignore)
(`.env` and `backend/.env` are both listed), so `git add .` won't pick it up — but always double-check
with `git status` before pushing if you ever rename or move it. If a secret is ever committed by
mistake, rotate the credential immediately (a `git revert` alone does not invalidate it — it's still
live in history) and re-push a cleaned history.

`.env.example` is the only env file that *should* be committed — it documents which variables exist
without containing real secrets, so keep it in sync whenever you add a new variable.
