import YAML from "yaml";
import { parseYaml } from "../parse-yaml.js";
import { diffAiPackage } from "./diff-ai-package.js";
import { validateAiPackage } from "./validate-ai-package.js";

function generatedMetaPath(operation) { return `generated/content/${operation.domain}/${operation.id}/meta.yaml`; }
function generatedMarkdownNotePath(operation) { return `generated/content/${operation.domain}/${operation.id}/note.md`; }
function generatedHtmlNotePath(operation) { return `generated/content/${operation.domain}/${operation.id}/note.html`; }
function targetMetaPath(operation) { return `content/${operation.domain}/${operation.id}/meta.yaml`; }
function targetMarkdownNotePath(operation) { return `content/${operation.domain}/${operation.id}/note.md`; }
function targetHtmlNotePath(operation) { return `content/${operation.domain}/${operation.id}/note.html`; }
function edgeId(from, relation, to) { return `${from}-${relation}-${to}`; }
function normalizeFormat(value = "") { const format = String(value || "").trim().toLowerCase(); return ["markdown", "html", "none"].includes(format) ? format : ""; }
function noteFormatForOperation(operation, packageFiles) {
  const explicit = normalizeFormat(operation.contentFormat || operation.content_format);
  if (explicit) return explicit;
  if (packageFiles.generatedHtmlNoteFiles?.[generatedHtmlNotePath(operation)]) return "html";
  if (packageFiles.generatedNoteFiles?.[generatedMarkdownNotePath(operation)]) return "markdown";
  return "none";
}

