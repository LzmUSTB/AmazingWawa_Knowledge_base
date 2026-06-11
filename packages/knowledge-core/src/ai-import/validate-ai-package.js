import { parseYaml } from "../parse-yaml.js";
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
const OPERATION_TYPES = new Set(["add_domain", "add_node", "append_note_section", "add_edge", "add_block_type", "propose_native_block"]);
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
  { pattern: /<\s*script\b/i, label: "script tag" },
  { pattern: /<\s*iframe\b/i, label: "iframe tag" },
  { pattern: /<\s*object\b/i, label: "object tag" },
  { pattern: /<\s*embed\b/i, label: "embed tag" },
  { pattern: /<\s*link\b/i, label: "link tag" },
  { pattern: /<\s*style\b/i, label: "style tag" },
  { pattern: /\son[a-z]+\s*=/i, label: "inline event handler" },
  { pattern: /\sstyle\s*=/i, label: "inline style" },
  { pattern: /javascript\s*:/i, label: "javascript URL" },
  { pattern: /data\s*:/i, label: "data URL" },
];
const ALLOWED_ASSET_EXTENSIONS = new Set([
  ".csv", ".gif", ".jpeg", ".jpg", ".json", ".md", ".mp3", ".mp4", ".pdf", ".png", ".txt", ".wav", ".webm", ".webp", ".yaml", ".yml",
]);

function asArray(value) { return Array.isArray(value) ? value : value ? [value] : []; }
function normalizeSchemaVersion(value) { if (value === 1.1 || value === "1.1") return "1.1"; return String(value || ""); }
function normalizeContentFormat(value = "") { const format = String(value || "").trim().toLowerCase(); return CONTENT_FORMATS.has(format) ? format : ""; }
function operationsFromPatch(patch = {}) { return asArray(patch.operations || patch.changes || patch.patch).map(normalizeOperation); }

function normalizeOperation(operation = {}) {
  const node = operation.node || operation;
  if (operation.type === "add_domain") {
    const domain = operation.domain || operation;
    return { ...operation, id: domain.id, title: domain.title, description: domain.description || "", color: domain.color || "", order: domain.order, aliases: domain.aliases || [] };
  }
  if (operation.type === "add_node") {
    return {
      ...operation,
      id: node.id,
      title: node.title,
      aliases: node.aliases || [],
      domain: node.domain,
      nodeType: node.type || operation.nodeType,
      status: node.status,
      summary: node.summary || operation.summary || "",
      parentId: operation.parentId || node.parentId,
      contentFormat: normalizeContentFormat(node.contentFormat || node.content_format || operation.contentFormat || operation.content_format),
    };
  }
  if (operation.type === "add_edge") return { ...operation, from: operation.from || operation.source, to: operation.to || operation.target };
  if (operation.type === "add_block_type") {
    return { ...operation, typeName: operation.blockType || operation.block_type || operation.name || operation.id, file: operation.file || `block-types/${operation.blockType || operation.block_type || operation.name || operation.id}.yaml` };
  }
  return operation;
}

function nodeMap(currentVault, createdNodes = [], createdDomains = []) {
  const domainNodes = createdDomains.map((domain) => ({ id: domain.id, title: domain.title, domain: domain.id, type: "domain", status: "domain", summary: domain.description || "" }));
  return new Map([...(currentVault.nodes || []), ...domainNodes, ...createdNodes].map((node) => [node.id, node]));
}
function generatedMetaPath(operation) { return `generated/content/${operation.domain}/${operation.id}/meta.yaml`; }
function generatedMarkdownNotePath(operation) { return `generated/content/${operation.domain}/${operation.id}/note.md`; }
function generatedHtmlNotePath(operation) { return `generated/content/${operation.domain}/${operation.id}/note.html`; }
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
function extensionOf(path = "") { const fileName = path.split("/").pop() || ""; const dotIndex = fileName.lastIndexOf("."); return dotIndex >= 0 ? fileName.slice(dotIndex).toLowerCase() : ""; }
function nodeForAssetPath(path = "") { const match = path.match(/^generated\/content\/([^/]+)\/([^/]+)\/assets\/(.+)$/); return match ? { domain: match[1], nodeId: match[2], assetPath: match[3] } : null; }

