# Moment

Moment is a community photo app that treats photography as a craft and a conversation — not just content. It makes posting fast and thoughtful, and discovery clean and intentional.

## Problem Statement

- General social apps optimize for virality and speed, not careful viewing or context (EXIF, story, process). Photographers lose the why behind an image.
- Portfolio sites are static and isolating; they don’t foster day‑to‑day feedback, discovery or collaboration.
- Event sharing is fragmented, so gathering everyone’s photos from a photowalk or shoot is hard.
- Opportunities (gigs, collabs) are scattered and rarely tailored to a photographer’s niche.

## Key Features

- Posting flow that respects craft
  - Drag/drop or paste to upload; optional crop; auto EXIF extraction.
  - Add caption, tags, people and location; store EXIF with the image for context.
  - Edit Post dialog (no recrop): update caption, tags, people, location and EXIF later.

- Feed designed for images
  - Clean editorial card with author, place, and time‑ago.
  - Likes and comments with lightweight preview inside the card; full drawer for threads.
  - Accessible EXIF overlay toggle on the image (camera, lens, aperture, shutter, ISO, focal).

- Discover that adapts by device
  - Masonry explore grid (all screens) for fast scanning.
  - Mobile: tap a tile to open an infinite scroll overlay of feed cards (keep exploring).
  - Desktop: tap a tile to open a single‑post modal with arrows and a comments panel.
  - Search bar for captions, users and tags.

- Profiles & ownership tools
  - Lightweight profile (name, username, location, level, genres).
  - Per‑post menu for owners: Edit post, Delete, Copy link, Download.

- Spaces for belonging and opportunity 
  - Events: share photos from specific events (before/after, all in one place).
  - Gags: a job/gig board for photographers.
  - Communities: follow interests, join circles, share your niche.
  - Trending: hot posts, tags, and events.
  - Messages: direct and group conversations.

## Tech Stack (at a glance)

- React 19 + Vite 7, Tailwind CSS v4, React Router, React Easy Crop
- Supabase (Postgres, Auth, Storage) with RLS for photos, likes, comments, profiles
- Minimal FastAPI stub for future extensions; most CRUD is direct to Supabase

Project layout
- `frontend/` — React app and UI components
- `backend/` — FastAPI stub and Supabase SQL schema
