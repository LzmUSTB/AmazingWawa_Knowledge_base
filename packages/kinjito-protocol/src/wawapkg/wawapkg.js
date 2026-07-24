import zlib from "node:zlib";
import { normalizeAiPackageFiles } from "../ai-import/normalize-ai-package-files.js";
import { parseYaml } from "../parse-yaml.js";

export const WAWAPKG_MIMETYPE = "application/x-wawa-kb-ai-import-package";
export const MAX_WAWAPKG_TOTAL_SIZE = 100 * 1024 * 1024;
export const MAX_WAWAPKG_FILE_SIZE = 20 * 1024 * 1024;
export const MAX_WAWAPKG_FILE_COUNT = 1000;
export const ALLOWED_ASSET_EXTENSIONS = new Set([
  ".avif",
  ".bin",
  ".css",
  ".csv",
  ".gif",
  ".glb",
  ".gltf",
  ".htm",
  ".html",
  ".jpeg",
  ".jpg",
  ".js",
  ".json",
  ".md",
  ".mjs",
  ".mp3",
  ".mp4",
  ".otf",
  ".pdf",
  ".png",
  ".svg",
  ".ttf",
  ".txt",
  ".wasm",
  ".wav",
  ".webm",
  ".webp",
  ".woff",
  ".woff2",
  ".yaml",
  ".yml",
]);
const FORBIDDEN_EXTENSIONS = new Set([
  ".bat",
  ".cmd",
  ".css",
  ".dll",
  ".exe",
  ".htm",
  ".html",
  ".jar",
  ".js",
  ".ps1",
  ".sh",
  ".ts",
  ".vue",
  ".wasm",
]);
const REQUIRED_TOP_LEVEL = new Set(["mimetype", "manifest.yaml", "sources.yaml", "patch.yaml", "generated", "block-types", "review"]);
const HARMLESS_ENTRIES = new Set([".DS_Store"]);

function normalizeEntryPath(entryPath = "") {
  const normalized = String(entryPath).replaceAll("\\", "/");
  const parts = normalized.endsWith("/") ? normalized.slice(0, -1).split("/") : normalized.split("/");
  if (
    !normalized ||
    normalized.startsWith("/") ||
    /^[A-Za-z]:/.test(normalized) ||
    parts.some((part) => part === ".." || part === "")
  ) {
    throw new Error(`Invalid .wawapkg: unsafe path ${entryPath}`);
  }
  return normalized;
}

function isIgnoredEntry(entryPath) {
  return entryPath.startsWith("__MACOSX/") || HARMLESS_ENTRIES.has(entryPath.split("/").pop());
}

function isAllowedTopLevel(entryPath) {
  const top = entryPath.split("/")[0];
  return REQUIRED_TOP_LEVEL.has(top);
}

function isAssetPath(entryPath) {
  return /^generated\/content\/[^/]+\/[^/]+\/assets\//.test(entryPath);
}

function isHtmlNotePath(entryPath) {
  return /^generated\/content\/[^/]+\/[^/]+\/note\.html$/.test(entryPath);
}

function extensionOf(entryPath) {
  const fileName = entryPath.split("/").pop() || "";
  const dotIndex = fileName.lastIndexOf(".");
  return dotIndex >= 0 ? fileName.slice(dotIndex).toLowerCase() : "";
}

export function assetMimeType(entryPath = "") {
  const ext = extensionOf(entryPath);
  return {
    ".csv": "text/csv",
    ".gif": "image/gif",
    ".jpeg": "image/jpeg",
    ".jpg": "image/jpeg",
    ".json": "application/json",
    ".md": "text/markdown",
    ".mp3": "audio/mpeg",
    ".mp4": "video/mp4",
    ".pdf": "application/pdf",
    ".png": "image/png",
    ".txt": "text/plain",
    ".wav": "audio/wav",
    ".webm": "video/webm",
    ".webp": "image/webp",
    ".yaml": "application/yaml",
    ".yml": "application/yaml",
  }[ext] || "application/octet-stream";
}

