#!/usr/bin/env node
import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { spawn } from "node:child_process";

const [, , inputUrl, outputZipPath] = process.argv;

const MAX_RESOURCE_BYTES = 30 * 1024 * 1024;
const MAX_TOTAL_BYTES = 700 * 1024 * 1024;
const MAX_RESOURCE_COUNT = 2500;

if (!inputUrl || !/^https?:\/\//i.test(inputUrl)) {
  fail("Usage: node capture-source-snapshot.mjs <http-url> <output.zip>");
}
if (!outputZipPath) fail("Missing output zip path.");

const sourceUrl = new URL(inputUrl);
const tempRoot = await fsp.mkdtemp(path.join(os.tmpdir(), "wawa-source-snapshot-"));
const snapshotRoot = path.join(tempRoot, "snapshot");
const resourceRoot = path.join(snapshotRoot, "_resources");
const manifest = {
  sourceUrl: sourceUrl.href,
  capturedAt: new Date().toISOString(),
  mode: "unknown",
  resources: [],
  skipped: [],
};

await fsp.mkdir(resourceRoot, { recursive: true });

const resources = new Map();
let totalBytes = 0;

function fail(message) {
  console.error(message);
  process.exit(1);
}

function sanitizeName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96) || "resource";
}

function extensionFromContentType(contentType = "") {
  const type = contentType.split(";")[0].trim().toLowerCase();
  const map = {
    "text/html": ".html",
    "text/css": ".css",
    "text/javascript": ".js",
    "application/javascript": ".js",
    "application/x-javascript": ".js",
    "application/json": ".json",
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "image/svg+xml": ".svg",
    "image/avif": ".avif",
    "video/mp4": ".mp4",
    "video/webm": ".webm",
    "audio/mpeg": ".mp3",
    "audio/wav": ".wav",
    "font/woff": ".woff",
    "font/woff2": ".woff2",
    "application/wasm": ".wasm",
    "application/octet-stream": ".bin",
  };
  return map[type] || "";
}

function extensionFromUrl(url) {
  try {
    const pathname = new URL(url).pathname;
    const ext = path.extname(pathname).toLowerCase();
    if (/^\.[a-z0-9]{1,8}$/.test(ext)) return ext;
  } catch {
    // ignore
  }
  return "";
}

function resourcePathForUrl(url, contentType = "") {
  const urlObj = new URL(url);
  const ext = extensionFromUrl(url) || extensionFromContentType(contentType) || ".bin";
  const hash = crypto.createHash("sha1").update(urlObj.href).digest("hex").slice(0, 14);
  const name = sanitizeName(path.basename(urlObj.pathname) || urlObj.hostname);
  const fileName = `${hash}-${name}${name.endsWith(ext) ? "" : ext}`;
  return `_resources/${fileName}`;
}

