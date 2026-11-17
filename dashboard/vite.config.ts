import fs from "node:fs";
import path from "node:path";
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

export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss(), repoFiles()],
  server: { host: "127.0.0.1", port: 5173 },
});
