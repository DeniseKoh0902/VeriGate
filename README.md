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

Runs at `http://localhost:5173` (proxies `/api` to the backend on port 8000).

### Backend

```bash
cd backend
python -m venv .venv
./.venv/Scripts/activate        # Windows
pip install -r requirements.txt
cp .env.example .env            # fill in your Supabase credentials
prisma generate
prisma migrate dev              # applies schema to Supabase
uvicorn app.main:app --reload --port 8000
```

Runs at `http://localhost:8000`; health check at `/health`.

## Environment variables (`backend/.env`)

| Variable | Description |
|---|---|
| `DATABASE_URL` | Supabase pooled connection string (port 6543, `pgbouncer=true`) |
| `DIRECT_URL` | Supabase direct connection string (port 5432), used for migrations |
| `JWT_SECRET` | Secret used to sign auth tokens |