function shouldSkipUrl(url) {
  if (!/^https?:\/\//i.test(url)) return true;
  if (resources.has(url)) return true;
  if (resources.size >= MAX_RESOURCE_COUNT) return true;
  return false;
}

async function saveResource(url, bytes, contentType = "", source = "network") {
  if (shouldSkipUrl(url)) return "";
  if (!bytes || !bytes.byteLength) return "";
  if (bytes.byteLength > MAX_RESOURCE_BYTES) {
    manifest.skipped.push({ url, reason: "resource too large", size: bytes.byteLength });
    return "";
  }
  if (totalBytes + bytes.byteLength > MAX_TOTAL_BYTES) {
    manifest.skipped.push({ url, reason: "snapshot total size limit", size: bytes.byteLength });
    return "";
  }

  const relativePath = resourcePathForUrl(url, contentType);
  const absolutePath = path.join(snapshotRoot, relativePath);
  await fsp.mkdir(path.dirname(absolutePath), { recursive: true });
  await fsp.writeFile(absolutePath, bytes);

  const record = {
    url,
    path: relativePath.replaceAll("\\", "/"),
    contentType,
    size: bytes.byteLength,
    source,
  };
  resources.set(url, record);
  manifest.resources.push(record);
  totalBytes += bytes.byteLength;
  return record.path;
}

function resolveUrl(raw, base = sourceUrl.href) {
  const value = String(raw || "").trim();
  if (!value || value.startsWith("#") || /^(data|blob|javascript|mailto|tel):/i.test(value)) return "";
  try {
    return new URL(value, base).href;
  } catch {
    return "";
  }
}

function localReference(raw, base = sourceUrl.href) {
  const resolved = resolveUrl(raw, base);
  if (!resolved) return raw;
  return resources.get(resolved)?.path || raw;
}

function rewriteSrcSet(value, base = sourceUrl.href) {
  return String(value || "")
    .split(",")
    .map((part) => {
      const trimmed = part.trim();
      if (!trimmed) return trimmed;
      const pieces = trimmed.split(/\s+/);
      pieces[0] = localReference(pieces[0], base);
      return pieces.join(" ");
    })
    .join(", ");
}

function rewriteTextResource(text, base = sourceUrl.href) {
  return String(text || "")
    .replace(/\b(src|href|poster)\s*=\s*(["'])([^"']+)\2/gi, (_m, attr, quote, target) => {
      return `${attr}=${quote}${localReference(target, base)}${quote}`;
    })
    .replace(/\bsrcset\s*=\s*(["'])([^"']+)\1/gi, (_m, quote, target) => {
      return `srcset=${quote}${rewriteSrcSet(target, base)}${quote}`;
    })
    .replace(/url\(\s*(["']?)([^"')]+)\1\s*\)/gi, (_m, quote, target) => {
      return `url(${quote}${localReference(target, base)}${quote})`;
    });
}

function extractStaticUrls(text, base = sourceUrl.href) {
  const urls = new Set();
  const patterns = [
    /\b(?:src|href|poster)\s*=\s*["']([^"']+)["']/gi,
    /\bsrcset\s*=\s*["']([^"']+)["']/gi,
    /url\(\s*["']?([^"')]+)["']?\s*\)/gi,
  ];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text))) {
      const raw = match[1];
      if (!raw) continue;
      if (pattern.source.includes("srcset")) {
        raw.split(",").forEach((item) => {
          const first = item.trim().split(/\s+/)[0];
          const resolved = resolveUrl(first, base);
          if (resolved) urls.add(resolved);
        });
      } else {
        const resolved = resolveUrl(raw, base);
        if (resolved) urls.add(resolved);
      }
    }
  }
  return [...urls];
}

async function fetchBytes(url) {
  const response = await fetch(url, {
    redirect: "follow",
    headers: {
      "user-agent": "Mozilla/5.0 WawaSourceSnapshot/1.0",
      "accept": "*/*",
    },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  return { buffer, contentType: response.headers.get("content-type") || "" };
}

async function staticFetchSnapshot() {
  manifest.mode = "fetch";
  const { buffer, contentType } = await fetchBytes(sourceUrl.href);
  const rawHtml = buffer.toString("utf8");

  const discovered = new Set(extractStaticUrls(rawHtml, sourceUrl.href));
  for (const url of [...discovered]) {
    if (resources.size >= MAX_RESOURCE_COUNT) break;
    try {
      const { buffer: body, contentType: type } = await fetchBytes(url);
      await saveResource(url, body, type, "static-fetch");
      if (/text\/css/i.test(type) || /\.css(?:[?#]|$)/i.test(url)) {
        const cssText = body.toString("utf8");
        extractStaticUrls(cssText, url).forEach((nextUrl) => discovered.add(nextUrl));
      }
    } catch (error) {
      manifest.skipped.push({ url, reason: String(error?.message || error) });
    }
  }

  const rewrittenHtml = rewriteTextResource(rawHtml, sourceUrl.href);
  await fsp.writeFile(path.join(snapshotRoot, "index.html"), rewrittenHtml, "utf8");
}

async function playwrightSnapshot() {
  let chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch (error) {
    throw new Error(`Playwright is not installed: ${error?.message || error}`);
  }

  manifest.mode = "playwright";
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1100 },
    deviceScaleFactor: 1,
    serviceWorkers: "block",
    javaScriptEnabled: true,
  });
  const page = await context.newPage();

  page.on("response", async (response) => {
    try {
      const request = response.request();
      if (request.method() !== "GET") return;
      const url = response.url();
      if (!/^https?:\/\//i.test(url)) return;
      const status = response.status();
      if (status < 200 || status >= 400) return;
      if (resources.has(url)) return;
      const headers = response.headers();
      const contentType = headers["content-type"] || "";
      const body = await response.body();
      await saveResource(url, body, contentType, "playwright-response");
    } catch (error) {
      // Many browser responses are intentionally not readable. Keep capture resilient.
    }
  });

  await page.goto(sourceUrl.href, { waitUntil: "networkidle", timeout: 90000 });

  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let y = 0;
      const step = Math.max(320, Math.floor(window.innerHeight * 0.75));
      const timer = setInterval(() => {
        window.scrollTo(0, y);
        y += step;
        if (y > document.documentElement.scrollHeight + window.innerHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 180);
    });
  });

  await page.waitForTimeout(1500);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);

  const rawHtml = await page.content();
  await browser.close();

  const rewrittenHtml = rewriteTextResource(rawHtml, sourceUrl.href);
  await fsp.writeFile(path.join(snapshotRoot, "index.html"), rewrittenHtml, "utf8");

  // Rewrite captured CSS files after the full resource map is available.
  for (const record of manifest.resources) {
    if (!/text\/css/i.test(record.contentType) && !record.path.endsWith(".css")) continue;
    const cssPath = path.join(snapshotRoot, record.path);
    try {
      const cssText = await fsp.readFile(cssPath, "utf8");
      await fsp.writeFile(cssPath, rewriteTextResource(cssText, record.url), "utf8");
    } catch {
      // Binary or unreadable CSS-like response; leave as-is.
    }
  }
}