function assetVaultRelativePath(entryPath) {
  const match = entryPath.match(/^generated\/content\/([^/]+)\/([^/]+)\/assets\/(.+)$/);
  if (!match) throw new Error(`Invalid .wawapkg: unsafe path ${entryPath}`);
  const [, domain, nodeId, assetPath] = match;
  if (!assetPath || assetPath.split("/").some((part) => part === ".." || part === "")) {
    throw new Error(`Invalid .wawapkg: unsafe path ${entryPath}`);
  }
  return `content/${domain}/${nodeId}/assets/${assetPath}`;
}

function assertAllowedEntry(entryPath) {
  if (isIgnoredEntry(entryPath)) return false;
  if (!isAllowedTopLevel(entryPath)) throw new Error(`Unknown top-level archive entry: ${entryPath}`);
  if (!isHtmlNotePath(entryPath) && !isAssetPath(entryPath) && FORBIDDEN_EXTENSIONS.has(extensionOf(entryPath))) {
    throw new Error(`Forbidden archive entry type: ${entryPath}`);
  }
  if (isAssetPath(entryPath) && !ALLOWED_ASSET_EXTENSIONS.has(extensionOf(entryPath))) {
    throw new Error(`Unsupported asset file type: ${entryPath}`);
  }
  return true;
}

function textDecoder(buffer) {
  return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
}

function readUInt16(buffer, offset) {
  return buffer[offset] | (buffer[offset + 1] << 8);
}

function readUInt32(buffer, offset) {
  return (buffer[offset] | (buffer[offset + 1] << 8) | (buffer[offset + 2] << 16) | (buffer[offset + 3] << 24)) >>> 0;
}

function findEndOfCentralDirectory(buffer) {
  const minOffset = Math.max(0, buffer.length - 0xffff - 22);
  for (let offset = buffer.length - 22; offset >= minOffset; offset -= 1) {
    if (readUInt32(buffer, offset) === 0x06054b50) return offset;
  }
  throw new Error("Invalid .wawapkg: zip end-of-central-directory was not found.");
}

