# The Royal Knot — Production Deployment Guide

This guide provides end-to-end instructions for deploying **The Royal Knot** Wedding Operations & Planning Management System to production.

---

## Architecture Overview

- **Monorepo Architecture**:
  - `shared`: TypeScript shared contracts, Zod schemas, BigInt paise arithmetic, and RBAC matrix.
  - `server`: Express.js backend API with Prisma ORM, session security, rate limiting, and BigInt JSON serialization.
  - `client`: Vite + React + Tailwind CSS luxury SPA dashboard.
- **Production Mode**: In production (`NODE_ENV=production` or `SERVE_CLIENT=true`), the Express server automatically serves the compiled frontend from `client/dist` and handles SPA routing fallback for all non-API routes. This guarantees single-origin session cookies and zero CORS configuration friction.

---

## Option 1: 1-Click Cloud Deployment via Render (Recommended)

Render provides a managed PostgreSQL database and a Node.js web service.

### Steps:
1. Push your changes to GitHub (branch `main`).
2. Log into [Render Dashboard](https://dashboard.render.com).
3. Click **New +** &rarr; **Blueprint**.
4. Connect the repository: `sathwik328/Wedding-Planning-Management-System-team25`.
5. Render will automatically detect `render.yaml` and configure:
   - **Database**: PostgreSQL 16 database (`royal-knot-db`)
   - **Web Service**: Node.js web service (`royal-knot-web`)
6. Set the environment variable `DEMO_USER_PASSWORD` (e.g. `RoyalKnot#Live2026`).
7. Click **Apply**. Render will automatically build the client and server, run migrations, seed initial demonstration data, and launch the service.

---

## Option 2: Docker / Container Deployment (Railway, Fly.io, DigitalOcean, AWS ECS)

The repository includes a production multi-stage `Dockerfile` and `docker-compose.yml`.

### Local or Self-Hosted Docker Compose:
```bash
# Spin up PostgreSQL and the production web application
docker-compose up -d --build

# View container logs
docker-compose logs -f web
```
The website will be live at `http://localhost:5000`.

### Deploying to Railway:
1. Install the Railway CLI or connect via GitHub on [railway.app](https://railway.app).
2. Create a new project and add a PostgreSQL database plugin.
3. Link the repository. Railway will use the `Dockerfile`.
4. Add the environment variables:
   - `DATABASE_URL`: `${{Postgres.DATABASE_URL}}`
   - `SESSION_SECRET`: `<generate-32-char-random-key>`
   - `DEMO_USER_PASSWORD`: `<your-secure-password>`
   - `SERVE_CLIENT`: `true`
   - `NODE_ENV`: `production`

---

## Option 3: Decoupled Deployment (Frontend on Vercel + Backend on Render/Railway)

If you prefer hosting the React client separately on Vercel:

1. **Backend**:
   - Deploy `server` to Render or Railway using Node.js.
   - Note the backend URL (e.g., `https://royal-knot-api.onrender.com`).
2. **Frontend (Vercel)**:
   - Import the repository into [Vercel](https://vercel.com).
   - Set Root Directory to `.`.
   - Update `vercel.json` rewrite destination:
     ```json
     {
       "source": "/api/:path*",
       "destination": "https://royal-knot-api.onrender.com/api/:path*"
     }
     ```
   - In backend environment variables, ensure `CORS_ORIGIN` includes your Vercel URL (e.g. `https://the-royal-knot.vercel.app`).

---

## Required Environment Variables Reference

| Variable | Required | Description | Example |
| :--- | :--- | :--- | :--- |
| `DATABASE_URL` | **Yes** | Prisma database connection URL (PostgreSQL in production, SQLite for local container) | `postgresql://user:pass@host:5432/db` |
| `PORT` | Optional | Port for the Express server to listen on (default: `5000`) | `5000` |
| `NODE_ENV` | **Yes** | Environment mode | `production` |
| `SERVE_CLIENT` | Optional | Enables Express to serve `client/dist` static assets | `true` |
| `SESSION_SECRET` | **Yes** | Secret key for signing session cookies | `random_64_character_hex_string` |
| `DEMO_USER_PASSWORD` | **Yes** | Password required to run demo database seeds | `RoyalKnot#LiveDemo2026` |
| `CORS_ORIGIN` | Optional | Comma-separated list of allowed origins (defaults to localhost) | `https://the-royal-knot.vercel.app` |

---

## Production Verification Checklist

Once deployed:
1. Visit `https://<your-app-domain>/api/health` &rarr; Returns `{"status":"ok","timestamp":"..."}`.
2. Visit `https://<your-app-domain>/` &rarr; Loads The Royal Knot landing page and portal.
3. Log in with demo accounts:
   - Founder: `founder@royalknot.in` / `<DEMO_USER_PASSWORD>`
   - Lead Planner: `lead.planner@royalknot.in` / `<DEMO_USER_PASSWORD>`
   - Coordinator: `operations@royalknot.in` / `<DEMO_USER_PASSWORD>`
   - Finance Director: `finance@royalknot.in` / `<DEMO_USER_PASSWORD>`
4. Test modules:
   - CRM Enquiries & VIP intake
   - Weddings Portfolio & milestone task automation
   - Day-of Operations minute-by-minute timeline & Readiness Radar
   - Vendor Procurement & RFQ comparison matrix
   - Financial Ledger & client billing
   - Guest Concierge QR Portal & Contingency Planner
