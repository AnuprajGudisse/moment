# Moment

A photo sharing app with React + Vite on the frontend, Supabase for auth/DB/storage, and a tiny FastAPI stub backend.

## Project layout

- `frontend/` — React app (Vite, Tailwind v4)
- `backend/` — FastAPI stub + Supabase SQL schema

## Prerequisites

- Node 18+ and npm
- A Supabase project (URL + anon key)
- Optional: Python 3.12+ for the FastAPI stub

## Quick start (frontend)

```bash
cd frontend
npm install
npm run dev
```

Set these env vars in `frontend/.env.local`:

```
VITE_SUPABASE_URL=...your supabase URL...
VITE_SUPABASE_ANON_KEY=...your anon key...
```

## Backend (optional)

```bash
cd backend
uvicorn main:app --reload
```

## Git & GitHub

1) Initialize repo and first commit

```bash
git init
git add .
git commit -m "Initial commit: Moment app"
```

2) Create a new GitHub repo (via site or GitHub CLI). With GitHub CLI:

```bash
gh repo create your-username/moment --private --source=. --remote=origin --push
```

If creating on the website, then:

```bash
git branch -M main
git remote add origin https://github.com/your-username/moment.git
# or: git@github.com:your-username/moment.git
git push -u origin main
```

> Note: `.gitignore` is configured to ignore `frontend/node_modules`, `frontend/dist`, Python `venv`, caches, and local env files.

---

### Explore (current features)
- Auth (email/password), profile edit
- Photo upload with crop + EXIF, feed with likes/comments
- Discover: masonry grid → viewer (mobile feed or desktop modal)
- Edit post dialog (no crop changes) to update caption, tags, people, and EXIF
- Placeholder sections: Events, Gags, Communities, Trending, Messages

### License
Internal/Private (add a LICENSE if needed)

