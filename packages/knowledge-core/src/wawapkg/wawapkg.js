import zlib from "node:zlib";
import { normalizeAiPackageFiles } from "../ai-import/normalize-ai-package-files.js";
import { parseYaml } from "../parse-yaml.js";

export const WAWAPKG_MIMETYPE = "application/x-wawa-kb-ai-import-package";
const MAX_TOTAL_SIZE = 50 * 1024 * 1024;
const MAX_TEXT_FILE_SIZE = 10 * 1024 * 1024;
const MAX_FILE_COUNT = 500;
const FORBIDDEN_EXTENSIONS = new Set([
  ".bat",
  ".cmd",
  ".css",
  ".dll",
  ".exe",
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
  if (
    !normalized ||
    normalized.startsWith("/") ||
    /^[A-Za-z]:/.test(normalized) ||
    normalized.split("/").some((part) => part === ".." || part === "")
  ) {
    throw new Error(`Unsafe archive entry path: ${entryPath}`);
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

function isBinaryAllowed(entryPath) {
  return isAssetPath(entryPath);
}

function extensionOf(entryPath) {
  const fileName = entryPath.split("/").pop() || "";
  const dotIndex = fileName.lastIndexOf(".");
  return dotIndex >= 0 ? fileName.slice(dotIndex).toLowerCase() : "";
}

function assertAllowedEntry(entryPath) {
  if (isIgnoredEntry(entryPath)) return false;
  if (!isAllowedTopLevel(entryPath)) throw new Error(`Unknown top-level archive entry: ${entryPath}`);
  if (FORBIDDEN_EXTENSIONS.has(extensionOf(entryPath))) throw new Error(`Forbidden archive entry type: ${entryPath}`);
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
  if (entryCount > MAX_FILE_COUNT) throw new Error(`Too many files in .wawapkg: ${entryCount}`);
  if (centralDirectoryOffset + centralDirectorySize > bytes.length) throw new Error("Invalid .wawapkg central directory.");

  const textFiles = {};
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
    const localHeaderOffset = readUInt32(bytes, offset + 42);
    const name = normalizeEntryPath(textDecoder(bytes.slice(offset + 46, offset + 46 + nameLength)));
    offset += 46 + nameLength + extraLength + commentLength;
    if (name.endsWith("/")) continue;
    if (!assertAllowedEntry(name)) continue;
    totalSize += uncompressedSize;
    if (totalSize > MAX_TOTAL_SIZE) throw new Error("Package exceeds 50 MB uncompressed size limit.");
    if (!isBinaryAllowed(name) && uncompressedSize > MAX_TEXT_FILE_SIZE) throw new Error(`Text file too large: ${name}`);
    if (isBinaryAllowed(name)) continue;
    if (readUInt32(bytes, localHeaderOffset) !== 0x04034b50) throw new Error(`Invalid local header for ${name}.`);
    const localNameLength = readUInt16(bytes, localHeaderOffset + 26);
    const localExtraLength = readUInt16(bytes, localHeaderOffset + 28);
    const dataOffset = localHeaderOffset + 30 + localNameLength + localExtraLength;
    const compressed = bytes.slice(dataOffset, dataOffset + compressedSize);
    let data;
    if (compression === 0) data = compressed;
    else if (compression === 8) data = zlib.inflateRawSync(compressed);
    else throw new Error(`Unsupported zip compression method ${compression} for ${name}.`);
    textFiles[name] = textDecoder(data);
  }

  if (textFiles.mimetype !== WAWAPKG_MIMETYPE) throw new Error("Invalid .wawapkg mimetype.");
  for (const required of ["manifest.yaml", "sources.yaml", "patch.yaml"]) {
    if (!textFiles[required]) throw new Error(`Invalid .wawapkg: missing ${required}.`);
  }
  const manifest = parseYaml(textFiles["manifest.yaml"], "manifest.yaml");
  if (manifest.packageFormat !== "wawapkg") throw new Error("manifest.yaml: packageFormat must be wawapkg.");
  if (!["import", "ai-import"].includes(manifest.packageKind)) {
    throw new Error("manifest.yaml: packageKind must be import.");
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
    blockTypeFiles: {},
    reviewFiles: {},
  };
  Object.entries(textFiles).forEach(([entryPath, contents]) => {
    if (entryPath.startsWith("generated/content/") && entryPath.endsWith("/meta.yaml")) packageFiles.generatedMetaFiles[entryPath] = contents;
    if (entryPath.startsWith("generated/content/") && entryPath.endsWith("/note.md")) packageFiles.generatedNoteFiles[entryPath] = contents;
    if (entryPath.startsWith("block-types/") && /\.ya?ml$/i.test(entryPath)) packageFiles.blockTypeFiles[entryPath] = contents;
    if (entryPath.startsWith("review/")) packageFiles.reviewFiles[entryPath] = contents;
  });
  return normalizeAiPackageFiles(packageFiles);
}