async function writeManifest() {
  manifest.fileCount = manifest.resources.length + 2;
  manifest.totalSize = totalBytes;
  await fsp.writeFile(path.join(snapshotRoot, "snapshot-manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
  await fsp.writeFile(
    path.join(snapshotRoot, "README.md"),
    `# Source Snapshot

Source: ${sourceUrl.href}

Captured at: ${manifest.capturedAt}

Mode: ${manifest.mode}

Open \`index.html\` inside the knowledge base iframe or a browser.

This snapshot is generated for private local study. Some pages may still request network resources if their JavaScript constructs URLs dynamically.
`,
    "utf8",
  );
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"], ...options });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (data) => (stdout += data.toString()));
    child.stderr.on("data", (data) => (stderr += data.toString()));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(stderr || stdout || `${command} exited with code ${code}`));
    });
  });
}

async function zipSnapshot() {
  await fsp.mkdir(path.dirname(outputZipPath), { recursive: true });
  if (fs.existsSync(outputZipPath)) await fsp.rm(outputZipPath, { force: true });

  if (process.platform === "win32") {
    const ps = [
      "$ErrorActionPreference='Stop'",
      "$Source=$env:WAWA_SNAPSHOT_SOURCE",
      "$Destination=$env:WAWA_SNAPSHOT_ZIP",
      "if (Test-Path -LiteralPath $Destination) { Remove-Item -LiteralPath $Destination -Force }",
      "Compress-Archive -Path (Join-Path $Source '*') -DestinationPath $Destination -Force",
    ].join("; ");
    await run("powershell", ["-NoProfile", "-Command", ps], {
      env: { ...process.env, WAWA_SNAPSHOT_SOURCE: snapshotRoot, WAWA_SNAPSHOT_ZIP: outputZipPath },
    });
    return;
  }

  await run("zip", ["-r", outputZipPath, "."], { cwd: snapshotRoot });
}

try {
  try {
    await playwrightSnapshot();
  } catch (error) {
    manifest.playwrightError = String(error?.message || error);
    await staticFetchSnapshot();
  }
  await writeManifest();
  await zipSnapshot();

  const stat = await fsp.stat(outputZipPath);
  const result = {
    url: sourceUrl.href,
    zipPath: outputZipPath,
    outputDir: snapshotRoot,
    mode: manifest.mode,
    fileCount: manifest.fileCount,
    totalSize: stat.size,
  };
  process.stdout.write(JSON.stringify(result));
} finally {
  // Keep temporary folder for debugging during the current session only if requested.
  if (!process.env.WAWA_KEEP_SNAPSHOT_TEMP) {
    await fsp.rm(tempRoot, { recursive: true, force: true }).catch(() => {});
  }
}
