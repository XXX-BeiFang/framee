# Framee

**A self-hosted media discovery & playback platform**

Built with Next.js 14 App Router. Aggregates multiple third-party media resource sites and provides a Douban-driven browsing, search, bookmarking and playback experience.

![Next.js](https://img.shields.io/badge/Next.js-14-000?logo=nextdotjs)

![React](https://img.shields.io/badge/React-18-61dafb?logo=react)

![TypeScript](https://img.shields.io/badge/TypeScript-4.9-3178c6?logo=typescript)

![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3-38bdf8?logo=tailwindcss)

![License](https://img.shields.io/badge/License-CC%20BY--NC--SA%204.0-lightgrey)

[中文文档](./README.md) · **English**

---

## ⚠️ Important Notice (read first)

- This project is provided **for learning and technical research only**. It must not be used for any commercial purpose or public service.
- This project **does not store, upload, or distribute any video content**. All playback URLs come from APIs publicly exposed by third-party media sites. For any copyright concern, please contact the corresponding content provider.
- Do not promote this project on Chinese mainland social platforms.
- You are responsible for complying with the laws and regulations of your jurisdiction. Any legal risk arising from sharing or using this project is borne solely by the user.
- This project does not provide any means of bypassing paid content.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Requirements](#requirements)
- [Local Development](#local-development)
- [Deploy to Vercel](#deploy-to-vercel)
- [Accounts & Registration](#accounts--registration)
- [Deploy with Docker](#deploy-with-docker)
- [Configuration (config.json)](#configuration-configjson)
- [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)
- [Known Limitations](#known-limitations)
- [Credits & License](#credits--license)

---

## Features

### Browsing & Discovery

- **Cinematic homepage** — Hero banner carousel, Douban-powered recommendations, and a "Continue Watching" row.
- **Douban category browsing** — Movie / TV / variety / documentary lists with multi-level filtering by genre, region, era, and sort order.
- **Custom categories** — Add or remove navigation categories via `custom_category` in `config.json`; they take effect at build time.
- **Douban calendar** — Browse seasonal anime and TV air dates by weekday.

### Search

- **Streaming search** — Results render as they arrive instead of waiting for every resource site to respond.
- **Search suggestions** — Real-time autocomplete while typing.
- **Trending recommendations** — Popular titles surfaced on the search page.
- **Aggregation & ranking** — Results from multiple resource sites are de-duplicated and re-ranked by relevance.

### Playback

- **ArtPlayer + HLS.js** — HLS (m3u8) streaming playback.
- **Multi-source line selection** — A built-in scoring mechanism automatically picks the most reliable playback source.
- **Three-tier detail fallback** — Server-side scraping, third-party API, then resource-site API, to maximize detail-fetch success rate.
- **Content preloading** — Adjacent episodes are prefetched to reduce switching latency.
- **Intro/outro skipping** — Configurable auto-skip rules.

### Personal Data

- **Play history / favorites / search history** — Stored either in the browser or in Redis.
- **Scroll position memory** — Returning from a detail page restores your previous scroll position.

### Admin & Responsiveness

- **Admin panel** — Site config, resource-site management, and user management (requires a non-localstorage mode).
- **Resource-site health check & auto-sorting** — Test every API endpoint from the admin panel with one click.
- **Multi-device layout** — Three dedicated breakpoints (mobile bottom nav / tablet drawer sidebar / desktop persistent sidebar).
- **PWA** — Installable to home screen (see [Known Limitations](#known-limitations)).

---

## Tech Stack

| Layer      | Key dependencies                                                                                      |
| ---------- | ----------------------------------------------------------------------------------------------------- |
| Framework  | [Next.js 14](https://nextjs.org/) (App Router) · React 18                                             |
| Language   | TypeScript 4.9                                                                                        |
| Styling    | [Tailwind CSS 3](https://tailwindcss.com/) · next-themes (light/dark)                                 |
| Player     | [ArtPlayer](https://github.com/zhw2590582/ArtPlayer) · [HLS.js](https://github.com/video-dev/hls.js/) |
| Motion     | framer-motion                                                                                         |
| Data       | redis · @upstash/redis                                                                                |
| Scraping   | cheerio                                                                                               |
| Validation | zod                                                                                                   |
| Deployment | Vercel · Docker · Netlify                                                                             |

---

## Requirements

| Item            | Requirement                                                                   |
| --------------- | ----------------------------------------------------------------------------- |
| Node.js         | **≥ 18.17.0** (hard requirement of Next.js 14). Node 20 or 22 LTS recommended |
| Package manager | **pnpm** (`packageManager` is pinned to `pnpm@10.14.0`)                       |
| OS              | Any (Linux / macOS / Windows)                                                 |
| Browser         | Any modern browser with HLS support                                           |

> A `pnpm-lock.yaml` is provided. Do not mix npm or yarn, or you may end up with an inconsistent dependency tree.

Install pnpm:

```bash
corepack enable
corepack prepare pnpm@10.14.0 --activate
# or: npm i -g pnpm@10
```

---

## Local Development

### 1. Get the code

```bash
git clone <your-repo-url> framee
cd framee
```

### 2. Configure environment variables

```bash
cp .env.example .env.local
```

Then edit `.env.local` and **at minimum set `PASSWORD`**:

```ini
PASSWORD=your-own-password
NEXT_PUBLIC_STORAGE_TYPE=localstorage
```

> ⚠️ Without `PASSWORD`, every page is redirected to `/warning` and the site is unusable.

### 3. Install dependencies

```bash
pnpm install
```

### 4. Start the dev server

```bash
pnpm dev
```

Open <http://localhost:3000> and sign in with the `PASSWORD` you set.

### 5. Production build & local preview

```bash
pnpm build
pnpm start
```

### Available npm scripts

| Command             | Description                                                                         |
| ------------------- | ----------------------------------------------------------------------------------- |
| `pnpm dev`          | Generate runtime config + manifest, then start the dev server                       |
| `pnpm build`        | Production build (runs `gen:runtime` and `gen:manifest` first)                      |
| `pnpm start`        | Start in production mode (run `pnpm build` first)                                   |
| `pnpm typecheck`    | TypeScript type check (`tsc --noEmit`)                                              |
| `pnpm lint`         | ESLint (**requires an ESLint config**, see [Known Limitations](#known-limitations)) |
| `pnpm format`       | Format with Prettier                                                                |
| `pnpm gen:runtime`  | Only run the `config.json` → `src/lib/runtime.ts` conversion                        |
| `pnpm gen:manifest` | Only regenerate `public/manifest.json`                                              |

> **After editing `config.json` you must re-run `pnpm gen:runtime`** (`pnpm dev` and `pnpm build` do it automatically). Otherwise the new configuration will not be picked up at compile time.

---

## Deploy to Vercel

Vercel is the simplest way to deploy this project. The steps below use **localstorage mode**, which requires no extra services.

### 1. Push to GitHub

Make sure the repository includes `.gitignore` (already provided), so that `node_modules/`, `.next/` and similar artifacts are not committed.

```bash
git init
git add .
git commit -m "chore: initial commit"
git branch -M main
git remote add origin <your-repo-url>
git push -u origin main
```

### 2. Import the project into Vercel

1. Sign in to [Vercel](https://vercel.com/) and click **Add New → Project**.
2. Select the repository you just pushed and import it.
3. The **Framework Preset** is auto-detected as Next.js. Keep the default build command and output directory. (Vercel runs the `build` script from `package.json`, which already includes `gen:runtime` and `gen:manifest`.)

### 3. Set environment variables

Add these under **Settings → Environment Variables**. **At minimum you need these three:**

| Variable                   | Value                 | Notes                                               |
| -------------------------- | --------------------- | --------------------------------------------------- |
| `PASSWORD`                 | Your access password  | **Required** — without it the site is unreachable   |
| `NEXT_PUBLIC_STORAGE_TYPE` | `localstorage`        | Storage backend                                     |
| `NEXT_PUBLIC_BASE_URL`     | `https://your-domain` | **Required for the search recommendations feature** |

See [Environment Variables](#environment-variables) for the full list.

> All `NEXT_PUBLIC_*` variables are inlined into the client bundle **at build time**. You must **Redeploy** after changing them.

### 4. Deploy

Click **Deploy**. The first build takes roughly 2–4 minutes. You can then access the site on the assigned Vercel domain, or bind a custom domain.

### 5. Post-deployment checklist

- [ ] Visiting the homepage while logged out redirects to `/login`
- [ ] You can sign in with `PASSWORD`
- [ ] Home, Douban and search pages load data correctly
- [ ] The player can start playback
- [ ] "Trending" on the search page has content (if empty, check `NEXT_PUBLIC_BASE_URL`)

### Optional: upgrade to Upstash Redis (multi-account / cross-device sync)

In localstorage mode, records live only in the browser and **the admin panel is unavailable**. For multi-account and cross-device sync:

1. Complete the localstorage deployment above and confirm it works.
2. Sign up at [Upstash](https://upstash.com/) and create a Redis instance.
3. Copy the instance's **HTTPS Endpoint** and **Token**.
4. Back in Vercel, add these environment variables:
   - `UPSTASH_URL` = the endpoint from step 3
   - `UPSTASH_TOKEN` = the token from step 3
   - `NEXT_PUBLIC_STORAGE_TYPE` = `upstash`
   - `USERNAME` = super-admin username
   - `PASSWORD` = super-admin password
5. **Redeploy**.
6. (Optional) To let visitors register their own accounts, also set `NEXT_PUBLIC_ENABLE_REGISTRATION=true` — see [Accounts & Registration](#accounts--registration).

---

## Accounts & Registration

### Two account models

| Mode | How you sign in | Where accounts come from | Where data lives |
| --- | --- | --- | --- |
| `localstorage` (default) | A single shared password | Not applicable | In the browser |
| `upstash` / `redis` | Username + password | Created by an admin, or self-registered | Server-side, isolated per username |

> In other words: **the concept of a "user" only exists outside localstorage mode.** In localstorage mode the whole site shares one password and records stay in the browser.

### Super-admin account

The super-admin is defined directly by the `USERNAME` + `PASSWORD` environment variables and **never touches the database**, so it cannot (and does not need to) be created through registration. Login checks these two variables first; a match grants the `owner` role.

### Enabling self-service registration

Off by default. To turn it on:

```ini
NEXT_PUBLIC_ENABLE_REGISTRATION=true
```

Once enabled, a "Register now" entry appears on the login page. The constraints are:

| Item | Rule |
| --- | --- |
| Storage mode | Must be `upstash` or `redis`; the endpoint returns 400 under localstorage |
| Username | 3–32 characters, letters, digits, `_` and `-` only |
| Password | 8–128 characters, must contain both letters and digits (or symbols) |
| Role | Always `user` — **registration can never grant admin rights** |
| Rate limit | At most 10 successful registrations per IP per hour |

> ⚠️ The rate limiter counts **in process memory**. It works on a single Docker instance; under serverless environments like Vercel each instance keeps its own counter, so it only stops rapid attempts against one instance and **does not defend against distributed abuse**. If you open registration to the public, add Vercel WAF or Upstash Ratelimit on top.

### Password storage

Passwords are stored as **PBKDF2-SHA256 (100,000 iterations, random salt)** hashes — plaintext is never written to the database. The stored format is `pbkdf2$<iterations>$<salt>$<hash>`.

- The prefix doubles as a version marker: **legacy plaintext passwords written before this change still log in normally**, and are transparently upgraded to a hash on the first successful login.
- The iteration count is embedded in the stored string, so changing the constant in code **does not invalidate existing passwords**.

### Creating accounts when registration is off

With self-service registration disabled, accounts can only be created one by one by the super-admin under `/admin/user` ("Add user"). This suits closed scenarios such as a family or a small group.

---

## Deploy with Docker

Docker deployment supports self-hosted Redis and is a good fit for long-running or intranet use.

### Using Docker Compose (Redis variant, recommended)

`docker-compose.yml`:

```yaml
services:
  framee:
    build: .
    container_name: framee
    restart: unless-stopped
    ports:
      - '3000:3000'
    environment:
      - USERNAME=admin
      - PASSWORD=change-me-please
      - NEXT_PUBLIC_STORAGE_TYPE=redis
      - REDIS_URL=redis://framee-redis:6379
    networks:
      - framee-network
    depends_on:
      - framee-redis
    # To use a custom config, mount config.json
    # volumes:
    #   - ./config.json:/app/config.json:ro

  framee-redis:
    image: redis:alpine
    container_name: framee-redis
    restart: unless-stopped
    networks:
      - framee-network
    # For persistence
    # volumes:
    #   - ./data:/data

networks:
  framee-network:
    driver: bridge
```

Start it:

```bash
docker compose up -d --build
```


Open <http://localhost:3000>.

### Storage support matrix

| Storage | Docker | Vercel | Netlify |
| :---: | :---: | :---: | :---: |
| localstorage | ✅ | ✅ | ✅ |
| Self-hosted Redis | ✅ | ❌ | ❌ |
| Upstash Redis | ✅ | ✅ | ✅ |

> Every mode except localstorage supports multi-account, record sync, and the admin panel.

---

## Configuration (config.json)

Everything configurable lives in `config.json` at the repository root:

```json
{
  "cache_time": 7200,
  "api_site": {
    "dyttzy": {
      "api": "http://caiji.dyttzyapi.com/api.php/provide/vod",
      "name": "Movie Paradise",
      "detail": "http://caiji.dyttzyapi.com"
    }
  },
  "custom_category": [
    { "name": "Chinese", "type": "movie", "query": "华语" }
  ]
}
```

| Field | Description |
| --- | --- |
| `cache_time` | API cache duration in seconds |
| `api_site` | Dictionary of resource sites; add or remove freely |
| `custom_category` | Custom categories shown in navigation |

### `api_site` fields

| Key | Description |
| --- | --- |
| Object key | Unique identifier; lowercase letters and digits recommended |
| `api` | Root URL of the site's `vod` JSON API |
| `name` | Display name in the UI |
| `detail` | (Optional) Root URL of the site's detail pages, used for scraping when the API does not expose episode details |

The API format follows the standard MacCMS V10 specification.

### Categories supported by `custom_category`

- **movie**: 热门 (trending), 最新 (latest), 经典 (classic), 豆瓣高分 (highly rated), 冷门佳片 (hidden gems), 华语, 欧美, 韩国, 日本, 动作, 喜剧, 爱情, 科幻, 悬疑, 恐怖, 治愈
- **tv**: 热门, 美剧, 英剧, 韩剧, 日剧, 国产剧, 港剧, 日本动画, 综艺, 纪录片

> `type` + `query` uniquely identifies a category. Do not duplicate.

---

## Environment Variables

See [`.env.example`](./.env.example) for the full annotated list. Quick reference:

| Variable | Description | Values | Default |
| --- | --- | --- | --- |
| `PASSWORD` | **Access password (required)** | Any string | (empty) |
| `USERNAME` | Super-admin account (non-localstorage modes only) | Any string | (empty) |
| `NEXT_PUBLIC_SITE_NAME` | Site name | Any string | `Framee` |
| `ANNOUNCEMENT` | Site announcement | Any string | Built-in default |
| `NEXT_PUBLIC_STORAGE_TYPE` | Storage backend | `localstorage` / `redis` / `upstash` | `localstorage` |
| `REDIS_URL` | Self-hosted Redis URL | Connection string | (empty) |
| `UPSTASH_URL` | Upstash Redis URL | Connection string | (empty) |
| `UPSTASH_TOKEN` | Upstash Redis token | Token | (empty) |
| `NEXT_PUBLIC_ENABLE_REGISTRATION` | Enable self-service registration (see [Accounts & Registration](#accounts--registration)) | `true` / unset | unset (disabled) |
| `NEXT_PUBLIC_SEARCH_MAX_PAGE` | Max pages fetched per search | `1`–`50` | `5` |
| `NEXT_PUBLIC_DOUBAN_PROXY_TYPE` | How Douban data is requested | `direct` / `cors-proxy-zwei` / `cmliussss-cdn-tencent` / `cmliussss-cdn-ali` / `custom` | `direct` |
| `NEXT_PUBLIC_DOUBAN_PROXY` | Custom Douban data proxy prefix | URL prefix | (empty) |
| `NEXT_PUBLIC_DOUBAN_IMAGE_PROXY_TYPE` | How Douban images are loaded | `direct` / `server` / `img3` / `cmliussss-cdn-tencent` / `cmliussss-cdn-ali` / `custom` | `img3` |
| `NEXT_PUBLIC_DOUBAN_IMAGE_PROXY` | Custom image proxy prefix | URL prefix | (empty) |
| `NEXT_PUBLIC_BASE_URL` | Full URL of this deployment | `https://example.com` | (empty) |

### If images fail to load

If many posters fail to load after deployment, set `NEXT_PUBLIC_DOUBAN_IMAGE_PROXY_TYPE` to `direct` or `server` and redeploy. This usually resolves it.

### About the custom Douban proxy

If `NEXT_PUBLIC_DOUBAN_PROXY_TYPE` is set to `custom`, you need to host your own CORS proxy. `proxy.worker.js` in the repository root is a ready-to-deploy generic proxy for **Cloudflare Workers**; after deploying it, put the Worker URL into `NEXT_PUBLIC_DOUBAN_PROXY`.

---

## Project Structure

```
.
├── config.json                 # Resource sites and custom categories
├── next.config.js              # Next.js config (PWA, SVG, image policy)
├── tailwind.config.ts          # Design system: colors, fonts, breakpoints
├── vercel.json                 # Vercel cache headers and cron jobs
├── Dockerfile                  # Multi-stage production image
├── start.js                    # Startup script for Docker (standalone + cron)
├── proxy.worker.js             # Optional: Cloudflare Workers Douban proxy
├── .env.example                # Environment variable template
├── scripts/
│   ├── convert-config.js       # config.json → src/lib/runtime.ts
│   └── generate-manifest.js    # Generates public/manifest.json
└── src/
    ├── middleware.ts           # Site-wide auth (HMAC signature verification)
    ├── app/                    # App Router pages and API routes
    │   ├── page.tsx            # Homepage
    │   ├── detail/             # Detail page
    │   ├── play/               # Player page
    │   ├── search/             # Search page
    │   ├── douban/             # Douban category browsing
    │   ├── history/            # Play history / favorites
    │   ├── login/ warning/     # Login page / missing-password warning page
    │   ├── admin/              # Admin panel (site / sources / users)
    │   └── api/                # Backend API routes
    ├── components/             # UI components
    └── lib/                    # Data layer, utilities, hooks
```

---

## Known Limitations

Please read these before deploying. They describe real behavior of the current code, not misconfiguration.

### 1. `PASSWORD` is mandatory

Site-wide authentication is handled by `src/middleware.ts`. When `PASSWORD` is empty, the middleware redirects every page to `/warning`. This is by design, not a bug.

### 2. The admin panel is unavailable in localstorage mode

With `NEXT_PUBLIC_STORAGE_TYPE=localstorage` (the default), the six `/api/admin/*` endpoints return 400 immediately. As a result:

- You cannot use the admin panel to change site config or manage sources and users.
- Play history and favorites are stored only in the current browser and are lost when you switch devices or clear browser data.

Switch to Upstash Redis or self-hosted Redis to enable these capabilities.

### 3. Vercel does not support self-hosted Redis

Routes such as `/api/admin/*` declare `runtime = 'edge'`, while `redis` is a Node.js-only driver — the two are incompatible. Use `upstash` on Vercel. Self-hosted Redis is only for Docker deployments (the Dockerfile rewrites the runtime to `nodejs` automatically).

### 4. Limited PWA offline capability

`public/sw.js` is not in the auth allow-list, so while logged out the Service Worker registration request is redirected to the login page and registration fails. Symptoms:

- Possible Service Worker registration errors in the browser console.
- "Add to Home Screen" will not provide offline caching.

Online access is unaffected. For full PWA support, add `'/sw.js'` and `'/workbox-'` to the `shouldSkipAuth` allow-list in `src/middleware.ts`.

### 5. ESLint is not configured

The repository contains no `.eslintrc`, so `pnpm lint` / `next lint` will launch an interactive setup wizard and fail in CI. The `lint-staged` and `prepare: husky install` hooks in `package.json` therefore never take effect. Add an ESLint config before relying on linting.

### 6. Image hotlink protection

Douban image hosts (`img*.doubanio.com`) validate the `Referer` header. Every `<img>` in the project already sets `referrerPolicy="no-referrer"` — do not remove it, or posters will start returning 403 in bulk.

### 7. Filter values are constrained by Douban's tag vocabulary

Year, era and sort filters must use values that actually exist in Douban's tag vocabulary (for example, eras must be written as `90年代`, not `1990年代`). Non-existent values return empty results. The whitelists live in `src/lib/doubanFilters.ts`.

---

## Credits & License

### Upstream

This project is a derivative work based on [MoonTV](https://github.com/senshinya/MoonTV), and also draws on design ideas from [LibreTV](https://github.com/LibreSpark/LibreTV). Thanks to the upstream authors.

If you build on this project, please comply with the license terms and retain this project's attribution and repository URL.

### License

Licensed under **[CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/)** (Attribution — NonCommercial — ShareAlike 4.0 International). See [LICENSE](./LICENSE).

You are free to:

- ✅ Copy, distribute, and modify this project
- ✅ Use it for personal learning and research

Under the following terms:

- 📌 **Attribution** — Retain the original author's attribution and project URL
- 📌 **NonCommercial** — No commercial use
- 📌 **ShareAlike** — Derivative works must be released under the same license

---

<div align="center">

**If this project helps you, consider giving it a ⭐ Star**

</div>
