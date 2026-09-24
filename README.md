# FrostWolf

FrostWolf is a multi-game mod hosting site — browse games, discover mods, publish versions, rate and download. Built with React + Vite + Tailwind + Supabase.

## Features

- **Game catalog** — curated games with icons/banners, top mods per game
- **Mod pages** — markdown description, gallery, version list with game-version / loader / channel filters, file downloads
- **Publishing** — create projects, upload versions (`project-files` storage), edit changelogs, project settings with unsaved-changes guard
- **Accounts** — Supabase email auth, profiles (username / display name / avatar / bio), user pages, user settings
- **Ratings & stats** — like/dislike with counts, download counts
- **Moderation** — admin queue, dashboard for owners
- **Legal pages** — Terms, Privacy, Community Rules

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | React 19, React Router 7 (data router), Tailwind CSS 4 |
| Backend | Supabase (Postgres, Auth, Storage) |
| Build | Vite 8, pnpm |
| Deploy | Netlify (`netlify.toml` + `public/_redirects` SPA fallback) |

Key libs: `@supabase/supabase-js`, `react-markdown` + `remark-gfm` + `rehype-sanitize`, `embla-carousel-react`.

## Project structure

```
index.html                  # title, favicons (frostwolf-dark/light.svg)
public/                     # favicons, icons.svg, _redirects (SPA fallback)
src/
  App.jsx                   # router: /, /mods/:slug, /games/:gameSlug, /dashboard, /admin, ...
  main.jsx / index.css
  components/               # Nav, Footer, FrostWolfLogo, ModCard, Gallery, VoteButtons, ...
  pages/                    # Home, ModPage, GamePage, NewMod, ProjectSettings, Dashboard, Admin, ...
  context/AuthContext.jsx   # Supabase session + profile loading/creation
  lib/
    supabase.js             # createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
    versionDownload.js      # storage download from `project-files` bucket
    versionFilters.js / format.js / youtube.js
supabase/*.sql              # schema, profiles, tags, ratings, moderation, media
scripts/upload-game-media.mjs  # upload game icon/banner to `game-media` bucket (service_role)
netlify.toml                # build command, publish dir, SPA redirect
```

## Getting started

Requirements: Node 22, pnpm.

```powershell
pnpm install
pnpm dev      # http://localhost:5173
pnpm lint
pnpm build
pnpm preview
```

## Environment variables

Create `.env` (gitignored):

```
VITE_SUPABASE_URL=https://xyz.supabase.co
VITE_SUPABASE_ANON_KEY=<anon / publishable key>
```

`src/lib/supabase.js` reads only these two. No secret keys in the browser.

## Supabase setup

1. Create a Supabase project.
2. Run the SQL in `supabase/` via the SQL editor, in a sensible order:
   - `schema.sql` (games, loaders, versions, projects, tags — **drops tables**)
   - `profiles.sql`, `profiles_display_name.sql`, `profiles_bio.sql`
   - `tags.sql`, `ratings.sql`, `moderation.sql`
   - `project_media.sql`, `game_media.sql`
3. Ensure storage buckets exist: `project-files` (version uploads), `game-media` (icons/banners), plus any avatar/icon buckets the policies expect.
4. Auth > URL Configuration:
   - Local dev: Site URL `http://localhost:5173`, add to Redirect URLs
   - Prod: Site URL `https://YOUR-SITE.netlify.app`, add `https://YOUR-SITE.netlify.app/**`

## Curated game media

Games are curated (no public write). To set icon/banner:

```powershell
$env:SUPABASE_URL = "https://xyz.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY = "<service_role key>"  # never in browser
node scripts/upload-game-media.mjs --slug minecraft --icon ./icon.png --banner ./banner.jpg
```

Icon = square PNG/WebP ~512px (≤1 MB), banner = wide JPG/WebP ~1920×480 (≤3 MB). See header comments in the script.

## Deploy to Netlify

`netlify.toml` already sets build `pnpm build`, publish `dist`, `NODE_VERSION=22`, and the `/* → /index.html 200` SPA fallback (also in `public/_redirects`).

1. Push to Git, import in Netlify.
2. Set env vars `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`.
3. Deploy. Verify: direct load of `/mods/some-slug`, login/logout, version download.

## Routes

`/` · `/mods/:slug` · `/mods/:slug/settings` · `/mods/new` · `/games/:gameSlug` · `/games/:gameSlug/:projectSlug` · `/users/:id` · `/dashboard` · `/settings` · `/login` · `/signup` · `/admin` · `/terms` · `/privacy` · `/rules` · `*` (NotFound)
