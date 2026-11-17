import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

// In development, serve the agent's own files (state/, control/, config.yaml)
// from the repository at /__repo/, so the dashboard shows this checkout's data.
function repoFiles(): Plugin {
  const root = path.resolve(import.meta.dirname, "..");
  return {
    name: "repo-files",
    configureServer(server) {
      server.middlewares.use("/__repo", (req, res) => {
        const rel = decodeURIComponent((req.url ?? "/").split("?")[0]);
        const file = path.join(root, rel);
        const allowed = /^\/(state|control)\/[\w.-]+\.json$|^\/config\.yaml$/.test(rel);
        if (!allowed || !file.startsWith(root) || !fs.existsSync(file)) {
          res.statusCode = 404;
          res.end("not found");
          return;
        }
        res.setHeader("Content-Type", rel.endsWith(".json") ? "application/json" : "text/plain");
        fs.createReadStream(file).pipe(res);
      });
    },
  };
}

// In development, run the server functions in api/ right here, with a throwaway
// account (dev@gta6fied.local / dev) and a local file instead of cloud storage.
function devApi(): Plugin {
  const here = import.meta.dirname;
  return {
    name: "dev-api",
    async configureServer(server) {
      const { hashPassword } = await import(pathToFileURL(path.join(here, "api/_lib/auth.js")).href);
      process.env.ADMIN_EMAIL ??= "dev@gta6fied.local";
      process.env.ADMIN_PASSWORD_HASH ??= hashPassword("dev");
      process.env.SESSION_SECRET ??= "development only";
      if (!process.env.BLOB_READ_WRITE_TOKEN) process.env.CONTROL_FILE ??= path.join(here, ".data/control.json");
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "127.0.0.1"}`);
        const name = url.pathname.match(/^\/api\/([a-z]+)$/)?.[1];
        const file = name ? path.join(here, "api", `${name}.js`) : "";
        if (!file || !fs.existsSync(file)) return next();
        try {
          const chunks: Buffer[] = [];
          for await (const chunk of req) chunks.push(chunk as Buffer);
          const headers = new Headers();
          for (const [key, value] of Object.entries(req.headers)) if (typeof value === "string") headers.set(key, value);
          const hasBody = req.method !== "GET" && req.method !== "HEAD";
          const handler = (await server.ssrLoadModule(file)).default;
          const response: Response = await handler.fetch(new Request(url, { method: req.method, headers, body: hasBody ? Buffer.concat(chunks) : undefined }));
          res.statusCode = response.status;
          response.headers.forEach((value, key) => res.setHeader(key, value));
          res.end(Buffer.from(await response.arrayBuffer()));
        } catch (error) {
          res.statusCode = 500;
          res.end(String(error));
        }
      });
    },
  };
}

export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss(), repoFiles(), devApi()],
  server: { host: "127.0.0.1", port: 5173 },
});
