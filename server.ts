import express from "express";
import http from "http";
import https from "https";
import path from "path";
import { URL } from "url";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

const app = express();

const PORT = Number(process.env.PORT) || 3000;
const BIND_HOST = process.env.BIND_HOST || "127.0.0.1";
const API_PROXY_TARGET = process.env.API_PROXY_TARGET || "http://127.0.0.1:8080";

/** Proxy /api/* to the Spring Boot backend. */
function proxyApiToBackend(req: express.Request, res: express.Response) {
  const target = new URL(req.originalUrl, API_PROXY_TARGET);
  const isHttps = target.protocol === "https:";
  const transport = isHttps ? https : http;
  const headers: http.OutgoingHttpHeaders = { ...req.headers, host: target.host };
  delete headers["content-length"];

  const upstream = transport.request(
    target,
    {
      method: req.method,
      headers,
    },
    (upRes) => {
      res.writeHead(upRes.statusCode || 502, upRes.headers);
      upRes.pipe(res);
    },
  );

  upstream.on("error", (err) => {
    console.error("API proxy error:", err.message);
    if (!res.headersSent) {
      res.status(502).json({ error: "Backend unavailable" });
    }
  });

  if (req.method === "GET" || req.method === "HEAD") {
    upstream.end();
  } else {
    req.pipe(upstream);
  }
}

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use("/api", proxyApiToBackend);

    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, BIND_HOST, () => {
    console.log(`Server running on http://${BIND_HOST}:${PORT}`);
  });
}

startServer();