const DOMAIN_COLORS = ["#00B7FF", "#C8FF00", "#FF2BD6", "#FFD500", "#7C5CFF", "#00E5A8", "#FF8A00"];
function normalizeDomainForWrite(domain, index, existingCount) { return { id: domain.id, title: domain.title, description: domain.description || "", color: domain.color || DOMAIN_COLORS[(existingCount + index) % DOMAIN_COLORS.length], order: domain.order ?? (existingCount + index + 1) * 10 }; }
function domainsYamlWithAddedDomains(currentVault, addedDomains) {
  const existingCount = (currentVault.domains || []).length;
  const domains = [...(currentVault.domains || []).map((domain, index) => ({ id: domain.id, title: domain.title, description: domain.description || "", color: domain.color || DOMAIN_COLORS[index % DOMAIN_COLORS.length], order: domain.order ?? (index + 1) * 10 })), ...addedDomains.map((domain, index) => normalizeDomainForWrite(domain, index, existingCount))].sort((left, right) => (left.order ?? 999) - (right.order ?? 999) || String(left.title || left.id).localeCompare(String(right.title || right.id)));
  return YAML.stringify({ schemaVersion: 1, domains });
}
function vaultYamlWithDefaultDomain(currentVault, defaultDomain) { return YAML.stringify({ schemaVersion: currentVault.vault?.schemaVersion || 1, title: currentVault.vault?.title || "Knowledge Vault", description: currentVault.vault?.description || "", language: currentVault.vault?.language || "zh-CN", defaultDomain }); }
function lineHeadingText(line = "") { return line.match(/^#{1,6}\s+(.+)$/)?.[1]?.trim() || ""; }
function mergeMarkdown(currentMarkdown = "", operation = {}) {
  const insertMode = operation.insertMode || "end";
  const markdown = (operation.markdown || operation.content || "").trim();
  if (insertMode === "end") return `${currentMarkdown.replace(/\s+$/, "")}\n\n${markdown}\n`;
  const heading = String(operation.headingSelector || "").replace(/^#+\s*/, "").trim().toLowerCase();
  const lines = currentMarkdown.split(/\r?\n/);
  const index = lines.findIndex((line) => lineHeadingText(line).toLowerCase() === heading);
  if (index < 0) throw new Error(`Heading "${operation.headingSelector}" was not found.`);
  const insertIndex = insertMode === "before-heading" ? index : index + 1;
  const nextLines = [...lines];
  nextLines.splice(insertIndex, 0, "", markdown, "");
  return nextLines.join("\n");
}
function currentGraphYaml(currentVault = {}) { return YAML.stringify({ schemaVersion: 1, edges: (currentVault.edges || []).map((edge) => ({ id: edge.id || edgeId(edge.from, edge.relation, edge.to), from: edge.from || edge.source, to: edge.to || edge.target, relation: edge.relation })) }); }
function graphYamlWithAddedEdges(currentVault, addedEdges) { const graph = parseYaml(currentVault.rawGraphYaml || currentGraphYaml(currentVault), "graph.yaml"); const edges = Array.isArray(graph.edges) ? graph.edges : []; return YAML.stringify({ ...graph, schemaVersion: graph.schemaVersion || 1, edges: [...edges, ...addedEdges] }); }
function notePathForNode(currentVault, nodeId) { const node = (currentVault.nodes || []).find((item) => item.id === nodeId); if (!node) return ""; return `content/${node.domain}/${node.id}/note.md`; }

export function buildAiPackageApplyPlan(currentVault, packageFiles) {
  const validation = validateAiPackage(currentVault, packageFiles);
  if (!validation.valid) throw new Error(`Cannot build apply plan for invalid package: ${validation.errors.join("; ")}`);
  const diff = diffAiPackage(currentVault, validation);
  const writes = [];
  const binaryWrites = [];
  const createDirs = new Set();
  const backupPaths = new Set();
  const addedEdges = [];
  const addedDomains = [];
  const created = [];
  const createdDomains = [];
  const modified = [];

  validation.normalizedOperations.forEach((operation) => {
    if (operation.type === "add_domain") { addedDomains.push(operation); createdDomains.push(operation.id); }
    if (operation.type === "add_block_type") { const contents = packageFiles.blockTypeFiles[operation.file]; writes.push({ relativePath: operation.file, contents, createOnly: true }); createDirs.add(operation.file.split("/").slice(0, -1).join("/")); created.push(operation.file); }
    if (operation.type === "add_node") {
      const metaPath = targetMetaPath(operation);
      const format = noteFormatForOperation(operation, packageFiles);
      writes.push({ relativePath: metaPath, contents: packageFiles.generatedMetaFiles[generatedMetaPath(operation)], createOnly: true });
      created.push(metaPath);
      if (format === "markdown") { const notePath = targetMarkdownNotePath(operation); writes.push({ relativePath: notePath, contents: packageFiles.generatedNoteFiles[generatedMarkdownNotePath(operation)], createOnly: true }); created.push(notePath); }
      if (format === "html") { const notePath = targetHtmlNotePath(operation); writes.push({ relativePath: notePath, contents: packageFiles.generatedHtmlNoteFiles[generatedHtmlNotePath(operation)], createOnly: true }); created.push(notePath); }
      createDirs.add(`content/${operation.domain}/${operation.id}/assets`);
      addedEdges.push({ id: edgeId(operation.parentId, "contains", operation.id), from: operation.parentId, to: operation.id, relation: "contains" });
    }
    if (operation.type === "append_note_section") { const targetId = operation.targetId || operation.id; const notePath = notePathForNode(currentVault, targetId); const currentMarkdown = currentVault.notes?.[targetId]?.markdown || ""; writes.push({ relativePath: notePath, contents: mergeMarkdown(currentMarkdown, operation), createOnly: false }); backupPaths.add(notePath); modified.push(notePath); }
    if (operation.type === "add_edge") addedEdges.push({ id: edgeId(operation.from, operation.relation, operation.to), from: operation.from, to: operation.to, relation: operation.relation });
  });

  if (addedDomains.length) {
    backupPaths.add("domains.yaml");
    writes.push({ relativePath: "domains.yaml", contents: domainsYamlWithAddedDomains(currentVault, addedDomains), createOnly: false });
    modified.push("domains.yaml");
    if (!currentVault.vault?.defaultDomain && addedDomains[0]?.id) { backupPaths.add("vault.yaml"); writes.push({ relativePath: "vault.yaml", contents: vaultYamlWithDefaultDomain(currentVault, addedDomains[0].id), createOnly: false }); modified.push("vault.yaml"); }
  }
  (packageFiles.assetFiles || []).forEach((asset) => { binaryWrites.push({ relativePath: asset.vaultRelativePath, base64: asset.base64, createOnly: true }); createDirs.add(asset.vaultRelativePath.split("/").slice(0, -1).join("/")); created.push(asset.vaultRelativePath); });
  if (addedEdges.length) { backupPaths.add("graph.yaml"); writes.push({ relativePath: "graph.yaml", contents: graphYamlWithAddedEdges(currentVault, addedEdges), createOnly: false }); modified.push("graph.yaml"); }

  const historyPath = `.kb-ai/history/${validation.previewModel.packageId}.yaml`;
  const history = { packageId: validation.previewModel.packageId, appliedAt: new Date().toISOString(), created: [...new Set(created)], createdDomains: [...new Set(createdDomains)], modified: [...new Set(modified)], warnings: validation.warnings };
  writes.push({ relativePath: historyPath, contents: YAML.stringify(history), createOnly: true });
  createDirs.add(".kb-ai/history");
  created.push(historyPath);
  return { packageId: validation.previewModel.packageId, backupRelativeDir: `.kb-ai/backups/${validation.previewModel.packageId}`, backupPaths: [...backupPaths], createDirs: [...createDirs].filter(Boolean), writes, binaryWrites, history, diff, validation };
}
