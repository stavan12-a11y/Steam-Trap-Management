# Steam Trap Management

Preventive maintenance tracking for industrial steam traps — built with the **same
stack and patterns as the PSV Tracking Dashboard** in this repository.

## Stack (identical to PSV dashboard)

- [Vite](https://vitejs.dev/) + [React 18](https://react.dev/) + TypeScript
- [Tailwind CSS](https://tailwindcss.com/) — Texas A&M maroon theme
- [React Router](https://reactrouter.com/) for navigation
- [Supabase](https://supabase.com/) — optional cloud auth + shared realtime data
- [lucide-react](https://lucide.dev/) icons

## Getting started

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build
npm run preview  # preview the production build
```

### Local mode (no Supabase)

Without `VITE_SUPABASE_*` env vars:

- Static login: `admin` / `tamu-steam-2026`
- Data in browser `localStorage`
- Demo dataset auto-seeded on first load

### Cloud mode (Supabase)

1. Run `supabase/schema.sql` in your Supabase SQL Editor
2. Create a user under **Authentication → Users**
3. Copy `.env.example` → `.env` and set `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`
4. Sign in with your Supabase user — everyone shares the same live dataset

## Data model

```
Equipment (name, area, is_running)
   └── Traps (tag, type, location)
          └── PM Records (append-only inspection history)
```

## Features

- Dashboard with KPIs, equipment cards, and priority action queue
- Equipment list + detail with trap inventory
- All-traps page with priority filters and search
- Trap detail with PM entry modal and inspection timeline
- Settings (PM intervals per trap type, reset demo data)
- CSV reporting exports

## Repository

This project lives in [PSV-Compliance-Tracking-Dashboard](https://github.com/stavan12-a11y/PSV-Compliance-Tracking-Dashboard).