export function readWawaPackageBuffer(buffer, sourcePath = "package.wawapkg") {
  if (!sourcePath.toLowerCase().endsWith(".wawapkg")) throw new Error("Package file must use .wawapkg extension.");
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  const eocd = findEndOfCentralDirectory(bytes);
  const entryCount = readUInt16(bytes, eocd + 10);
  const centralDirectorySize = readUInt32(bytes, eocd + 12);
  const centralDirectoryOffset = readUInt32(bytes, eocd + 16);
  if (entryCount > MAX_WAWAPKG_FILE_COUNT) throw new Error(`Too many files in .wawapkg: ${entryCount}`);
  if (centralDirectoryOffset + centralDirectorySize > bytes.length) throw new Error("Invalid .wawapkg central directory.");

  const textFiles = {};
  const seenEntries = new Set();
  let totalSize = 0;
  let offset = centralDirectoryOffset;
  for (let index = 0; index < entryCount; index += 1) {
    if (readUInt32(bytes, offset) !== 0x02014b50) throw new Error("Invalid central directory entry.");
    const compression = readUInt16(bytes, offset + 10);
    const compressedSize = readUInt32(bytes, offset + 20);
    const uncompressedSize = readUInt32(bytes, offset + 24);
    const nameLength = readUInt16(bytes, offset + 28);
    const extraLength = readUInt16(bytes, offset + 30);
    const commentLength = readUInt16(bytes, offset + 32);
    const externalAttributes = readUInt32(bytes, offset + 38);
    const localHeaderOffset = readUInt32(bytes, offset + 42);
    const name = normalizeEntryPath(textDecoder(bytes.slice(offset + 46, offset + 46 + nameLength)));
    offset += 46 + nameLength + extraLength + commentLength;
    if (name.endsWith("/")) continue;
    if (!assertAllowedEntry(name)) continue;
    if (seenEntries.has(name)) throw new Error(`Invalid .wawapkg: duplicate entry ${name}`);
    seenEntries.add(name);
    if (((externalAttributes >>> 16) & 0o170000) === 0o120000) throw new Error(`Invalid .wawapkg: unsafe path ${name}`);
    totalSize += uncompressedSize;
    if (totalSize > MAX_WAWAPKG_TOTAL_SIZE) throw new Error("Package exceeds 100 MB uncompressed size limit.");
    if (uncompressedSize > MAX_WAWAPKG_FILE_SIZE) throw new Error(`Package file too large: ${name}`);
    if (readUInt32(bytes, localHeaderOffset) !== 0x04034b50) throw new Error(`Invalid local header for ${name}.`);
    const localNameLength = readUInt16(bytes, localHeaderOffset + 26);
    const localExtraLength = readUInt16(bytes, localHeaderOffset + 28);
    const dataOffset = localHeaderOffset + 30 + localNameLength + localExtraLength;
    const compressed = bytes.slice(dataOffset, dataOffset + compressedSize);
    let data;
    if (compression === 0) data = compressed;
    else if (compression === 8) data = zlib.inflateRawSync(compressed);
    else throw new Error(`Invalid .wawapkg: unsupported compression method ${compression}`);
    if (data.length !== uncompressedSize) throw new Error(`Invalid .wawapkg: size mismatch for ${name}`);
    if (isAssetPath(name)) {
      textFiles[name] = data;
    } else {
      textFiles[name] = textDecoder(data);
    }
  }

  if (!Object.prototype.hasOwnProperty.call(textFiles, "mimetype")) throw new Error("Invalid .wawapkg: missing mimetype");
  if (textFiles.mimetype !== WAWAPKG_MIMETYPE) throw new Error("Invalid .wawapkg mimetype.");
  for (const required of ["manifest.yaml", "sources.yaml", "patch.yaml"]) {
    if (!textFiles[required]) throw new Error(`Invalid .wawapkg: missing ${required}.`);
  }
  const manifest = parseYaml(textFiles["manifest.yaml"], "manifest.yaml");
  if (manifest.packageFormat !== "wawapkg") throw new Error("Invalid .wawapkg: manifest.packageFormat must be wawapkg");
  if (!["import", "ai-import"].includes(manifest.packageKind)) {
    throw new Error("Invalid .wawapkg: manifest.packageKind must be import.");
  }

  const packageFiles = {
    packageId: manifest.packageId || "",
    packageFilePath: sourcePath,
    packageFormat: "wawapkg",
    importedFromExternal: true,
    manifestRaw: textFiles["manifest.yaml"] || "",
    sourcesRaw: textFiles["sources.yaml"] || "",
    patchRaw: textFiles["patch.yaml"] || "",
    generatedMetaFiles: {},
    generatedNoteFiles: {},
    generatedHtmlNoteFiles: {},
    generatedExerciseFiles: {},
    generatedConceptMapFiles: {},
    assetFiles: [],
    blockTypeFiles: {},
    reviewFiles: {},
  };
  Object.entries(textFiles).forEach(([entryPath, contents]) => {
    if (entryPath.startsWith("generated/content/") && entryPath.endsWith("/meta.yaml")) packageFiles.generatedMetaFiles[entryPath] = contents;
    if (entryPath.startsWith("generated/content/") && entryPath.endsWith("/note.md")) packageFiles.generatedNoteFiles[entryPath] = contents;
    if (entryPath.startsWith("generated/content/") && entryPath.endsWith("/note.html")) packageFiles.generatedHtmlNoteFiles[entryPath] = contents;
    if (entryPath.startsWith("generated/content/") && entryPath.endsWith("/exercises.yaml")) packageFiles.generatedExerciseFiles[entryPath] = contents;
    if (entryPath.startsWith("generated/concept-maps/") && /\.ya?ml$/i.test(entryPath)) packageFiles.generatedConceptMapFiles[entryPath] = contents;
    if (isAssetPath(entryPath)) {
      packageFiles.assetFiles.push({
        vaultRelativePath: assetVaultRelativePath(entryPath),
        packageRelativePath: entryPath,
        base64: Buffer.from(contents).toString("base64"),
        mimeType: assetMimeType(entryPath),
        size: contents.length,
      });
    }
    if (entryPath.startsWith("block-types/") && /\.ya?ml$/i.test(entryPath)) packageFiles.blockTypeFiles[entryPath] = contents;
    if (entryPath.startsWith("review/")) packageFiles.reviewFiles[entryPath] = contents;
  });
  return normalizeAiPackageFiles(packageFiles);
}

