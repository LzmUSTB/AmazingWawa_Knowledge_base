import { parseYaml } from "../parse-yaml.js";
import {
  getBlockRegistry,
  isNativeBlockType,
  isRegisteredDeclarativeBlockType,
  normalizeBlockTypes,
} from "../block-registry.js";
import { isAllowedKnowledgeStatus, isAllowedKnowledgeType } from "../schema.js";
import { potentialDuplicateNodeWarnings } from "./dedupe.js";

const PACKAGE_ID_PATTERN = /^ai-import-[a-z0-9-]+$/;
const KEBAB_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const LINK_RELATIONS = new Set(["depends-on", "used-in", "compares-with"]);
const SUPPORTED_INSERT_MODES = new Set(["after-heading", "before-heading", "end"]);
const OPERATION_TYPES = new Set(["add_node", "append_note_section", "add_edge", "add_block_type", "propose_native_block"]);
const FORBIDDEN_BLOCK_FIELD_PATTERN = /(^|\.)(script|iframe|eval|html|css|js|src|url|style|styles|javascript|on[a-z]+)/i;
const FORBIDDEN_MARKDOWN_PATTERNS = [
  { pattern: /<\s*script\b/i, label: "script tag" },
  { pattern: /<\s*iframe\b/i, label: "iframe tag" },
  { pattern: /\son[a-z]+\s*=/i, label: "inline event handler" },
  { pattern: /javascript\s*:/i, label: "javascript URL" },
  { pattern: /<\s*(img|video|audio|source|link)\b[^>]*(src|href)\s*=\s*["']?https?:\/\//i, label: "remote HTML resource" },
  { pattern: /!\[[^\]]*\]\(\s*https?:\/\//i, label: "remote Markdown image" },
];

function asArray(value) {
  return Array.isArray(value) ? value : value ? [value] : [];
}

function normalizeSchemaVersion(value) {
  if (value === 1.1 || value === "1.1") return "1.1";
  return String(value || "");
}

function normalizeOperation(operation = {}) {
  const node = operation.node || operation;
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
    };
  }
  if (operation.type === "add_edge") {
    return {
      ...operation,
      from: operation.from || operation.source,
      to: operation.to || operation.target,
    };
  }
  if (operation.type === "add_block_type") {
    return {
      ...operation,
      typeName: operation.blockType || operation.block_type || operation.name || operation.id,
      file: operation.file || `block-types/${operation.blockType || operation.block_type || operation.name || operation.id}.yaml`,
    };
  }
  return operation;
}

function operationsFromPatch(patch = {}) {
  return asArray(patch.operations || patch.changes || patch.patch).map(normalizeOperation);
}

function nodeMap(currentVault, createdNodes = []) {
  return new Map([...(currentVault.nodes || []), ...createdNodes].map((node) => [node.id, node]));
}

function generatedMetaPath(operation) {
  return `generated/content/${operation.domain}/${operation.id}/meta.yaml`;
}

function generatedNotePath(operation) {
  return `generated/content/${operation.domain}/${operation.id}/note.md`;
}

function noteHeadingExists(markdown = "", headingSelector = "") {
  if (!headingSelector) return false;
  const normalized = headingSelector.replace(/^#+\s*/, "").trim().toLowerCase();
  return markdown
    .split(/\r?\n/)
    .some((line) => /^#{1,6}\s+/.test(line) && line.replace(/^#+\s*/, "").trim().toLowerCase() === normalized);
}

function insertedHeading(markdown = "") {
  return markdown
    .split(/\r?\n/)
    .map((line) => line.match(/^#{1,6}\s+(.+)$/)?.[1]?.trim())
    .find(Boolean);
}

function collectBlockTypes(markdown = "") {
  const types = [];
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  for (const line of lines) {
    const match = line.match(/^:::([A-Za-z0-9_-]+)\s*$/);
    if (match) types.push(match[1]);
  }
  return types;
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
  FORBIDDEN_MARKDOWN_PATTERNS.forEach(({ pattern, label }) => {
    if (pattern.test(markdown)) errors.push(`${context}: forbidden ${label}.`);
  });
  collectBlockTypes(markdown).forEach((type) => {
    if (isNativeBlockType(type)) return;
    if (isRegisteredDeclarativeBlockType(type, registry)) return;
    errors.push(`${context}: unknown content block "${type}".`);
  });
}

function packageBlockRegistry(currentVault, packageFiles) {
  const packageBlockTypes = normalizeBlockTypes(packageFiles.blockTypeFiles || {});
  return {
    native: getBlockRegistry(currentVault).native,
    declarative: {
      ...(currentVault.blockTypes || {}),
      ...packageBlockTypes.definitions,
    },
    errors: packageBlockTypes.errors,
    warnings: packageBlockTypes.warnings,
    packageDefinitions: packageBlockTypes.definitions,
  };
}

function validateManifest(packageFiles, errors) {
  const manifest = packageFiles.manifest || {};
  const schemaVersion = normalizeSchemaVersion(manifest.schemaVersion);
  if (schemaVersion !== "1.1") errors.push("manifest.yaml: schemaVersion must be 1.1.");
  if (!manifest.packageId) errors.push("manifest.yaml: packageId is required.");
  if (manifest.packageId && !PACKAGE_ID_PATTERN.test(manifest.packageId)) {
    errors.push(`manifest.yaml: packageId "${manifest.packageId}" must match ${PACKAGE_ID_PATTERN}.`);
  }
  if (manifest.packageId && manifest.packageId !== packageFiles.packageId) {
    errors.push(`manifest.yaml: packageId "${manifest.packageId}" must match directory name "${packageFiles.packageId}".`);
  }
  if (packageFiles.packageFormat === "wawapkg") {
    if (manifest.packageFormat !== "wawapkg") errors.push("manifest.yaml: packageFormat must be wawapkg.");
    if (!["import", "ai-import"].includes(manifest.packageKind)) errors.push("manifest.yaml: packageKind must be import.");
  }
  if (!manifest.status) errors.push("manifest.yaml: status is required.");
  if (manifest.preview?.mode !== "in-app") errors.push("manifest.yaml: preview.mode must be in-app.");
  if (manifest.preview?.generatedHtmlPreview !== false) {
    errors.push("manifest.yaml: preview.generatedHtmlPreview must be false.");
  }
  return { ...manifest, schemaVersion };
}

function validateSources(packageFiles, warnings) {
  const sources = packageFiles.sources || {};
  const sourceList = asArray(sources.sources);
  if (!sourceList.length) {
    warnings.push("sources.yaml: sources array is missing or empty.");
    return;
  }
  const ids = new Set();
  sourceList.forEach((source) => {
    if (!source?.id) return;
    if (ids.has(source.id)) warnings.push(`sources.yaml: duplicate source id "${source.id}".`);
    ids.add(source.id);
    if (source.fullContentRequired === true || source.requiresFullContent === true) {
      warnings.push(`sources.yaml: source "${source.id}" should not require full source content.`);
    }
  });
}

function validateAddNode(operation, context) {
  const { currentVault, packageFiles, registry, createdNodes, createdIds, errors, warnings } = context;
  const currentNodeIds = new Set((currentVault.nodes || []).map((node) => node.id));
  const domainIds = new Set((currentVault.domains || []).map((domain) => domain.id));
  const nodes = nodeMap(currentVault, createdNodes);

  if (!KEBAB_PATTERN.test(operation.id || "")) errors.push(`add_node: id "${operation.id || ""}" must be lowercase kebab-case.`);
  if (currentNodeIds.has(operation.id)) errors.push(`add_node ${operation.id}: node already exists.`);
  if (createdIds.has(operation.id)) errors.push(`add_node ${operation.id}: duplicate node in package.`);
  if (!operation.title) errors.push(`add_node ${operation.id}: title is required.`);
  if (!domainIds.has(operation.domain)) errors.push(`add_node ${operation.id}: domain "${operation.domain}" does not exist.`);
  if (!isAllowedKnowledgeType(operation.nodeType)) errors.push(`add_node ${operation.id}: type "${operation.nodeType}" is not allowed.`);
  if (!isAllowedKnowledgeStatus(operation.status)) errors.push(`add_node ${operation.id}: status "${operation.status}" is not allowed.`);
  if (!nodes.has(operation.parentId)) errors.push(`add_node ${operation.id}: parentId "${operation.parentId}" does not exist.`);

  const parentNode = nodes.get(operation.parentId);
  if (parentNode && operation.domain && parentNode.type === "domain" && parentNode.id !== operation.domain) {
    errors.push(`add_node ${operation.id}: domain parent must match node domain.`);
  }
  if (parentNode && operation.domain && parentNode.type !== "domain" && parentNode.domain !== operation.domain) {
    errors.push(`add_node ${operation.id}: parent must belong to the same domain.`);
  }

  const metaPath = generatedMetaPath(operation);
  const notePath = generatedNotePath(operation);
  const metaRaw = packageFiles.generatedMetaFiles[metaPath];
  const noteRaw = packageFiles.generatedNoteFiles[notePath];
  if (!metaRaw) errors.push(`add_node ${operation.id}: missing ${metaPath}.`);
  if (!noteRaw) errors.push(`add_node ${operation.id}: missing ${notePath}.`);
  if (metaRaw) {
    const meta = parseYaml(metaRaw, metaPath);
    if (meta.id !== operation.id) errors.push(`add_node ${operation.id}: generated meta id does not match patch.`);
    if (meta.domain !== operation.domain) errors.push(`add_node ${operation.id}: generated meta domain does not match patch.`);
    if (meta.title !== operation.title) errors.push(`add_node ${operation.id}: generated meta title does not match patch.`);
    if (meta.type !== operation.nodeType) errors.push(`add_node ${operation.id}: generated meta type does not match patch.`);
    if (meta.status !== operation.status) errors.push(`add_node ${operation.id}: generated meta status does not match patch.`);
    const forbidden = scanForbiddenFields(meta);
    if (forbidden) errors.push(`add_node ${operation.id}: generated meta contains forbidden field "${forbidden}".`);
  }
  if (noteRaw) validateMarkdownBlocks(noteRaw, registry, errors, `add_node ${operation.id} note.md`);

  potentialDuplicateNodeWarnings(currentVault, operation, createdNodes).forEach((warning) => {
    warnings.push(`add_node ${operation.id}: ${warning}`);
  });

  createdIds.add(operation.id);
  createdNodes.push({
    id: operation.id,
    title: operation.title,
    aliases: operation.aliases || [],
    domain: operation.domain,
    type: operation.nodeType,
    status: operation.status,
    summary: operation.summary || "",
  });
}

function validateAppendNoteSection(operation, context) {
  const { currentVault, registry, createdNodes, errors, warnings } = context;
  const nodes = nodeMap(currentVault, createdNodes);
  const targetId = operation.targetId || operation.id;
  const insertMode = operation.insertMode || "end";
  const markdown = operation.markdown || operation.content || "";
  if (!nodes.has(targetId)) errors.push(`append_note_section: targetId "${targetId}" does not exist.`);
  if (!SUPPORTED_INSERT_MODES.has(insertMode)) errors.push(`append_note_section ${targetId}: unsupported insertMode "${insertMode}".`);
  if (insertMode !== "end" && !operation.headingSelector) {
    errors.push(`append_note_section ${targetId}: headingSelector is required for heading insert modes.`);
  }
  const currentNote = currentVault.notes?.[targetId]?.markdown || "";
  if (!currentNote && !(createdNodes || []).some((node) => node.id === targetId)) {
    errors.push(`append_note_section ${targetId}: target note does not exist.`);
  }
  if (insertMode !== "end" && currentNote && !noteHeadingExists(currentNote, operation.headingSelector)) {
    errors.push(`append_note_section ${targetId}: headingSelector "${operation.headingSelector}" was not found.`);
  }
  const heading = insertedHeading(markdown);
  if (heading && currentNote && noteHeadingExists(currentNote, heading)) {
    warnings.push(`append_note_section ${targetId}: inserted heading "${heading}" may duplicate an existing heading.`);
  }
  validateMarkdownBlocks(markdown, registry, errors, `append_note_section ${targetId}`);
}

function validateAddEdge(operation, context) {
  const { currentVault, createdNodes, packageEdges, errors } = context;
  const nodes = nodeMap(currentVault, createdNodes);
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
  if (existingEdges.some((edge) => edge.from === from && edge.to === to && edge.relation === relation)) {
    errors.push(`add_edge ${edgeId}: duplicate existing edge.`);
  }
  if (
    relation === "compares-with" &&
    existingEdges.some((edge) => edge.from === to && edge.to === from && edge.relation === relation)
  ) {
    errors.push(`add_edge ${edgeId}: reverse compares-with edge already exists.`);
  }
  if (packageEdges.has(edgeId)) errors.push(`add_edge ${edgeId}: duplicate package edge.`);
  packageEdges.add(edgeId);
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
  if (!KEBAB_PATTERN.test(operation.blockType || operation.typeName || operation.name || "")) {
    errors.push("propose_native_block: proposed type must be kebab-case.");
  }
  if (operation.importMode !== "proposal-only") {
    errors.push("propose_native_block: importMode must be proposal-only.");
  }
  reviewItems.push({
    type: "propose_native_block",
    title: operation.blockType || operation.typeName || operation.name || "native-block-proposal",
    message: operation.reason || "Native block proposal requires human review.",
  });
}

export function validateAiPackage(currentVault, packageFilesOrRoot) {
  if (typeof packageFilesOrRoot === "string") {
    throw new Error("validateAiPackage expects parsed package files. Use readAiPackage in Node CLI code first.");
  }
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
  const createdNodes = [];
  const createdIds = new Set();
  const packageEdges = new Set();
  if (!operations.length) warnings.push("patch.yaml: no operations found.");

  const context = {
    currentVault,
    packageFiles,
    registry,
    createdNodes,
    createdIds,
    packageEdges,
    errors,
    warnings,
    reviewItems,
  };

  operations.forEach((operation, index) => {
    if (!OPERATION_TYPES.has(operation.type)) {
      errors.push(`operation ${index + 1}: unsupported operation type "${operation.type}".`);
      return;
    }
    normalizedOperations.push(operation);
    if (operation.type === "add_node") validateAddNode(operation, context);
    if (operation.type === "append_note_section") validateAppendNoteSection(operation, context);
    if (operation.type === "add_edge") validateAddEdge(operation, context);
    if (operation.type === "add_block_type") validateAddBlockType(operation, context);
    if (operation.type === "propose_native_block") validateProposeNativeBlock(operation, context);
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    reviewItems,
    normalizedOperations,
    previewModel: {
      packageId: manifest.packageId || packageFiles.packageId,
      status: manifest.status || "",
      schemaVersion: manifest.schemaVersion || "",
      packageFormat: packageFiles.packageFormat || manifest.packageFormat || "",
      operationCount: normalizedOperations.length,
      packageBlockTypes: Object.keys(registry.packageDefinitions || {}),
    },
    packageFiles,
    blockRegistry: registry,
  };
}