function markdownAssetReferences(markdown = "") {
  const refs = [];
  const linkPattern = /(!?)\[([^\]]*)\]\(([^)\s]+)(?:\s+["'][^)]*)?\)/g;
  let match;
  while ((match = linkPattern.exec(markdown))) refs.push({ image: match[1] === "!", label: match[2] || "", target: match[3] || "" });
  return refs;
}
function htmlAssetReferences(html = "") {
  const refs = [];
  const attrPattern = /\b(src|href)\s*=\s*["']([^"']+)["']/gi;
  let match;
  while ((match = attrPattern.exec(html))) refs.push({ attr: match[1].toLowerCase(), target: match[2] || "" });
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
    let content = "";
    let refs = [];
    let contextName = operation.type;
    if (operation.type === "add_node") {
      nodeId = operation.id;
      domain = operation.domain;
      const format = noteFormatForOperation(operation, packageFiles);
      if (format === "markdown") {
        content = packageFiles.generatedNoteFiles[generatedMarkdownNotePath(operation)] || "";
        refs = markdownAssetReferences(content);
      } else if (format === "html") {
        content = packageFiles.generatedHtmlNoteFiles[generatedHtmlNotePath(operation)] || "";
        refs = htmlAssetReferences(content);
      } else return;
      contextName = `add_node ${nodeId}`;
    } else if (operation.type === "append_note_section") {
      nodeId = operation.targetId || operation.id;
      domain = operation.domain || (currentVault.nodes || []).find((node) => node.id === nodeId)?.domain || "";
      content = operation.markdown || operation.content || "";
      refs = markdownAssetReferences(content);
      contextName = `append_note_section ${nodeId}`;
    } else return;

    refs.forEach((reference) => {
      const target = reference.target.trim();
      if (/^(https?:)?\/\//i.test(target)) return;
      if (/^data:/i.test(target)) { errors.push(`${contextName}: data URLs are not allowed.`); return; }
      if (!target.startsWith("assets/")) {
        if (reference.image) errors.push(`${contextName}: image reference "${target}" must use assets/.`);
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

  assetFiles.forEach((asset) => { if (!referencedPackagePaths.has(asset.packageRelativePath)) warnings.push(`asset ${asset.packageRelativePath}: packaged asset is not referenced by generated note content.`); });
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
function validateHtmlNote(html, errors, context) {
  FORBIDDEN_HTML_PATTERNS.forEach(({ pattern, label }) => { if (pattern.test(html)) errors.push(`${context}: forbidden ${label}.`); });
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
  sourceList.forEach((source) => { if (!source?.id) return; if (ids.has(source.id)) warnings.push(`sources.yaml: duplicate source id "${source.id}".`); ids.add(source.id); if (source.fullContentRequired === true || source.requiresFullContent === true) warnings.push(`sources.yaml: source "${source.id}" should not require full source content.`); });
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
  if (format === "html" && packageFiles.generatedHtmlNoteFiles[generatedHtmlNotePath(operation)]) validateHtmlNote(packageFiles.generatedHtmlNoteFiles[generatedHtmlNotePath(operation)], errors, `add_node ${operation.id} note.html`);
  if (metaRaw) {
    const meta = parseYaml(metaRaw, metaPath);
    if (meta.id !== operation.id) errors.push(`add_node ${operation.id}: generated meta id does not match patch.`);
    if (meta.domain !== operation.domain) errors.push(`add_node ${operation.id}: generated meta domain does not match patch.`);
    if (meta.title !== operation.title) errors.push(`add_node ${operation.id}: generated meta title does not match patch.`);
    if (meta.type !== operation.nodeType) errors.push(`add_node ${operation.id}: generated meta type does not match patch.`);
    if (meta.status !== operation.status) errors.push(`add_node ${operation.id}: generated meta status does not match patch.`);
    const metaFormat = normalizeContentFormat(meta.contentFormat || meta.content_format || "");
    if (metaFormat && metaFormat !== format) errors.push(`add_node ${operation.id}: generated meta contentFormat does not match note file type.`);
    const forbidden = scanForbiddenFields(meta);
    if (forbidden) errors.push(`add_node ${operation.id}: generated meta contains forbidden field "${forbidden}".`);
  }
  potentialDuplicateNodeWarnings(currentVault, operation, createdNodes).forEach((warning) => warnings.push(`add_node ${operation.id}: ${warning}`));
  createdIds.add(operation.id);
  createdNodes.push({ id: operation.id, title: operation.title, aliases: operation.aliases || [], domain: operation.domain, type: operation.nodeType, status: operation.status, summary: operation.summary || "", contentFormat: format });
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
function validateAddEdge(operation, context) {
  const { currentVault, createdNodes, createdDomains, packageEdges, errors } = context;
  const nodes = nodeMap(currentVault, createdNodes, createdDomains);
  const relation = operation.relation;
  const from = operation.from;
  const to = operation.to;
  const edgeId = `${from}-${relation}-${to}`;
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
  createdDomains.push({ id: operation.id, title: operation.title, description: operation.description || "", color: operation.color || "", order: operation.order });
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
  if (!operations.length) warnings.push("patch.yaml: no operations found.");
  const context = { currentVault, packageFiles, registry, createdDomains, createdDomainIds, createdNodes, createdIds, packageEdges, errors, warnings, reviewItems };
  operations.forEach((operation, index) => {
    if (!OPERATION_TYPES.has(operation.type)) { errors.push(`operation ${index + 1}: unsupported operation type "${operation.type}".`); return; }
    normalizedOperations.push(operation);
    if (operation.type === "add_domain") validateAddDomain(operation, context);
    if (operation.type === "add_node") validateAddNode(operation, context);
    if (operation.type === "append_note_section") validateAppendNoteSection(operation, context);
    if (operation.type === "add_edge") validateAddEdge(operation, context);
    if (operation.type === "add_block_type") validateAddBlockType(operation, context);
    if (operation.type === "propose_native_block") validateProposeNativeBlock(operation, context);
  });
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