function crc32Table() {
  const table = [];
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
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
function u16(value) { const buffer = Buffer.alloc(2); buffer.writeUInt16LE(value); return buffer; }
function u32(value) { const buffer = Buffer.alloc(4); buffer.writeUInt32LE(value >>> 0); return buffer; }

export function writeWawaPackageBuffer(packageFiles) {
  const entries = [
    ["mimetype", Buffer.from(WAWAPKG_MIMETYPE)],
    ["manifest.yaml", Buffer.from(packageFiles.manifestRaw || "")],
    ["sources.yaml", Buffer.from(packageFiles.sourcesRaw || "")],
    ["patch.yaml", Buffer.from(packageFiles.patchRaw || "")],
    ...Object.entries(packageFiles.generatedMetaFiles || {}),
    ...Object.entries(packageFiles.generatedNoteFiles || {}),
    ...Object.entries(packageFiles.generatedHtmlNoteFiles || {}),
    ...Object.entries(packageFiles.generatedExerciseFiles || {}),
    ...Object.entries(packageFiles.generatedConceptMapFiles || {}),
    ...Object.entries(packageFiles.blockTypeFiles || {}),
    ...Object.entries(packageFiles.reviewFiles || {}),
    ...(packageFiles.assetFiles || []).map((asset) => [asset.packageRelativePath, Buffer.from(asset.base64 || "", "base64")]),
  ].map(([entryPath, contents]) => [normalizeEntryPath(entryPath), Buffer.isBuffer(contents) ? contents : Buffer.from(String(contents), "utf8")]);
  const seen = new Set();
  for (const [entryPath, contents] of entries) {
    if (seen.has(entryPath)) throw new Error(`Duplicate .wawapkg entry: ${entryPath}`);
    seen.add(entryPath);
    assertAllowedEntry(entryPath);
    if (contents.length > MAX_WAWAPKG_FILE_SIZE) throw new Error(`Package file too large: ${entryPath}`);
  }
  if (entries.length > MAX_WAWAPKG_FILE_COUNT) throw new Error(`Too many files in .wawapkg: ${entries.length}`);
  if (entries.reduce((sum, entry) => sum + entry[1].length, 0) > MAX_WAWAPKG_TOTAL_SIZE) throw new Error("Package exceeds 100 MB uncompressed size limit.");
  entries.sort((left, right) => left[0] === "mimetype" ? -1 : right[0] === "mimetype" ? 1 : left[0].localeCompare(right[0]));
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  for (const [entryPath, contents] of entries) {
    const name = Buffer.from(entryPath, "utf8");
    const checksum = crc32(contents);
    const local = Buffer.concat([u32(0x04034b50),u16(20),u16(0x0800),u16(0),u16(0),u16(0),u32(checksum),u32(contents.length),u32(contents.length),u16(name.length),u16(0),name]);
    localParts.push(local, contents);
    centralParts.push(Buffer.concat([u32(0x02014b50),u16(20),u16(20),u16(0x0800),u16(0),u16(0),u16(0),u32(checksum),u32(contents.length),u32(contents.length),u16(name.length),u16(0),u16(0),u16(0),u16(0),u32(0),u32(offset),name]));
    offset += local.length + contents.length;
  }
  const central = Buffer.concat(centralParts);
  return Buffer.concat([...localParts, central, u32(0x06054b50),u16(0),u16(0),u16(entries.length),u16(entries.length),u32(central.length),u32(offset),u16(0)]);
}
