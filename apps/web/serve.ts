import { existsSync } from "node:fs";
import path from "node:path";

const distDir = path.join(import.meta.dir, "dist");
const port = 4173;

if (!existsSync(distDir)) {
  console.log("dist folder not found, running build first...");
  const proc = Bun.spawnSync(["bun", "run", "build.ts"], { cwd: import.meta.dir });
  console.log(proc.stdout.toString());
}

const server = Bun.serve({
  port,
  fetch(req) {
    const url = new URL(req.url);
    const filePath = path.join(distDir, url.pathname === "/" ? "index.html" : url.pathname);

    const file = Bun.file(filePath);
    if (file.size > 0) {
      return new Response(file);
    }

    // Fallback to index.html for SPA/static routing
    return new Response(Bun.file(path.join(distDir, "index.html")));
  },
});

console.log(`DevPulse landing page preview running at http://localhost:${server.port}`);
