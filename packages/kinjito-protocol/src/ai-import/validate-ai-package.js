import { parseYaml } from "../parse-yaml.js";
import { EXERCISE_DIFFICULTIES, EXERCISE_MODES, EXERCISE_TYPES } from "../build-exercise-index.js";
import {
  getBlockRegistry,
  isNativeBlockType,
  isRegisteredDeclarativeBlockType,
  normalizeBlockTypes,
} from "../block-registry.js";
import { isAllowedKnowledgeStatus, isAllowedKnowledgeType } from "../schema.js";
import { potentialDuplicateNodeWarnings } from "./dedupe.js";

const PACKAGE_ID_PATTERN = /^(?:ai-import|wawa-import)-[a-z0-9-]+$/;
const KEBAB_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const LINK_RELATIONS = new Set(["depends-on", "used-in", "compares-with"]);
const SUPPORTED_INSERT_MODES = new Set(["after-heading", "before-heading", "end"]);
const OPERATION_TYPES = new Set(["add_domain", "add_node", "append_note_section", "append_exercise_set", "add_edge", "add_block_type", "propose_native_block"]);
const CONTENT_FORMATS = new Set(["markdown", "html", "none"]);
const FORBIDDEN_BLOCK_FIELD_PATTERN = /(^|\.)(script|iframe|eval|html|css|js|src|url|style|styles|javascript|on[a-z]+)/i;
const FORBIDDEN_MARKDOWN_PATTERNS = [
  { pattern: /<\s*script\b/i, label: "script tag" },
  { pattern: /<\s*iframe\b/i, label: "iframe tag" },
  { pattern: /\son[a-z]+\s*=/i, label: "inline event handler" },
  { pattern: /javascript\s*:/i, label: "javascript URL" },
  { pattern: /data\s*:/i, label: "data URL" },
  { pattern: /<\s*(img|video|audio|source|link)\b[^>]*(src|href)\s*=\s*["']?https?:\/\//i, label: "remote HTML resource" },
  { pattern: /!\[[^\]]*\]\(\s*https?:\/\//i, label: "remote Markdown image" },
];
const FORBIDDEN_HTML_PATTERNS = [
  { pattern: /<\s*object\b/i, label: "object tag" },
  { pattern: /<\s*embed\b/i, label: "embed tag" },
  { pattern: /\b(src|href|poster)\s*=\s*["']?data:/i, label: "data URL resource" },
  { pattern: /\b(src|href|poster)\s*=\s*["']?javascript:/i, label: "javascript URL resource" },
];
const ALLOWED_ASSET_EXTENSIONS = new Set([
  ".avif", ".bin", ".css", ".csv", ".gif", ".glb", ".gltf", ".htm", ".html", ".ico", ".jpeg", ".jpg", ".js", ".json", ".md", ".mjs", ".mp3", ".mp4", ".otf", ".pdf", ".png", ".svg", ".ttf", ".txt", ".wasm", ".wav", ".webm", ".webp", ".woff", ".woff2", ".yaml", ".yml",
]);
const SOURCE_URL_MEDIA_EXTENSIONS = new Set([".gif", ".jpeg", ".jpg", ".mp4", ".png", ".webm", ".webp"]);
const HTML_REQUIRED_REVIEW_FILES = [
  "review/source-coverage-plan.md",
  "review/source-asset-manifest.md",
  "review/interactive-demo-coverage.md",
];

function asArray(value) { return Array.isArray(value) ? value : value ? [value] : []; }
function normalizeSchemaVersion(value) { if (value === 1.1 || value === "1.1") return "1.1"; return String(value || ""); }
function normalizeContentFormat(value = "") { const format = String(value || "").trim().toLowerCase(); return CONTENT_FORMATS.has(format) ? format : ""; }
function operationsFromPatch(patch = {}) { return asArray(patch.operations || patch.changes || patch.patch).map(normalizeOperation); }

function normalizeOperation(operation = {}) {
  const node = operation.node || operation;
  if (operation.type === "add_domain") {
    const domain = operation.domain || operation;
    return { ...operation, id: domain.id, title: domain.title, titleLocale: domain.titleLocale || domain.title_locale || operation.titleLocale || operation.title_locale || "", description: domain.description || "", descriptionLocale: domain.descriptionLocale || domain.description_locale || operation.descriptionLocale || operation.description_locale || "", color: domain.color || "", order: domain.order, aliases: domain.aliases || [] };
  }
  if (operation.type === "add_node") {
    return {
      ...operation,
      id: node.id,
      title: node.title,
      titleLocale: node.titleLocale || node.title_locale || operation.titleLocale || operation.title_locale || "",
      aliases: node.aliases || [],
      domain: node.domain,
      nodeType: node.type || operation.nodeType,
      status: node.status,
      summary: node.summary || operation.summary || "",
      summaryLocale: node.summaryLocale || node.summary_locale || operation.summaryLocale || operation.summary_locale || "",
      parentId: operation.parentId || node.parentId,
      contentFormat: normalizeContentFormat(node.contentFormat || node.content_format || operation.contentFormat || operation.content_format),
    };
  }
  if (operation.type === "add_edge") {
    return {
      ...operation,
      nestedEdgeObject: Boolean(operation.edge),
      from: operation.from || operation.source,
      to: operation.to || operation.target,
      relation: operation.relation,
      reason: operation.reason || "",
    };
  }
  if (operation.type === "append_exercise_set") {
    return {
      ...operation,
      targetId: operation.targetId || operation.nodeId || operation.id,
      domain: operation.domain || "",
    };
  }
  if (operation.type === "add_block_type") {
    return { ...operation, typeName: operation.blockType || operation.block_type || operation.name || operation.id, file: operation.file || `block-types/${operation.blockType || operation.block_type || operation.name || operation.id}.yaml` };
  }
  return operation;
}

function nodeMap(currentVault, createdNodes = [], createdDomains = []) {
  const domainNodes = createdDomains.map((domain) => ({ id: domain.id, title: domain.title, titleLocale: domain.titleLocale || "", domain: domain.id, type: "domain", status: "domain", summary: domain.description || "", summaryLocale: domain.descriptionLocale || "" }));
  return new Map([...(currentVault.nodes || []), ...domainNodes, ...createdNodes].map((node) => [node.id, node]));
}
function generatedMetaPath(operation) { return `generated/content/${operation.domain}/${operation.id}/meta.yaml`; }
function generatedMarkdownNotePath(operation) { return `generated/content/${operation.domain}/${operation.id}/note.md`; }
function generatedHtmlNotePath(operation) { return `generated/content/${operation.domain}/${operation.id}/note.html`; }
function generatedExercisePath(operation) { return `generated/content/${operation.domain}/${operation.targetId || operation.id}/exercises.yaml`; }
function noteFormatForOperation(operation, packageFiles) {
  const explicit = normalizeContentFormat(operation.contentFormat);
  if (explicit) return explicit;
  if (packageFiles.generatedHtmlNoteFiles?.[generatedHtmlNotePath(operation)]) return "html";
  if (packageFiles.generatedNoteFiles?.[generatedMarkdownNotePath(operation)]) return "markdown";
  return "none";
}
function noteHeadingExists(markdown = "", headingSelector = "") {
  if (!headingSelector) return false;
  const normalized = headingSelector.replace(/^#+\s*/, "").trim().toLowerCase();
  return markdown.split(/\r?\n/).some((line) => /^#{1,6}\s+/.test(line) && line.replace(/^#+\s*/, "").trim().toLowerCase() === normalized);
}
function insertedHeading(markdown = "") { return markdown.split(/\r?\n/).map((line) => line.match(/^#{1,6}\s+(.+)$/)?.[1]?.trim()).find(Boolean); }
function collectBlockTypes(markdown = "") { const types = []; markdown.replace(/\r\n/g, "\n").split("\n").forEach((line) => { const match = line.match(/^:::([A-Za-z0-9_-]+)\s*$/); if (match) types.push(match[1]); }); return types; }
function extensionOf(path = "") { const cleanPath = String(path || "").split(/[?#]/)[0]; const fileName = cleanPath.split("/").pop() || ""; const dotIndex = fileName.lastIndexOf("."); return dotIndex >= 0 ? fileName.slice(dotIndex).toLowerCase() : ""; }
function nodeForAssetPath(path = "") { const match = path.match(/^generated\/content\/([^/]+)\/([^/]+)\/assets\/(.+)$/); return match ? { domain: match[1], nodeId: match[2], assetPath: match[3] } : null; }

function markdownAssetReferences(markdown = "") {
  const refs = [];
  const linkPattern = /(!?)\[([^\]]*)\]\(([^)\s]+)(?:\s+["'][^)]*)?\)/g;
  let match;
  while ((match = linkPattern.exec(markdown))) refs.push({ format: "markdown", tag: match[1] === "!" ? "img" : "a", image: match[1] === "!", label: match[2] || "", target: match[3] || "" });
  return refs;
}
function htmlAssetReferences(html = "") {
  const refs = [];
  const tagPattern = /<\s*([a-z0-9-]+)\b[^>]*?\b(src|href|poster)\s*=\s*["']([^"']+)["'][^>]*>/gi;
  let match;
  while ((match = tagPattern.exec(html))) {
    const tag = String(match[1] || "").toLowerCase();
    const attr = String(match[2] || "").toLowerCase();
    const target = match[3] || "";
    refs.push({ format: "html", tag, attr, image: tag === "img", target });
  }
  return refs;
}
function validateAssetReferencePath(target = "") {
  const normalized = target.replaceAll("\\", "/");
  if (!normalized.startsWith("assets/")) return { error: "asset references must start with assets/." };
  if (normalized.startsWith("/") || /^[A-Za-z]:/.test(normalized) || normalized.split("/").some((part) => part === ".." || part === "")) return { error: `unsafe asset path "${target}".` };
  const extension = extensionOf(normalized);
  if (!ALLOWED_ASSET_EXTENSIONS.has(extension)) return { error: `unsupported asset extension "${extension || "(none)"}".` };
  return { path: normalized };
}
function isSourceUrlMediaExtension(target = "") { return SOURCE_URL_MEDIA_EXTENSIONS.has(extensionOf(target)); }
function isLocalOriginalSourceAsset(target = "") {
  const normalized = String(target || "").replaceAll("\\", "/").trim();
  return normalized.startsWith("assets/original/") ||
    normalized.startsWith("assets/source/") ||
    normalized.startsWith("assets/source-assets/") ||
    normalized.startsWith("assets/source-snapshot/");
}
function isLocalSourceSnapshot(target = "") {
  const normalized = String(target || "").replaceAll("\\", "/").trim();
  return normalized.startsWith("assets/source-snapshot/") && /\.html?$/i.test(normalized.split(/[?#]/)[0]);
}
function isSourceSnapshotPackageAsset(packageRelativePath = "") {
  return String(packageRelativePath || "").replaceAll("\\", "/").includes("/assets/source-snapshot/");
}
function isSourceSnapshotLibraryAsset(asset = {}) {
  const type = String(asset.type || "").toLowerCase();
  const id = String(asset.id || "").toLowerCase();
  return type === "source-snapshot" ||
    type === "external-page" ||
    id.startsWith("source-snapshot") ||
    Boolean(asset.snapshot_path || asset.snapshotPath);
}
function hasSnapshotIframe(html = "") {
  return /<\s*iframe\b[^>]+src\s*=\s*["']assets\/source-snapshot\//i.test(html);
}
function hasDirectSnapshotResourceReference(html = "") {
  return /assets\/source-snapshot\/[^"')\s]+\/_resources\//i.test(html);
}
function visibleHtmlText(html = "") {
  return stripTags(html);
}
function hasForbiddenSnapshotLearnerText(html = "") {
  const text = visibleHtmlText(html);
  return /(原\s*snapshot|原始\s*snapshot|原始\s*SNAPSHOT|snapshot\s*参考|快照参考|根据\s*snapshot|source\s+snapshot\s+shows)/i.test(text);
}
function hasOriginalSourceUrlInSourceBlock(html = "", sourceUrl = "") {
  if (!sourceUrl) return true;
  const escaped = String(sourceUrl).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`<aside\\b[^>]*class=["'][^"']*\\bsource-block\\b[^"']*["'][\\s\\S]*?<a\\b[^>]+href=["']${escaped}["']`, "i");
  return pattern.test(html);
}

function validatePackageAssets(currentVault, packageFiles, operations, errors, warnings) {
  const assetFiles = packageFiles.assetFiles || [];
  const assetByPackagePath = new Map(assetFiles.map((asset) => [asset.packageRelativePath, asset]));
  const referencedPackagePaths = new Set();
  const addNodeIds = new Map();
  operations.forEach((operation) => { if (operation.type === "add_node") addNodeIds.set(operation.id, operation.domain); });

  assetFiles.forEach((asset) => {
    const parsed = nodeForAssetPath(asset.packageRelativePath);
    if (!parsed) { errors.push(`asset ${asset.packageRelativePath}: must be under generated/content/<domain>/<node-id>/assets/.`); return; }
    if (!ALLOWED_ASSET_EXTENSIONS.has(extensionOf(asset.packageRelativePath))) errors.push(`asset ${asset.packageRelativePath}: unsupported asset extension.`);
    if (asset.size > 20 * 1024 * 1024) errors.push(`asset ${asset.packageRelativePath}: asset file too large.`);
    const addedDomain = addNodeIds.get(parsed.nodeId);
    if (addedDomain && addedDomain !== parsed.domain) errors.push(`asset ${asset.packageRelativePath}: domain does not match add_node ${parsed.nodeId}.`);
  });

  operations.forEach((operation) => {
    let nodeId = "";
    let domain = "";
    let refs = [];
    let contextName = operation.type;
    let contentFormat = "markdown";
    if (operation.type === "add_node") {
      nodeId = operation.id;
      domain = operation.domain;
      const format = noteFormatForOperation(operation, packageFiles);
      contentFormat = format;
      if (format === "markdown") refs = markdownAssetReferences(packageFiles.generatedNoteFiles[generatedMarkdownNotePath(operation)] || "");
      else if (format === "html") refs = htmlAssetReferences(packageFiles.generatedHtmlNoteFiles[generatedHtmlNotePath(operation)] || "");
      else return;
      contextName = `add_node ${nodeId}`;
    } else if (operation.type === "append_note_section") {
      nodeId = operation.targetId || operation.id;
      domain = operation.domain || (currentVault.nodes || []).find((node) => node.id === nodeId)?.domain || "";
      refs = markdownAssetReferences(operation.markdown || operation.content || "");
      contextName = `append_note_section ${nodeId}`;
    } else return;

    refs.forEach((reference) => {
      const target = reference.target.trim();
      if (/^javascript:/i.test(target)) { errors.push(`${contextName}: javascript URLs are not allowed in resource attributes.`); return; }
      if (/^data:/i.test(target)) { errors.push(`${contextName}: data URLs are not allowed.`); return; }
      if (/^(https?:)?\/\//i.test(target)) return;
      if (!target.startsWith("assets/")) {
        if (reference.image) errors.push(`${contextName}: image reference "${target}" must use assets/ or a stable original source URL.`);
        return;
      }
      if (contentFormat === "html" && isSourceUrlMediaExtension(target) && !isLocalOriginalSourceAsset(target)) {
        errors.push(`${contextName}: local media "${target}" is not allowed in HTML rich notes unless it is a copied original source asset under assets/original/, assets/source/, assets/source-assets/, or assets/source-snapshot/. AI-generated or re-drawn images/videos are forbidden.`);
        return;
      }
      const result = validateAssetReferencePath(target);
      if (result.error) { errors.push(`${contextName}: ${result.error}`); return; }
      const ownerDomain = domain || addNodeIds.get(nodeId);
      if (!ownerDomain) return;
      const packagePath = `generated/content/${ownerDomain}/${nodeId}/${result.path}`;
      referencedPackagePaths.add(packagePath);
      if (!assetByPackagePath.has(packagePath)) errors.push(`${contextName}: missing packaged asset ${packagePath}.`);
    });
  });

  assetFiles.forEach((asset) => {
    if (isSourceSnapshotPackageAsset(asset.packageRelativePath)) return;
    if (!referencedPackagePaths.has(asset.packageRelativePath)) warnings.push(`asset ${asset.packageRelativePath}: packaged asset is not referenced by generated note content.`);
  });
}

function scanForbiddenFields(value, path = []) {
  if (!value || typeof value !== "object") return "";
  for (const [key, child] of Object.entries(value)) {
    const nextPath = [...path, key];
    if (FORBIDDEN_BLOCK_FIELD_PATTERN.test(nextPath.join("."))) return nextPath.join(".");
    const nested = scanForbiddenFields(child, nextPath);
    if (nested) return nested;
  }
  return "";
}
function validateMarkdownBlocks(markdown, registry, errors, context) {
  FORBIDDEN_MARKDOWN_PATTERNS.forEach(({ pattern, label }) => { if (pattern.test(markdown)) errors.push(`${context}: forbidden ${label}.`); });
  collectBlockTypes(markdown).forEach((type) => { if (isNativeBlockType(type)) return; if (isRegisteredDeclarativeBlockType(type, registry)) return; errors.push(`${context}: unknown content block "${type}".`); });
}

function hasSourceBlock(html = "") {
  return /<aside\b[^>]*class\s*=\s*["'][^"']*\bsource-block\b[^"']*["']/i.test(html);
}
function hasDataSourceAssetReference(html = "") {
  return /\bdata-source-asset\s*=\s*["'][^"']+["']/i.test(html);
}
function hasExternalNetworkReference(html = "") {
  return /\b(?:src|href|poster)\s*=\s*["']https?:\/\//i.test(html);
}
function needsSourceBlock(html = "") {
  return hasDataSourceAssetReference(html) ||
    hasExternalNetworkReference(html) ||
    hasDirectOriginalMedia(html) ||
    hasDirectSnapshotResourceReference(html);
}
function hasDirectOriginalMedia(html = "") {
  return /<\s*(img|video|source|iframe)\b[^>]*(src|href)\s*=\s*["']https?:\/\//i.test(html) ||
    /<\s*(img|video|source|iframe)\b[^>]*(src|href)\s*=\s*["']assets\/(original|source|source-assets|source-snapshot)\//i.test(html);
}
function hasVisibleInteractiveElement(html = "") {
  return /<\s*(canvas|svg|iframe)\b/i.test(html) || /<\s*script\b/i.test(html);
}
function hasReviewQuestionSection(html = "") {
  return /(复习问题|自测|Review\s+Questions?|Self[-\s]?check|Quiz)/i.test(html);
}
function stripTags(value = "") {
  return String(value || "").replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
function validateReviewQuestionAnswers(html = "", errors, warnings, context) {
  if (!hasReviewQuestionSection(html)) return;
  const detailsMatches = [...html.matchAll(/<details\b[\s\S]*?<\/details>/gi)].map((match) => match[0]);
  if (!detailsMatches.length) {
    warnings.push(`${context}: review questions should include answers using <details><summary>question</summary>answer</details>. Bare question lists reduce note quality.`);
    return;
  }
  detailsMatches.forEach((block, index) => {
    if (!/<summary\b[\s\S]*?<\/summary>/i.test(block)) {
      warnings.push(`${context}: review answer block ${index + 1} is missing <summary> for the question.`);
      return;
    }
    const answerText = stripTags(block.replace(/<summary\b[\s\S]*?<\/summary>/i, ""));
    if (answerText.length < 40) {
      warnings.push(`${context}: review answer block ${index + 1} has no substantive answer.`);
    }
  });
  if (/<ol\b[\s\S]*?<li\b[\s\S]*?<\/ol>/i.test(html) && /复习问题|Review\s+Questions?/i.test(html)) {
    warnings.push(`${context}: review section appears to contain a bare ordered list. Prefer one <details class="rich-qa"> per question.`);
  }
}
function htmlSourceAssetIds(html = "") {
  const ids = new Set();
  const pattern = /\bdata-source-asset\s*=\s*["']([^"']+)["']/gi;
  let match;
  while ((match = pattern.exec(html))) ids.add(match[1]);
  return ids;
}
function extractFirstYamlFence(markdown = "") {
  const match = String(markdown || "").match(/```ya?ml\s*([\s\S]*?)```/i);
  return match ? match[1].trim() : "";
}
function sourceAssetManifest(packageFiles) {
  const raw = packageFiles.reviewFiles?.["review/source-asset-manifest.md"] || "";
  const yaml = extractFirstYamlFence(raw);
  if (!yaml) return [];
  try {
    const parsed = parseYaml(yaml, "review/source-asset-manifest.md");
    return asArray(parsed.source_assets || parsed.sourceAssets);
  } catch {
    return [];
  }
}
function noteOperationById(operations = []) {
  const result = new Map();
  operations.forEach((operation) => {
    if (operation.type === "add_node") result.set(operation.id, operation);
  });
  return result;
}

function normalizeAssetNoteId(asset = {}) {
  const explicit =
    asset.represented_in_node ||
    asset.representedInNode ||
    asset.note_id ||
    asset.noteId ||
    asset.node_id ||
    asset.nodeId ||
    "";
  if (String(explicit || "").trim()) return String(explicit).trim();

  const location = asset.note_location || asset.noteLocation || "";
  const firstSegment = String(location || "").split("/")[0].trim();
  if (firstSegment && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(firstSegment)) return firstSegment;

  return "";
}

function hasDirectOriginalMediaForAsset(html = "", asset = {}) {
  const sourceUrl = String(asset.source_url || asset.sourceUrl || "").trim();
  const originMatch = sourceUrl.match(/^https?:\/\/[^\/]+/i);
  const origin = originMatch ? originMatch[0].replace(/[.*+?^${}()|[\]\\]/g, "\\$&") : "https?:\\/\\/";
  const mediaPattern = new RegExp(`<\\s*(img|video|source|iframe)\\b[^>]+(?:src|poster)\\s*=\\s*["']${origin}[^"']+["']`, "i");
  return mediaPattern.test(html) ||
    /<\s*(img|video|source|iframe)\b[^>]*(src|poster)\s*=\s*["']assets\/(original|source|source-assets|source-snapshot)\//i.test(html);
}
function validateSourceAssetCoverage(packageFiles, operations, errors, warnings) {
  const htmlOperations = operations.filter((operation) => operation.type === "add_node" && noteFormatForOperation(operation, packageFiles) === "html");
  if (!htmlOperations.length) return;

  const assets = sourceAssetManifest(packageFiles);
  if (!assets.length) {
    warnings.push("review/source-asset-manifest.md: no parseable source_assets list found for HTML source-first notes.");
    return;
  }

  const opsById = noteOperationById(operations);
  const htmlByNodeId = new Map();
  htmlOperations.forEach((operation) => {
    htmlByNodeId.set(operation.id, packageFiles.generatedHtmlNoteFiles[generatedHtmlNotePath(operation)] || "");
  });

  assets.forEach((asset) => {
    const id = asset?.id || "";
    if (!id || asset.required !== true) return;
    const noteId = normalizeAssetNoteId(asset);
    const html = htmlByNodeId.get(noteId) || "";
    if (!html) {
      warnings.push(`source asset ${id}: required asset points to note "${noteId}", but that HTML note was not found.`);
      return;
    }

    const type = String(asset.type || "").toLowerCase();
    const strategy = String(asset.preservation_strategy || asset.preservationStrategy || "").toLowerCase();
    const unavailableReason = String(asset.unavailable_reason || asset.unavailableReason || asset.embedding_blocked_reason || asset.embeddingBlockedReason || "").trim();
    const snapshotPath = String(asset.snapshot_path || asset.snapshotPath || "").trim();
    const snapshotAssetsUsed = asArray(asset.snapshot_assets_used || asset.snapshotAssetsUsed);
    const snapshotBackedAsset = Boolean(snapshotPath || snapshotAssetsUsed.length || /snapshot/.test(strategy));

    const representedIds = htmlSourceAssetIds(html);
    if (!isSourceSnapshotLibraryAsset(asset) && !representedIds.has(id)) {
      warnings.push(`source asset ${id}: required asset/demo should be marked in note.html with data-source-asset="${id}".`);
    }

    if (isSourceSnapshotLibraryAsset(asset)) {
      return;
    }

    if (["image", "video", "animation"].includes(type) && !hasDirectOriginalMediaForAsset(html, asset) && !unavailableReason) {
      warnings.push(`source asset ${id}: ${type} assets should be represented by direct original source media URL or local copied original/snapshot media when possible. If unavailable, add unavailable_reason in source-asset-manifest.md.`);
    }

    if (type === "interactive-demo") {
      const hasOriginalEmbed = hasDirectOriginalMediaForAsset(html, asset);
      const hasSupplement = /<\s*(canvas|svg)\b/i.test(html);
      const noteUsesSnapshotResources = hasDirectSnapshotResourceReference(html);
      if (snapshotBackedAsset) {
        if (!/(source-ported|ported|original|snapshot-assets|source-snapshot-assets)/.test(strategy)) {
          warnings.push(`source asset ${id}: snapshot-backed interactive demos should use preservation_strategy "source-snapshot-assets + source-ported-interaction".`);
        }
        if (/direct-js-reimplementation/.test(strategy) && !/source-ported|ported/.test(strategy)) {
          warnings.push(`source asset ${id}: preservation_strategy "${strategy}" is ambiguous and often means an AI-created approximation. Prefer "source-snapshot-assets + source-ported-interaction" and list ported_original_controls/ported_original_behavior.`);
        }
        if (snapshotAssetsUsed.length && !noteUsesSnapshotResources) {
          warnings.push(`source asset ${id}: source-asset-manifest lists snapshot_assets_used, but note.html does not reference concrete assets/source-snapshot/<source-id>/_resources/ paths. This suggests the demo was recreated from scratch instead of using snapshot assets.`);
        }
        return;
      }

      if (!hasOriginalEmbed && !unavailableReason) {
        warnings.push(`source asset ${id}: interactive demos need an original source iframe/media embed when possible. Source links and AI-authored canvas/svg demos are supplementary only; add unavailable_reason if original embedding is impossible.`);
      }
      if (/source-link/.test(strategy) && /js-reproduction/.test(strategy) && !hasOriginalEmbed) {
        warnings.push(`source asset ${id}: preservation_strategy "${strategy}" is not sufficient for source-first quality. Prefer direct original media/embed, source snapshot assets, or mark embedding as unavailable with a reason.`);
      }
      if (/source-link/.test(strategy) && !hasSupplement && !hasOriginalEmbed) {
        warnings.push(`source asset ${id}: interactive demo is only linked and has no original embed or supplementary canvas/svg representation in the note.`);
      }
    }
  });
}

function validateHtmlNote(html, errors, warnings, context) {
  FORBIDDEN_HTML_PATTERNS.forEach(({ pattern, label }) => { if (pattern.test(html)) errors.push(`${context}: forbidden ${label}.`); });
  const snapshotBacked = /assets\/source-snapshot\//i.test(html);
  if (needsSourceBlock(html) && !hasSourceBlock(html)) {
    warnings.push(`${context}: source/network material is referenced, but no nearby <aside class="source-block"> source attribution was found.`);
  }
  if (hasForbiddenSnapshotLearnerText(html)) {
    errors.push(`${context}: learner-facing prose must not refer to "snapshot" or "原始 SNAPSHOT". Use the original source URL in source blocks and teach the concept directly.`);
  }
  if (hasSnapshotIframe(html)) {
    errors.push(`${context}: whole source-snapshot iframe is not allowed as final note content. Use snapshot _resources and source-ported HTML/CSS/JS interactions directly in note.html.`);
  }
  if (snapshotBacked && !hasDirectSnapshotResourceReference(html)) {
    warnings.push(`${context}: source snapshot is present but note.html does not directly reference assets/source-snapshot/<source-id>/_resources/. This usually means the interaction was recreated from scratch instead of using source snapshot assets.`);
  }
  if (!hasVisibleInteractiveElement(html)) warnings.push(`${context}: HTML rich note has no visible interactive element. Interactive/tutorial sources should preserve or reproduce important demos.`);
  validateReviewQuestionAnswers(html, errors, warnings, context);
}
function packageBlockRegistry(currentVault, packageFiles) {
  const packageBlockTypes = normalizeBlockTypes(packageFiles.blockTypeFiles || {});
  return { native: getBlockRegistry(currentVault).native, declarative: { ...(currentVault.blockTypes || {}), ...packageBlockTypes.definitions }, errors: packageBlockTypes.errors, warnings: packageBlockTypes.warnings, packageDefinitions: packageBlockTypes.definitions };
}
function validateManifest(packageFiles, errors) {
  const manifest = packageFiles.manifest || {};
  const schemaVersion = normalizeSchemaVersion(manifest.schemaVersion);
  if (schemaVersion !== "1.1") errors.push("manifest.yaml: schemaVersion must be 1.1.");
  if (!manifest.packageId) errors.push("manifest.yaml: packageId is required.");
  if (manifest.packageId && !PACKAGE_ID_PATTERN.test(manifest.packageId)) errors.push(`manifest.yaml: packageId "${manifest.packageId}" must match ${PACKAGE_ID_PATTERN}.`);
  if (manifest.packageId && manifest.packageId !== packageFiles.packageId) errors.push(`manifest.yaml: packageId "${manifest.packageId}" must match directory name "${packageFiles.packageId}".`);
  if (packageFiles.packageFormat === "wawapkg") { if (manifest.packageFormat !== "wawapkg") errors.push("manifest.yaml: packageFormat must be wawapkg."); if (!["import", "ai-import"].includes(manifest.packageKind)) errors.push("manifest.yaml: packageKind must be import."); }
  if (!manifest.status) errors.push("manifest.yaml: status is required.");
  if (manifest.preview?.mode !== "in-app") errors.push("manifest.yaml: preview.mode must be in-app.");
  if (manifest.preview?.generatedHtmlPreview !== false) errors.push("manifest.yaml: preview.generatedHtmlPreview must be false.");
  return { ...manifest, schemaVersion };
}
function validateSources(packageFiles, warnings) {
  const sources = packageFiles.sources || {};
  const sourceList = asArray(sources.sources);
  if (!sourceList.length) { warnings.push("sources.yaml: sources array is missing or empty."); return; }
  const ids = new Set();
  sourceList.forEach((source) => {
    if (!source?.id) return;
    if (ids.has(source.id)) warnings.push(`sources.yaml: duplicate source id "${source.id}".`);
    ids.add(source.id);
  });
}
function packageHasHtmlNotes(operations, packageFiles) {
  return operations.some((operation) => operation.type === "add_node" && noteFormatForOperation(operation, packageFiles) === "html");
}
function validateHtmlReviewFiles(packageFiles, operations, errors) {
  if (!packageHasHtmlNotes(operations, packageFiles)) return;
  HTML_REQUIRED_REVIEW_FILES.forEach((filePath) => {
    if (!packageFiles.reviewFiles?.[filePath]) errors.push(`${filePath}: required for HTML rich notes with source-first interactive rules.`);
  });
}

function validateAddNode(operation, context) {
  const { currentVault, packageFiles, registry, createdNodes, createdDomains, createdIds, errors, warnings } = context;
  const currentNodeIds = new Set((currentVault.nodes || []).map((node) => node.id));
  const domainIds = new Set([...(currentVault.domains || []).map((domain) => domain.id), ...createdDomains.map((domain) => domain.id)]);
  const nodes = nodeMap(currentVault, createdNodes, createdDomains);
  const format = noteFormatForOperation(operation, packageFiles);

  if (!KEBAB_PATTERN.test(operation.id || "")) errors.push(`add_node: id "${operation.id || ""}" must be lowercase kebab-case.`);
  if (currentNodeIds.has(operation.id)) errors.push(`add_node ${operation.id}: node already exists.`);
  if (createdIds.has(operation.id)) errors.push(`add_node ${operation.id}: duplicate node in package.`);
  if (!operation.title) errors.push(`add_node ${operation.id}: title is required.`);
  if (!domainIds.has(operation.domain)) errors.push(`add_node ${operation.id}: domain "${operation.domain}" does not exist.`);
  if (!isAllowedKnowledgeType(operation.nodeType)) errors.push(`add_node ${operation.id}: type "${operation.nodeType}" is not allowed.`);
  if (!isAllowedKnowledgeStatus(operation.status)) errors.push(`add_node ${operation.id}: status "${operation.status}" is not allowed.`);
  if (!nodes.has(operation.parentId)) errors.push(`add_node ${operation.id}: parentId "${operation.parentId}" does not exist.`);
  if (!CONTENT_FORMATS.has(format)) errors.push(`add_node ${operation.id}: contentFormat must be markdown, html, or none.`);

  const parentNode = nodes.get(operation.parentId);
  if (parentNode && operation.domain && parentNode.type === "domain" && parentNode.id !== operation.domain) errors.push(`add_node ${operation.id}: domain parent must match node domain.`);
  if (parentNode && operation.domain && parentNode.type !== "domain" && parentNode.domain !== operation.domain) errors.push(`add_node ${operation.id}: parent must belong to the same domain.`);

  const metaPath = generatedMetaPath(operation);
  const metaRaw = packageFiles.generatedMetaFiles[metaPath];
  if (!metaRaw) errors.push(`add_node ${operation.id}: missing ${metaPath}.`);
  if (format === "markdown" && !packageFiles.generatedNoteFiles[generatedMarkdownNotePath(operation)]) errors.push(`add_node ${operation.id}: missing ${generatedMarkdownNotePath(operation)}.`);
  if (format === "html" && !packageFiles.generatedHtmlNoteFiles[generatedHtmlNotePath(operation)]) errors.push(`add_node ${operation.id}: missing ${generatedHtmlNotePath(operation)}.`);
  if (format === "markdown" && packageFiles.generatedNoteFiles[generatedMarkdownNotePath(operation)]) validateMarkdownBlocks(packageFiles.generatedNoteFiles[generatedMarkdownNotePath(operation)], registry, errors, `add_node ${operation.id} note.md`);
  if (format === "html" && packageFiles.generatedHtmlNoteFiles[generatedHtmlNotePath(operation)]) validateHtmlNote(packageFiles.generatedHtmlNoteFiles[generatedHtmlNotePath(operation)], errors, warnings, `add_node ${operation.id} note.html`);
  if (metaRaw) {
    const meta = parseYaml(metaRaw, metaPath);
    if (meta.id !== operation.id) errors.push(`add_node ${operation.id}: generated meta id does not match patch.`);
    if (meta.domain !== operation.domain) errors.push(`add_node ${operation.id}: generated meta domain does not match patch.`);
    if (meta.title !== operation.title) errors.push(`add_node ${operation.id}: generated meta title does not match patch.`);
    const metaTitleLocale = meta.titleLocale || meta.title_locale || "";
    if ((metaTitleLocale || operation.titleLocale) && metaTitleLocale !== operation.titleLocale) errors.push(`add_node ${operation.id}: generated meta titleLocale does not match patch.`);
    if (meta.type !== operation.nodeType) errors.push(`add_node ${operation.id}: generated meta type does not match patch.`);
    if (meta.status !== operation.status) errors.push(`add_node ${operation.id}: generated meta status does not match patch.`);
    const metaFormat = normalizeContentFormat(meta.contentFormat || meta.content_format || "");
    if (metaFormat && metaFormat !== format) errors.push(`add_node ${operation.id}: generated meta contentFormat does not match note file type.`);
    const forbidden = scanForbiddenFields(meta);
    if (forbidden) errors.push(`add_node ${operation.id}: generated meta contains forbidden field "${forbidden}".`);
  }
  potentialDuplicateNodeWarnings(currentVault, operation, createdNodes).forEach((warning) => warnings.push(`add_node ${operation.id}: ${warning}`));
  createdIds.add(operation.id);
  createdNodes.push({ id: operation.id, title: operation.title, titleLocale: operation.titleLocale, aliases: operation.aliases || [], domain: operation.domain, type: operation.nodeType, status: operation.status, summary: operation.summary || "", summaryLocale: operation.summaryLocale || "", contentFormat: format });
}

function validateAppendNoteSection(operation, context) {
  const { currentVault, registry, createdNodes, createdDomains, errors, warnings } = context;
  const nodes = nodeMap(currentVault, createdNodes, createdDomains);
  const targetId = operation.targetId || operation.id;
  const insertMode = operation.insertMode || "end";
  const markdown = operation.markdown || operation.content || "";
  if (!nodes.has(targetId)) errors.push(`append_note_section: targetId "${targetId}" does not exist.`);
  if (!SUPPORTED_INSERT_MODES.has(insertMode)) errors.push(`append_note_section ${targetId}: unsupported insertMode "${insertMode}".`);
  if (insertMode !== "end" && !operation.headingSelector) errors.push(`append_note_section ${targetId}: headingSelector is required for heading insert modes.`);
  const currentNote = currentVault.notes?.[targetId]?.markdown || "";
  if (!currentNote && !(createdNodes || []).some((node) => node.id === targetId)) errors.push(`append_note_section ${targetId}: target markdown note does not exist.`);
  if (insertMode !== "end" && currentNote && !noteHeadingExists(currentNote, operation.headingSelector)) errors.push(`append_note_section ${targetId}: headingSelector "${operation.headingSelector}" was not found.`);
  const heading = insertedHeading(markdown);
  if (heading && currentNote && noteHeadingExists(currentNote, heading)) warnings.push(`append_note_section ${targetId}: inserted heading "${heading}" may duplicate an existing heading.`);
  validateMarkdownBlocks(markdown, registry, errors, `append_note_section ${targetId}`);
}

function comparableProblem(problem = {}) {
  return JSON.stringify({
    id: problem.id,
    mode: problem.mode,
    type: problem.type,
    difficulty: problem.difficulty,
    title: problem.title,
    prompt: problem.prompt,
    hints: problem.hints || [],
    answer: problem.answer,
    solution: problem.solution,
  });
}

function validateExerciseProblem(problem, index, seenIds, errors, contextName) {
  if (!problem || Array.isArray(problem) || typeof problem !== "object") {
    errors.push(`${contextName}: problem at index ${index} must be an object.`);
    return null;
  }
  const id = String(problem.id || "").trim();
  if (!id) errors.push(`${contextName}: problem at index ${index} is missing id.`);
  if (id && seenIds.has(id)) errors.push(`${contextName}: duplicate problem id "${id}".`);
  if (id) seenIds.add(id);
  const mode = String(problem.mode || "").trim();
  const type = String(problem.type || "conceptual").trim();
  const difficulty = String(problem.difficulty || "undergraduate").trim();
  if (!mode) errors.push(`${contextName}: problem "${id || index}" is missing mode.`);
  if (mode && !EXERCISE_MODES.includes(mode)) errors.push(`${contextName}: problem "${id}" has unsupported mode "${mode}".`);
  if (!EXERCISE_TYPES.includes(type)) errors.push(`${contextName}: problem "${id}" has unsupported type "${type}".`);
  if (type === "diagnostic" && mode !== "practice") errors.push(`${contextName}: diagnostic problem "${id}" must use mode "practice".`);
  if (type !== "conceptual" && mode === "recall") errors.push(`${contextName}: problem "${id}" type "${type}" must use mode "practice".`);
  if (!EXERCISE_DIFFICULTIES.includes(difficulty)) errors.push(`${contextName}: problem "${id}" has unsupported difficulty "${difficulty}".`);
  ["title", "prompt", "answer", "solution"].forEach((field) => {
    if (!String(problem[field] || "").trim()) errors.push(`${contextName}: problem "${id || index}" is missing ${field}.`);
  });
  if (["mistakeTags", "errorCategory", "weaknessCategory", "aiJudgement", "attempts", "accuracy", "attemptsLog", "mastery", "ease", "interval"].some((field) => Object.prototype.hasOwnProperty.call(problem, field))) {
    errors.push(`${contextName}: problem "${id || index}" contains runtime/progress fields that do not belong in ExerciseSet files.`);
  }
  return {
    id,
    mode,
    type,
    difficulty,
    title: String(problem.title || ""),
    prompt: String(problem.prompt || ""),
    hints: Array.isArray(problem.hints) ? problem.hints.map((hint) => String(hint || "")).filter(Boolean) : [],
    answer: String(problem.answer || ""),
    solution: String(problem.solution || ""),
  };
}

function validateAppendExerciseSet(operation, context) {
  const { currentVault, packageFiles, createdNodes, createdDomains, packageExerciseProblems, errors } = context;
  const nodes = nodeMap(currentVault, createdNodes, createdDomains);
  const targetId = operation.targetId || operation.id;
  const owner = nodes.get(targetId);
  const domain = operation.domain || owner?.domain || "";
  if (!targetId) errors.push("append_exercise_set: targetId is required.");
  if (!owner) errors.push(`append_exercise_set: targetId "${targetId}" does not exist.`);
  if (owner?.type === "domain") errors.push(`append_exercise_set ${targetId}: ExerciseSet owner must be a non-domain node.`);
  if (!domain) errors.push(`append_exercise_set ${targetId}: domain is required or must be inferable from the owner node.`);
  operation.domain = domain;

  const exercisePath = generatedExercisePath({ ...operation, domain, targetId });
  const raw = packageFiles.generatedExerciseFiles?.[exercisePath];
  if (!raw) {
    errors.push(`append_exercise_set ${targetId}: missing ${exercisePath}.`);
    return;
  }

  let parsed = null;
  try {
    parsed = parseYaml(raw, exercisePath);
  } catch (error) {
    errors.push(`append_exercise_set ${targetId}: ${error.message}`);
    return;
  }
  if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
    errors.push(`append_exercise_set ${targetId}: exercises.yaml must contain a YAML object.`);
    return;
  }
  if (parsed.nodeId && parsed.nodeId !== targetId) errors.push(`append_exercise_set ${targetId}: exercises.yaml nodeId "${parsed.nodeId}" does not match targetId.`);
  if (!Array.isArray(parsed.problems) || !parsed.problems.length) {
    errors.push(`append_exercise_set ${targetId}: problems must be a non-empty array.`);
    return;
  }

  const seenIds = new Set();
  const incomingProblems = parsed.problems
    .map((problem, index) => validateExerciseProblem(problem, index, seenIds, errors, `append_exercise_set ${targetId}`))
    .filter(Boolean);
  const existingProblems = currentVault.exercises?.byNodeId?.[targetId]?.problems || [];
  const existingById = new Map(existingProblems.map((problem) => [problem.id, problem]));
  const packageIds = packageExerciseProblems.get(targetId) || new Map();
  incomingProblems.forEach((problem) => {
    const existing = existingById.get(problem.id);
    if (existing && comparableProblem(existing) !== comparableProblem(problem)) {
      errors.push(`append_exercise_set ${targetId}: problem id "${problem.id}" conflicts with an existing ExerciseSet problem.`);
    }
    if (packageIds.has(problem.id) && comparableProblem(packageIds.get(problem.id)) !== comparableProblem(problem)) {
      errors.push(`append_exercise_set ${targetId}: problem id "${problem.id}" appears multiple times in this package with different content.`);
    }
    packageIds.set(problem.id, problem);
  });
  packageExerciseProblems.set(targetId, packageIds);
}
function validateAddEdge(operation, context) {
  const { currentVault, createdNodes, createdDomains, packageEdges, errors } = context;
  const nodes = nodeMap(currentVault, createdNodes, createdDomains);
  const relation = operation.relation;
  const from = operation.from;
  const to = operation.to;
  const edgeId = `${from}-${relation}-${to}`;
  if (operation.nestedEdgeObject) {
    errors.push(`add_edge ${edgeId}: nested edge objects are not allowed. Use flat fields: type, from, to, relation, reason.`);
  }
  if (!operation.from || !operation.to || !operation.relation) {
    errors.push(`add_edge ${edgeId}: must use flat top-level fields "from", "to", and "relation".`);
  }
  if (!nodes.has(from)) errors.push(`add_edge ${edgeId}: from "${from}" does not exist.`);
  if (!nodes.has(to)) errors.push(`add_edge ${edgeId}: to "${to}" does not exist.`);
  if (from === to) errors.push(`add_edge ${edgeId}: from and to must be different.`);
  if (relation === "contains") errors.push(`add_edge ${edgeId}: contains is not allowed in add_edge.`);
  if (!LINK_RELATIONS.has(relation)) errors.push(`add_edge ${edgeId}: relation "${relation}" is not allowed.`);
  const existingEdges = currentVault.edges || [];
  if (existingEdges.some((edge) => edge.id === edgeId)) errors.push(`add_edge ${edgeId}: edge already exists.`);
  if (existingEdges.some((edge) => edge.from === from && edge.to === to && edge.relation === relation)) errors.push(`add_edge ${edgeId}: duplicate existing edge.`);
  if (relation === "compares-with" && existingEdges.some((edge) => edge.from === to && edge.to === from && edge.relation === relation)) errors.push(`add_edge ${edgeId}: reverse compares-with edge already exists.`);
  if (packageEdges.has(edgeId)) errors.push(`add_edge ${edgeId}: duplicate package edge.`);
  packageEdges.add(edgeId);
}
function validateAddDomain(operation, context) {
  const { currentVault, createdDomains, createdDomainIds, errors, warnings } = context;
  const currentDomainIds = new Set((currentVault.domains || []).map((domain) => domain.id));
  const currentDomainTitles = new Set((currentVault.domains || []).map((domain) => String(domain.title || "").trim().toLowerCase()).filter(Boolean));
  if (!KEBAB_PATTERN.test(operation.id || "")) errors.push(`add_domain: id "${operation.id || ""}" must be lowercase kebab-case.`);
  if (currentDomainIds.has(operation.id)) errors.push(`add_domain ${operation.id}: domain already exists.`);
  if (createdDomainIds.has(operation.id)) errors.push(`add_domain ${operation.id}: duplicate domain in package.`);
  if (!operation.title) errors.push(`add_domain ${operation.id}: title is required.`);
  if (operation.color && !/^#[0-9a-f]{6}$/i.test(operation.color)) errors.push(`add_domain ${operation.id}: color must be a hex color like #00B7FF.`);
  if (operation.order !== undefined && typeof operation.order !== "number") errors.push(`add_domain ${operation.id}: order must be a number.`);
  if (operation.aliases?.length) warnings.push(`add_domain ${operation.id}: aliases are not stored by the current domain schema.`);
  const titleKey = String(operation.title || "").trim().toLowerCase();
  if (titleKey && currentDomainTitles.has(titleKey)) warnings.push(`add_domain ${operation.id}: domain title duplicates an existing domain title.`);
  if (titleKey && createdDomains.some((domain) => String(domain.title || "").trim().toLowerCase() === titleKey)) warnings.push(`add_domain ${operation.id}: domain title duplicates another package domain title.`);
  createdDomainIds.add(operation.id);
  createdDomains.push({ id: operation.id, title: operation.title, titleLocale: operation.titleLocale, description: operation.description || "", descriptionLocale: operation.descriptionLocale || "", color: operation.color || "", order: operation.order });
}
function validateAddBlockType(operation, context) {
  const { currentVault, packageFiles, registry, errors } = context;
  const type = operation.typeName;
  if (!KEBAB_PATTERN.test(type || "")) errors.push(`add_block_type: type "${type || ""}" must be kebab-case.`);
  if (isNativeBlockType(type)) errors.push(`add_block_type ${type}: cannot collide with native block type.`);
  if (currentVault.blockTypes?.[type]) errors.push(`add_block_type ${type}: custom block type already exists.`);
  if (!packageFiles.blockTypeFiles[operation.file]) errors.push(`add_block_type ${type}: missing ${operation.file}.`);
  if (!registry.packageDefinitions?.[type]) errors.push(`add_block_type ${type}: no valid package block type definition found.`);
}
function validateProposeNativeBlock(operation, context) {
  const { reviewItems, errors } = context;
  if (!KEBAB_PATTERN.test(operation.blockType || operation.typeName || operation.name || "")) errors.push("propose_native_block: proposed type must be kebab-case.");
  if (operation.importMode !== "proposal-only") errors.push("propose_native_block: importMode must be proposal-only.");
  reviewItems.push({ type: "propose_native_block", title: operation.blockType || operation.typeName || operation.name || "native-block-proposal", message: operation.reason || "Native block proposal requires human review." });
}

export function validateAiPackage(currentVault, packageFilesOrRoot) {
  if (typeof packageFilesOrRoot === "string") throw new Error("validateAiPackage expects parsed package files. Use readAiPackage in Node CLI code first.");
  const packageFiles = packageFilesOrRoot;
  const errors = [];
  const warnings = [];
  const reviewItems = [];
  const manifest = validateManifest(packageFiles, errors);
  validateSources(packageFiles, warnings);
  const registry = packageBlockRegistry(currentVault, packageFiles);
  registry.errors.forEach((error) => errors.push(error));
  registry.warnings.forEach((warning) => warnings.push(warning));
  const operations = operationsFromPatch(packageFiles.patch);
  const normalizedOperations = [];
  const createdDomains = [];
  const createdDomainIds = new Set();
  const createdNodes = [];
  const createdIds = new Set();
  const packageEdges = new Set();
  const packageExerciseProblems = new Map();
  if (!operations.length) warnings.push("patch.yaml: no operations found.");
  const context = { currentVault, packageFiles, registry, createdDomains, createdDomainIds, createdNodes, createdIds, packageEdges, packageExerciseProblems, errors, warnings, reviewItems };
  operations.forEach((operation, index) => {
    if (!OPERATION_TYPES.has(operation.type)) { errors.push(`operation ${index + 1}: unsupported operation type "${operation.type}".`); return; }
    normalizedOperations.push(operation);
    if (operation.type === "add_domain") validateAddDomain(operation, context);
    if (operation.type === "add_node") validateAddNode(operation, context);
    if (operation.type === "append_note_section") validateAppendNoteSection(operation, context);
    if (operation.type === "append_exercise_set") validateAppendExerciseSet(operation, context);
    if (operation.type === "add_edge") validateAddEdge(operation, context);
    if (operation.type === "add_block_type") validateAddBlockType(operation, context);
    if (operation.type === "propose_native_block") validateProposeNativeBlock(operation, context);
  });
  validateHtmlReviewFiles(packageFiles, normalizedOperations, errors);
  validateSourceAssetCoverage(packageFiles, normalizedOperations, errors, warnings);
  validatePackageAssets(currentVault, packageFiles, normalizedOperations, errors, warnings);
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    reviewItems,
    normalizedOperations,
    previewModel: { packageId: manifest.packageId || packageFiles.packageId, status: manifest.status || "", schemaVersion: manifest.schemaVersion || "", packageFormat: packageFiles.packageFormat || manifest.packageFormat || "", operationCount: normalizedOperations.length, domainsToAdd: createdDomains.length, packageBlockTypes: Object.keys(registry.packageDefinitions || {}) },
    packageFiles,
    blockRegistry: registry,
  };
}
