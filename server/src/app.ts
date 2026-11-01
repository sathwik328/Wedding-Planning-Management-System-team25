import express, { Express } from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { PrismaClient } from "@prisma/client";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { bigIntSerializationMiddleware } from "./middleware/bigIntSerializer.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { createHealthRouter } from "./routes/health.routes.js";
import { createPublicPortalRouter } from "./routes/publicPortal.routes.js";
import { createAuthRouter } from "./routes/auth.routes.js";
import { createCrmRouter } from "./routes/crm.routes.js";
import { createAgreementRouter } from "./routes/agreement.routes.js";
import { createWeddingOpsRouter } from "./routes/weddingOps.routes.js";
import { createDayOfOpsRouter } from "./routes/dayOfOps.routes.js";
import { createDevBRouter } from "./routes/devB.routes.js";
import { createAdminRouter } from "./routes/admin.routes.js";

export function createApp(prisma: PrismaClient): Express {
  const app = express();

  // Deliberately configure proxy trust for safe IP extraction behind reverse proxies
  app.set("trust proxy", 1);

  // Configured CORS with credentials support (replaces wildcard CORS)
  const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(",").map((o) => o.trim())
    : ["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:3000", "http://127.0.0.1:5173"];

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(null, false);
        }
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token", "X-Requested-With"]
    })
  );

  app.use(express.json());

  // Intercept BigInt serialization before sending JSON responses
  app.use(bigIntSerializationMiddleware);

  // Root Server & Database Console Handler
  const renderConsole: express.RequestHandler = async (_req, res) => {
    try {
      const [
        couples,
        weddings,
        enquiries,
        vendors,
        tasks,
        invoices,
        bills
      ] = await Promise.all([
        prisma.couple.count(),
        prisma.wedding.count(),
        prisma.enquiry.count(),
        prisma.vendor.count(),
        prisma.task.count(),
        prisma.clientInvoice.count(),
        prisma.vendorBill.count()
      ]);
      const total = couples + weddings + enquiries + vendors + tasks + invoices + bills;

      res.setHeader("Content-Type", "text/html");
      res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>The Royal Knot — Database & Server Console</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0F0A09; color: #F5EBDD; margin: 0; padding: 2.5rem 1.5rem; line-height: 1.5; }
    .container { max-width: 860px; margin: 0 auto; }
    .header { border-bottom: 1px solid rgba(232,185,120,0.25); padding-bottom: 1.2rem; margin-bottom: 1.8rem; }
    .title { font-size: 2rem; color: #E8B978; margin: 0 0 .4rem; }
    .badge { display: inline-block; background: #3A6B4F; color: #fff; padding: .25rem .65rem; border-radius: 999px; font-size: .75rem; font-weight: 600; letter-spacing: .05em; text-transform: uppercase; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; margin: 1.5rem 0; }
    .card { background: #1B1311; border: 1px solid rgba(232,185,120,0.2); border-radius: 10px; padding: 1.2rem; }
    .card span { color: #CDBB9C; font-size: .8rem; display: block; margin-bottom: .3rem; }
    .card b { font-size: 1.8rem; color: #fff; }
    .btn { display: inline-block; background: #B8955A; color: #1B1311; padding: .65rem 1.2rem; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: .9rem; margin-right: .8rem; margin-top: .5rem; }
    .btn-secondary { background: transparent; color: #E8B978; border: 1px solid #B8955A; }
    .btn:hover { opacity: 0.9; }
    .links { margin-top: 2rem; background: #160F0D; padding: 1.4rem; border-radius: 10px; border: 1px solid rgba(232,185,120,0.15); }
    .links a { color: #E8B978; text-decoration: none; }
    .links a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <span class="badge">Prisma Database Online (SQLite dev.db)</span>
      <h1 class="title">The Royal Knot Database & Server Console</h1>
      <div>Port 5000 API server is active and serving real operational records.</div>
    </div>

    <div style="margin-bottom: 1.5rem;">
      <a href="http://localhost:5555" target="_blank" class="btn">🚀 Open Prisma Studio Database GUI (Port 5555) &rarr;</a>
      <a href="http://localhost:3000" target="_blank" class="btn btn-secondary">Open Web Application (Port 3000) &rarr;</a>
    </div>

    <div class="grid">
      <div class="card"><span>Total Verified Records</span><b>` + total.toLocaleString() + `+</b></div>
      <div class="card"><span>Weddings</span><b>` + weddings + `</b></div>
      <div class="card"><span>Couples</span><b>` + couples + `</b></div>
      <div class="card"><span>Vendors</span><b>` + vendors + `</b></div>
      <div class="card"><span>Enquiries</span><b>` + enquiries + `</b></div>
      <div class="card"><span>Client Invoices</span><b>` + invoices + `</b></div>
      <div class="card"><span>Planning Tasks</span><b>` + tasks + `</b></div>
      <div class="card"><span>Vendor Bills</span><b>` + bills + `</b></div>
    </div>

    <div class="links">
      <h3 style="margin-top: 0; color: #E8B978;">Quick API & Navigation Endpoints</h3>
      <ul>
        <li><a href="http://localhost:5555" target="_blank"><strong>Prisma Studio</strong> (Visual GUI for inspecting all models & rows): http://localhost:5555</a></li>
        <li><a href="http://localhost:3000" target="_blank"><strong>Web Frontend Application</strong>: http://localhost:3000</a></li>
        <li><a href="/api/health" target="_blank"><strong>System Health Endpoint</strong>: /api/health</a></li>
        <li><a href="/api/crm/enquiries" target="_blank"><strong>CRM Enquiries API</strong>: /api/crm/enquiries</a></li>
        <li><a href="/api/weddings" target="_blank"><strong>Weddings Portfolio API</strong>: /api/weddings</a></li>
        <li><a href="/api/vendors" target="_blank"><strong>Vendors Directory API</strong>: /api/vendors</a></li>
      </ul>
    </div>
  </div>
</body>
</html>`);
    } catch {
      res.json({
        status: "ok",
        service: "The Royal Knot API Server",
        port: 5000,
        prismaStudio: "http://localhost:5555",
        clientApp: "http://localhost:3000"
      });
    }
  };

  app.get("/api/console", renderConsole);

  // System & Health routes (Public)
  app.use("/api/health", createHealthRouter(prisma));

  // Feature 3: Public Guest Concierge QR Portal (Public & Rate Limited)
  app.use("/api/public/portal", createPublicPortalRouter(prisma));

  // Authentication Core: Login, Logout, /api/auth/me
  app.use("/api/auth", createAuthRouter(prisma));

  // Developer A: CRM, Enquiries & Couples (Protected)
  app.use("/api/crm", createCrmRouter(prisma));

  // Developer A: Service Agreements & Digital Signatures (Protected)
  app.use("/api/agreements", createAgreementRouter(prisma));

  // Developer A: Weddings & Automated Task Pipelines (Protected)
  app.use("/api/weddings", createWeddingOpsRouter(prisma));

  // Developer A: Day-of Operations, Schedules, Radar, Incidents & Staff (Protected)
  app.use("/api/operations", createDayOfOpsRouter(prisma));

  // Developer B: Vendor Procurement, RFQs, Financial Ledger & Analytics
  app.use("/api", createDevBRouter(prisma));

  // Administration, RBAC & Demo Data Explorer (Protected)
  app.use("/api/admin", createAdminRouter(prisma));

  // Production / Unified Full-Stack Static SPA Serving
  const candidateDistPaths = [
    path.resolve(process.cwd(), "client/dist"),
    path.resolve(process.cwd(), "../client/dist"),
    path.resolve(__dirname, "../../client/dist"),
    path.resolve(__dirname, "../../../client/dist")
  ];
  const clientDistPath = candidateDistPaths.find((p) => fs.existsSync(p));

  if (clientDistPath && (process.env.NODE_ENV === "production" || process.env.SERVE_CLIENT === "true")) {
    app.use(express.static(clientDistPath));
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api")) return next();
      res.sendFile(path.join(clientDistPath, "index.html"));
    });
  } else {
    app.get("/", renderConsole);
  }

  // Centralized Error Handler
  app.use(errorHandler);

  return app;
}
