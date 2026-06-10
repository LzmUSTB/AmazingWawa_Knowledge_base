import YAML from "yaml";
import { parseYaml } from "../parse-yaml.js";
import { diffAiPackage } from "./diff-ai-package.js";
import { validateAiPackage } from "./validate-ai-package.js";

function generatedMetaPath(operation) {
  return `generated/content/${operation.domain}/${operation.id}/meta.yaml`;
}

function generatedNotePath(operation) {
  return `generated/content/${operation.domain}/${operation.id}/note.md`;
}

function targetMetaPath(operation) {
  return `content/${operation.domain}/${operation.id}/meta.yaml`;
}

function targetNotePath(operation) {
  return `content/${operation.domain}/${operation.id}/note.md`;
}

function edgeId(from, relation, to) {
  return `${from}-${relation}-${to}`;
}

function lineHeadingText(line = "") {
  return line.match(/^#{1,6}\s+(.+)$/)?.[1]?.trim() || "";
}

function mergeMarkdown(currentMarkdown = "", operation = {}) {
  const insertMode = operation.insertMode || "end";
  const markdown = (operation.markdown || operation.content || "").trim();
  if (insertMode === "end") {
    return `${currentMarkdown.replace(/\s+$/, "")}\n\n${markdown}\n`;
  }

  const heading = String(operation.headingSelector || "").replace(/^#+\s*/, "").trim().toLowerCase();
  const lines = currentMarkdown.split(/\r?\n/);
  const index = lines.findIndex((line) => lineHeadingText(line).toLowerCase() === heading);
  if (index < 0) throw new Error(`Heading "${operation.headingSelector}" was not found.`);
  const insertIndex = insertMode === "before-heading" ? index : index + 1;
  const nextLines = [...lines];
  nextLines.splice(insertIndex, 0, "", markdown, "");
  return nextLines.join("\n");
}

function currentGraphYaml(currentVault = {}) {
  return YAML.stringify({
    schemaVersion: 1,
    edges: (currentVault.edges || []).map((edge) => ({
      id: edge.id || edgeId(edge.from, edge.relation, edge.to),
      from: edge.from || edge.source,
      to: edge.to || edge.target,
      relation: edge.relation,
    })),
  });
}

function graphYamlWithAddedEdges(currentVault, addedEdges) {
  const graph = parseYaml(currentVault.rawGraphYaml || currentGraphYaml(currentVault), "graph.yaml");
  const edges = Array.isArray(graph.edges) ? graph.edges : [];
  return YAML.stringify({
    ...graph,
    schemaVersion: graph.schemaVersion || 1,
    edges: [...edges, ...addedEdges],
  });
}

function notePathForNode(currentVault, nodeId) {
  const node = (currentVault.nodes || []).find((item) => item.id === nodeId);
  if (!node) return "";
  return `content/${node.domain}/${node.id}/note.md`;
}

export function buildAiPackageApplyPlan(currentVault, packageFiles) {
  const validation = validateAiPackage(currentVault, packageFiles);
  if (!validation.valid) {
    throw new Error(`Cannot build apply plan for invalid package: ${validation.errors.join("; ")}`);
  }

  const diff = diffAiPackage(currentVault, validation);
  const writes = [];
  const binaryWrites = [];
  const createDirs = new Set();
  const backupPaths = new Set();
  const addedEdges = [];
  const created = [];
  const modified = [];

  validation.normalizedOperations.forEach((operation) => {
    if (operation.type === "add_block_type") {
      const contents = packageFiles.blockTypeFiles[operation.file];
      writes.push({ relativePath: operation.file, contents, createOnly: true });
      createDirs.add(operation.file.split("/").slice(0, -1).join("/"));
      created.push(operation.file);
    }

    if (operation.type === "add_node") {
      const metaPath = targetMetaPath(operation);
      const notePath = targetNotePath(operation);
      writes.push(
        { relativePath: metaPath, contents: packageFiles.generatedMetaFiles[generatedMetaPath(operation)], createOnly: true },
        { relativePath: notePath, contents: packageFiles.generatedNoteFiles[generatedNotePath(operation)], createOnly: true },
      );
      createDirs.add(`content/${operation.domain}/${operation.id}/assets`);
      created.push(metaPath, notePath);
      addedEdges.push({
        id: edgeId(operation.parentId, "contains", operation.id),
        from: operation.parentId,
        to: operation.id,
        relation: "contains",
      });
    }

    if (operation.type === "append_note_section") {
      const targetId = operation.targetId || operation.id;
      const notePath = notePathForNode(currentVault, targetId);
      const currentMarkdown = currentVault.notes?.[targetId]?.markdown || "";
      writes.push({ relativePath: notePath, contents: mergeMarkdown(currentMarkdown, operation), createOnly: false });
      backupPaths.add(notePath);
      modified.push(notePath);
    }

    if (operation.type === "add_edge") {
      addedEdges.push({
        id: edgeId(operation.from, operation.relation, operation.to),
        from: operation.from,
        to: operation.to,
        relation: operation.relation,
      });
    }
  });

  (packageFiles.assetFiles || []).forEach((asset) => {
    binaryWrites.push({
      relativePath: asset.vaultRelativePath,
      base64: asset.base64,
      createOnly: true,
    });
    createDirs.add(asset.vaultRelativePath.split("/").slice(0, -1).join("/"));
    created.push(asset.vaultRelativePath);
  });

  if (addedEdges.length) {
    backupPaths.add("graph.yaml");
    writes.push({
      relativePath: "graph.yaml",
      contents: graphYamlWithAddedEdges(currentVault, addedEdges),
      createOnly: false,
    });
    modified.push("graph.yaml");
  }

  const historyPath = `.kb-ai/history/${validation.previewModel.packageId}.yaml`;
  const history = {
    packageId: validation.previewModel.packageId,
    appliedAt: new Date().toISOString(),
    created: [...new Set(created)],
    modified: [...new Set(modified)],
    warnings: validation.warnings,
  };
  writes.push({
    relativePath: historyPath,
    contents: YAML.stringify(history),
    createOnly: true,
  });
  createDirs.add(".kb-ai/history");
  created.push(historyPath);

  return {
    packageId: validation.previewModel.packageId,
    backupRelativeDir: `.kb-ai/backups/${validation.previewModel.packageId}`,
    backupPaths: [...backupPaths],
    createDirs: [...createDirs].filter(Boolean),
    writes,
    binaryWrites,
    history,
    diff,
    validation,
  };
}
