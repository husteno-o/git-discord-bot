import { existsSync } from "node:fs";
import { cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";

const projectRoot = import.meta.dir;
const distDir = path.join(projectRoot, "dist");
const srcDir = path.join(projectRoot, "src");
const publicDir = path.join(projectRoot, "public");

console.log("Building DevPulse Landing Page for Cloudflare Pages...");

// Clean dist directory
if (existsSync(distDir)) {
  await rm(distDir, { recursive: true, force: true });
}
await mkdir(distDir, { recursive: true });

// Bundle TypeScript app
const buildResult = await Bun.build({
  entrypoints: [path.join(srcDir, "app.ts")],
  outdir: distDir,
  target: "browser",
  minify: true,
  naming: "app.js",
});

if (!buildResult.success) {
  console.error("Build failed:", buildResult.logs);
  process.exit(1);
}

// Copy HTML, CSS, and assets
await cp(path.join(srcDir, "index.html"), path.join(distDir, "index.html"));
await cp(path.join(srcDir, "styles.css"), path.join(distDir, "styles.css"));

// Copy public assets (logo.svg, etc.)
if (existsSync(publicDir)) {
  await cp(publicDir, distDir, { recursive: true });
}

// Copy public assets & Cloudflare Pages files (_headers, etc.)
if (existsSync(publicDir)) {
  await cp(publicDir, distDir, { recursive: true });
}

// Generate ready-to-upload zip archive for Cloudflare Pages Direct Upload
const rootDir = path.resolve(projectRoot, "../..");
const zipPath = path.join(rootDir, "devpulse-cloudflare-pages.zip");
Bun.spawnSync(["zip", "-r", "-q", zipPath, "."], { cwd: distDir });

console.log("Landing page build completed successfully in apps/web/dist!");
console.log(`Cloudflare Pages drag-and-drop zip package created at: ${zipPath}`);
