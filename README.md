# VeriGate — AI Governance Gateway

Hackathon project for Case Study 3 (AI Governance & Responsible AI in Enterprise).

## Author
**Team K&K**
- Khor Cheng Hooi
- Denise Koh Wei Sin

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

Runs at `http://localhost:5173`. Login is now a real credential check (bcrypt + JWT) against the
shared Supabase database, so the **backend must be running** (see below) before you can sign in — the
frontend can no longer be used fully standalone. Two seeded test accounts exist in the shared DB for
local dev:

| Role | Email | Password |
|---|---|---|
| Admin (→ `/dashboard`) | `test.admin@verigate.com` | `Test1234!` |
| Employee (→ `/workspace`) | `test.employee@verigate.com` | `Test1234!` |

Routing after login is automatic based on the account's real role — there's no manual role picker
anymore.

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
| `JWT_ALGORITHM` | Signing algorithm for JWTs. Optional, defaults to `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | How long a login session's access token lasts. Optional, defaults to `60` |
| `CORS_ORIGINS` | Allowed frontend origins, as a JSON array. Optional, defaults to `["http://localhost:5173"]` |
| `FRONTEND_URL` | Base URL used to build the link inside password-reset emails |
| `GEMINI_API_KEY` | Free-tier key from [aistudio.google.com/apikey](https://aistudio.google.com/apikey), used by Governance Copilot, the AI Workspace, and AI Tool trust evaluations |
| `EMAIL_HOST` | SMTP host used to send forgot/reset-password emails (e.g. `smtp.gmail.com`) |
| `EMAIL_PORT` | SMTP port. Optional, defaults to `587` (STARTTLS) |
| `SENDER_EMAIL` | Mailbox address the reset email is sent from |
| `SENDER_EMAIL_PW` | Password for `SENDER_EMAIL`. **For Gmail this must be an App Password** (Google Account → Security → 2-Step Verification → App passwords) — Gmail rejects plain SMTP auth with a normal account password |
| `PASSWORD_RESET_TOKEN_EXPIRE_MINUTES` | How long a password-reset link stays valid. Optional, defaults to `30` |

`GEMINI_API_KEY`, `EMAIL_HOST`, `SENDER_EMAIL`, and `SENDER_EMAIL_PW` are **required, not optional** —
the backend fails to start at all without them, even if you're not touching AI features or password
reset. If you just pulled and the backend won't boot, this is almost always why: fill in all four in
your local `backend/.env` (pull real values from a teammate rather than inventing your own Gmail App
Password, unless you want reset emails to come from your own inbox).

`backend/.env` is your **personal, local-only** copy — every teammate creates their own from
`.env.example` and fills in real Supabase credentials (see the `cp .env.example .env` step above).

**Never commit `backend/.env`.** It's already excluded in the root [`.gitignore`](.gitignore)
(`.env` and `backend/.env` are both listed), so `git add .` won't pick it up — but always double-check
with `git status` before pushing if you ever rename or move it. If a secret is ever committed by
mistake, rotate the credential immediately (a `git revert` alone does not invalidate it — it's still
live in history) and re-push a cleaned history.

`.env.example` is the only env file that *should* be committed — it documents which variables exist
without containing real secrets, so keep it in sync whenever you add a new variable.
