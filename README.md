# MusePath 🎵 — AI Music Learning Planner

A full-stack web application that builds personalized music learning roadmaps powered by Gemini AI, with song discovery via Spotify, video recommendations via YouTube, and gamified progress tracking.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + Vite |
| Backend | Spring Boot (Java) |
| Database | Supabase (PostgreSQL + Auth) |
| AI | Google Gemini API |
| Music | Spotify Web API |
| Videos | YouTube Data API v3 |
| Hosting | Vercel (Frontend) / Heroku or Render (Backend) |

---

## Quick Start

### 1. Clone & Setup

```bash
# Setup environment variables
cp frontend/.env.example frontend/.env
cp backend/.env.example backend/.env
```

### 2. Configure APIs

Fill in your keys in `frontend/.env` and `backend/.env`:

**Supabase** — [supabase.com](https://supabase.com)
- Create a project
- Run `supabase/schema.sql` in the SQL editor
- Copy `SUPABASE_URL` and `SUPABASE_ANON_KEY` (frontend), `SUPABASE_SERVICE_KEY` (backend)

**Gemini** — [aistudio.google.com](https://aistudio.google.com)
- Create an API key → `GEMINI_API_KEY`

**Spotify** — [developer.spotify.com](https://developer.spotify.com)
- Create an app → `SPOTIFY_CLIENT_ID` + `SPOTIFY_CLIENT_SECRET`

**YouTube** — [console.cloud.google.com](https://console.cloud.google.com)
- Enable YouTube Data API v3 → `YOUTUBE_API_KEY`

### 3. Install & Run

```bash
# Run backend (Spring Boot Java Server)
cd backend
./run-backend.ps1     # Starts on http://localhost:3001

# Install & run frontend (new terminal)
cd frontend
npm install
npm run dev           # Starts on http://localhost:5173
```

---

## App Structure

```
music project/
├── frontend/           # React + Vite
│   └── src/
│       ├── pages/      # 9 pages
│       ├── components/ # Layout + UI components
│       ├── services/   # API + Supabase clients
│       └── store/      # Zustand state
├── backend/            # Spring Boot (Java) API
│   ├── src/            # Java controllers, services, models
│   ├── pom.xml         # Maven project descriptor
│   ├── compile.ps1     # Maven build helper script
│   └── run-backend.ps1 # Dev runner script
└── supabase/
    └── schema.sql      # Full DB schema with RLS
```

## Pages

| Page | Route | Description |
|------|-------|-------------|
| Landing | `/` | Marketing page |
| Auth | `/auth` | Login / Sign Up |
| Onboarding | `/onboarding` | 6-step setup wizard |
| Dashboard | `/dashboard` | Home with stats & overview |
| Learning Plan | `/plan` | AI-generated monthly roadmap |
| Discover | `/discover` | AI song recommendations |
| Videos | `/videos` | YouTube lesson search |
| Progress | `/progress` | Streak, heatmap, achievements |
| Profile | `/profile` | User info & saved content |

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/generate-plan` | Generate AI learning plan |
| GET | `/dashboard` | Dashboard aggregated data |
| GET | `/discover` | AI song recommendations |
| GET | `/videos` | YouTube video search |
| POST | `/progress` | Log practice session |
| GET | `/progress` | Get progress history |
| POST | `/save-song` | Save a song |
| GET | `/profile` | Full user profile |
| PATCH | `/profile` | Update username |

## Deploy

- **Frontend:** Can be deployed to Vercel.
  ```bash
  cd frontend
  vercel
  ```
- **Backend:** Can be deployed to any Java Spring Boot host (e.g., Render, Railway, AWS, Heroku).

---

## Features

- 🤖 **AI Roadmaps** — Gemini generates monthly plans with weekly milestones
- 🎵 **Song Discovery** — Personalized recommendations by mood, genre, level
- 🎬 **Video Lessons** — YouTube search matched to your current lesson
- 🔥 **Streak Tracking** — Daily practice streaks with XP rewards
- 🏆 **Achievements** — Unlock badges for milestones
- 📊 **Progress Heatmap** — GitHub-style practice calendar
- ⭐ **XP & Levels** — Gamified progression system
- 💾 **Save Songs** — Build your personal learning library
