# ⚡ CivicGrid — AI-Powered Community Issue Resolution Platform

> Built with **FastAPI** · **Google Gemini 1.5 Pro** · **Supabase + PostGIS** · **React (Vite)**

---

## Architecture

```
Frontend (React/Vite)
  └─ EXIF / Geolocation → coordinates (native, NO AI)
  └─ /citizen → CitizenHub   (map + report flow + timeline + trust score)
  └─ /resolver → ResolverPortal (SLA work queue + proof upload)

Backend (FastAPI)
  └─ POST /api/v1/issues/report → MAS Pipeline:
      1. VisionAgent    → Gemini 1.5 Pro: category + severity
      2. DedupAgent     → Supabase PostGIS 50m radius check
      3. RoutingAgent   → Department assignment + RPA stub
      4. NotificationAgent → SendGrid email to all ticket users
  └─ APScheduler (15min): EscalationAgent → SLA check + social media

Database (Supabase + PostGIS)
  └─ issues table: GEOMETRY(Point,4326) spatial indexing
  └─ nearby_issues() RPC: ST_DWithin 50m dedup queries
  └─ Row Level Security policies
```

---

## Quick Start

### 1. Supabase Setup
1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run `database/schema.sql`
3. Copy your **Project URL** and **Service Role Key**

### 2. Backend Setup
```bash
cd backend
cp .env.example .env
# Fill in SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### 3. Frontend Setup
```bash
cd frontend
cp .env.example .env
# Fill in VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
npm install
npm run dev
```

### 4. Docker (All-in-One)
```bash
cp backend/.env.example backend/.env
# Fill in env vars
docker-compose up
```
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- Swagger docs: http://localhost:8000/docs

---

## API Keys Required

| Service | Purpose | Env Var |
|---|---|---|
| Google Gemini | Vision Agent (issue classification + proof validation) | `GEMINI_API_KEY` |
| Supabase | Database + Storage + Auth | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |
| SendGrid | Email notifications | `SENDGRID_API_KEY` |
| Twitter/X | SLA escalation posts | `TWITTER_*` |
| Instagram | SLA escalation posts | `INSTAGRAM_*` |

---

## Multi-Agent System

| Agent | Trigger | AI Model | Action |
|---|---|---|---|
| **VisionAgent** | New report / Proof submission | Gemini 1.5 Pro | Category + severity classification / Before-after validation |
| **DedupAgent** | Every new report | PostGIS (no AI) | 50m radius duplicate check |
| **RoutingAgent** | After new issue created | Rule-based | Department mapping + RPA stub |
| **EscalationAgent** | APScheduler (15min) | Gemini 1.5 Pro | SLA check + Twitter/Instagram caption generation |
| **NotificationAgent** | Status changes | No AI | SendGrid HTML email dispatch |

---

## Geo-Location Architecture

> **CRITICAL:** Location is NEVER inferred by AI/LLM.

Priority chain in `MediaUploader.jsx`:
1. **EXIF GPS** — extracted natively from image metadata via `exifr` library
2. **Browser Geolocation API** — `navigator.geolocation.getCurrentPosition()`
3. **Manual entry** — user types coordinates as last resort

---

## Project Structure

```
civicgrid/
├── backend/
│   ├── app/
│   │   ├── agents/          # 5 AI agents (Gemini-powered)
│   │   ├── api/v1/          # FastAPI endpoints
│   │   ├── core/            # JWT auth + dependencies
│   │   ├── rpa/             # Playwright RPA stubs
│   │   └── services/        # Storage, Email, Social Media
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── components/      # citizen/ + resolver/ + common/
│       ├── hooks/           # useGeolocation, useExifExtractor
│       ├── pages/           # Login, CitizenHub, ResolverPortal
│       └── store/           # Zustand global state
├── database/
│   └── schema.sql           # PostgreSQL + PostGIS schema
└── docker-compose.yml
```

---

## Civic Trust Score Levels

| Level | Score | Icon |
|---|---|---|
| Newcomer | 0-49 | 🌱 |
| Contributor | 50-149 | 🔥 |
| Guardian | 150-299 | ⚡ |
| Champion | 300-599 | 🏆 |
| Legend | 600+ | 🌟 |

Points: **+10** new report · **+5** co-verify · **+20** resolve issue

---

## Phase 2 Roadmap

- [ ] Playwright RPA handlers for actual municipal portals
- [ ] WebSocket real-time map updates (Supabase Realtime)
- [ ] SMS notifications (Twilio gateway — stubs already in code)
- [ ] PWA offline support
- [ ] Leaflet marker clustering for dense urban areas
- [ ] Admin panel with analytics dashboard
