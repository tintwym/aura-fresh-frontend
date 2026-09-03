# Aura Fresh — Client Shop

Customer-facing grocery storefront for Aura Fresh (Myanmar). Browse the live catalog, manage a cart, check out with Stripe, track orders, and manage your delivery profile.

Built with **React 19**, **Vite 6**, **Tailwind CSS 4**, and a small **Express** dev server. Deploys to **Vercel** as a static SPA.

The store staff dashboard lives in [`../admin`](../admin). The REST API lives in [`../backend`](../backend).

---

## Requirements

- **Node.js 22+**
- **Spring Boot API** running on port `8080` (see [`../backend`](../backend))
- Optional: **Gemini API key** for Smart Recipes

---

## Quick start (local)

```bash
npm install
cp .env.example .env   # optional — defaults work for local dev
npm run dev
```

Open **http://127.0.0.1:3000**

In local dev, `server.ts` proxies `/api/*` to the Spring Boot backend and handles `/api/recipes` (Smart Recipes) on the same origin. You do not need to set `VITE_API_BASE_URL` locally.

Start the API first:

```bash
cd ../backend
cp .env.example .env
./mvnw spring-boot:run
```

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Vite + Express dev server on `:3000` |
| `npm run build` | Production Vite build + bundled Node server (`dist/`) |
| `npm run build:vercel` | Static Vite build only (for Vercel) |
| `npm start` | Run production Node server (`dist/server.cjs`) |
| `npm run lint` | TypeScript type check |
| `npm run test:e2e` | Playwright smoke tests |
| `npm run test:e2e:install` | Install Playwright Chromium |

---

## Environment variables

Copy `.env.example` to `.env` for local development.

| Variable | Local | Vercel / production |
|----------|-------|---------------------|
| `API_PROXY_TARGET` | `http://127.0.0.1:8080` | Not used (see `vercel.json` rewrites) |
| `VITE_API_BASE_URL` | Leave unset (uses `/api` proxy) | **Not required** — `vercel.json` proxies `/api` to Cloud Run |
| `GEMINI_API_KEY` | Smart Recipes via `server.ts` | Smart Recipes via `api/recipes.ts` |
| `VITE_GOOGLE_CLIENT_ID` | Google Sign-In (must match backend) | Same |
| `PORT` | `3000` | Set by Vercel |
| `BIND_HOST` | `127.0.0.1` | Not used on Vercel |

On the backend, set `APP_FRONTEND_BASE_URL` to your deployed client URL (CORS + Stripe return URLs).

---

## Deploy on Vercel

1. Import this repository in Vercel.
2. Set **Root Directory** to `frontend`.
3. Build settings (also in `vercel.json`):
   - **Build command:** `npm run build:vercel`
   - **Output directory:** `dist`
4. Optional environment variables:

   | Variable | Value |
   |----------|--------|
   | `GEMINI_API_KEY` | Optional — enables Smart Recipes |
   | `VITE_GOOGLE_CLIENT_ID` | If using Google Sign-In |

   **No `VITE_API_BASE_URL` needed.** [`vercel.json`](vercel.json) forwards `/api/*` to Cloud Run automatically.

5. Redeploy after any config change.

Smart Recipes runs as a Vercel serverless function at [`api/recipes.ts`](api/recipes.ts). All other API calls use same-origin `/api` (proxied to Cloud Run).

---

## How it talks to the API

| Concern | Module | Backend routes |
|---------|--------|----------------|
| Auth (register, login, JWT) | `src/lib/authApi.ts` | `/api/auth/...`, `/api/users/...` |
| Catalog & cart | `src/lib/shopApi.ts` | `/api/products`, `/api/carts`, `/api/checkout` |
| Delivery profile | `src/lib/profileApi.ts` | `/api/users/profiles/show`, `.../update` |
| Product reviews | `src/lib/reviewApi.ts` | `/api/reviews/store` |
| Product mapping | `src/lib/mapProduct.ts` | Maps API DTOs → UI types (MMK, category, expiry) |

The shop uses **MMK (Ks)** only. Meat and dairy products show **expiry badges** when the API provides `expiryDate`.

Checkout flow: save delivery address → sync cart → create Stripe Checkout session → redirect to Stripe → return to `/payment/success`.

---

## Project layout

```text
frontend/
├── api/
│   └── recipes.ts          # Vercel serverless — Smart Recipes (Gemini)
├── e2e/                    # Playwright tests
├── public/                 # Static assets (icons, etc.)
├── src/
│   ├── App.tsx             # Routes, global state, modals
│   ├── components/         # UI (catalog, cart, profile, orders, …)
│   ├── data/groceries.ts   # Offline fallback catalog only
│   ├── lib/                # API clients & mappers
│   └── types.ts            # Shared TypeScript types
├── server.ts               # Local dev / self-hosted production server
├── vercel.json             # Vercel build & SPA rewrites
└── vite.config.ts
```

---

## Features

- Live product catalog from the Spring Boot API (no mock products)
- Cart with stock validation and Stripe Checkout (MMK)
- Sign-in (username/password, Google OAuth)
- Delivery address saved to the API before checkout
- Order history and status from the API
- Post-delivery product reviews
- Smart Recipes (Gemini) from cart contents
- Dark / light / system theme
- Honest empty / error states when the API is unreachable

---

## Related docs

- Monorepo overview: [`../README.md`](../README.md)
- API setup & Cloud Run deploy: [`../backend/DEPLOY.md`](../backend/DEPLOY.md)
- Admin dashboard: [`../admin/README.md`](../admin/README.md)
