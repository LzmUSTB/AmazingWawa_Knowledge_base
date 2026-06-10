#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";
import { WAWAPKG_MIMETYPE, readWawaPackageBuffer } from "../src/wawapkg/wawapkg.js";

const EXCLUDE_DIRS = new Set([".git", "node_modules", "__MACOSX"]);
const EXCLUDE_FILES = new Set([".DS_Store"]);

function usage() {
  console.error("Usage: npm run kb:pack-ai-import -- ./package-folder ./wawa-import-xxx.wawapkg");
}

function assertSafeEntry(entryPath) {
  const normalized = entryPath.replaceAll("\\", "/");
  if (
    normalized.startsWith("/") ||
    /^[A-Za-z]:/.test(normalized) ||
    normalized.split("/").some((part) => part === ".." || part === "")
  ) {
    throw new Error(`Unsafe package path: ${entryPath}`);
  }
  return normalized;
}

function crc32Table() {
  const table = [];
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[index] = value >>> 0;
  }
  return table;
}

const CRC_TABLE = crc32Table();

function crc32(buffer) {
  let value = 0xffffffff;
  for (const byte of buffer) value = CRC_TABLE[(value ^ byte) & 0xff] ^ (value >>> 8);
  return (value ^ 0xffffffff) >>> 0;
}

function u16(value) {
  const buffer = Buffer.alloc(2);
  buffer.writeUInt16LE(value);
  return buffer;
}

function u32(value) {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32LE(value >>> 0);
  return buffer;
}

function collectFiles(packageRoot) {
  const files = [];
  function walk(current) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (entry.isDirectory() && EXCLUDE_DIRS.has(entry.name)) continue;
      if (entry.isFile() && EXCLUDE_FILES.has(entry.name)) continue;
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }
      if (!entry.isFile()) continue;
      const relativePath = assertSafeEntry(path.relative(packageRoot, fullPath));
      if (relativePath === "mimetype") continue;
      files.push({ relativePath, contents: fs.readFileSync(fullPath) });
    }
  }
  walk(packageRoot);
  return files.sort((left, right) => left.relativePath.localeCompare(right.relativePath));
}

function patchedManifest(packageRoot) {
  const manifestPath = path.join(packageRoot, "manifest.yaml");
  const manifest = fs.existsSync(manifestPath) ? YAML.parse(fs.readFileSync(manifestPath, "utf8")) || {} : {};
  const next = {
    ...manifest,
    packageFormat: "wawapkg",
    packageKind: "import",
    schemaVersion: "1.1",
  };
  return Buffer.from(YAML.stringify(next), "utf8");
}

function buildZip(entries) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  entries.forEach(({ relativePath, contents }) => {
    const nameBuffer = Buffer.from(relativePath, "utf8");
    const data = Buffer.isBuffer(contents) ? contents : Buffer.from(contents);
    const checksum = crc32(data);
    const localHeader = Buffer.concat([
      u32(0x04034b50),
      u16(20),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(checksum),
      u32(data.length),
      u32(data.length),
      u16(nameBuffer.length),
      u16(0),
      nameBuffer,
    ]);
    localParts.push(localHeader, data);
    centralParts.push(Buffer.concat([
      u32(0x02014b50),
      u16(20),
      u16(20),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(checksum),
      u32(data.length),
      u32(data.length),
      u16(nameBuffer.length),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(0),
      u32(offset),
      nameBuffer,
    ]));
    offset += localHeader.length + data.length;
  });

  const centralDirectory = Buffer.concat(centralParts);
  const end = Buffer.concat([
    u32(0x06054b50),
    u16(0),
    u16(0),
    u16(entries.length),
    u16(entries.length),
    u32(centralDirectory.length),
    u32(offset),
    u16(0),
  ]);
  return Buffer.concat([...localParts, centralDirectory, end]);
}

const [packageRootArg, outputArg] = process.argv.slice(2);
if (!packageRootArg || !outputArg) {
  usage();
  process.exit(1);
}

try {
  const packageRoot = path.resolve(packageRootArg);
  const outputPath = path.resolve(outputArg);
  if (!outputPath.toLowerCase().endsWith(".wawapkg")) throw new Error("Output file must use .wawapkg extension.");
  const entries = [
    { relativePath: "mimetype", contents: Buffer.from(WAWAPKG_MIMETYPE, "utf8") },
    ...collectFiles(packageRoot).filter((entry) => entry.relativePath !== "manifest.yaml"),
    { relativePath: "manifest.yaml", contents: patchedManifest(packageRoot) },
  ].sort((left, right) => (left.relativePath === "mimetype" ? -1 : right.relativePath === "mimetype" ? 1 : left.relativePath.localeCompare(right.relativePath)));
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  const archive = buildZip(entries);
  readWawaPackageBuffer(archive, outputPath);
  fs.writeFileSync(outputPath, archive);
  console.log(`Packed .wawapkg: ${outputPath}`);
} catch (error) {
  console.error(`Failed to pack .wawapkg: ${error?.message || error}`);
  process.exit(1);
}
