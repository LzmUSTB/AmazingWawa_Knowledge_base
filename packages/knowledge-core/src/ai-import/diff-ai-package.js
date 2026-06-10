import { parseYaml } from "../parse-yaml.js";
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
  const markdown = operation.markdown || operation.content || "";
  if (insertMode === "end") {
    return `${currentMarkdown.replace(/\s+$/, "")}\n\n${markdown.trim()}\n`;
  }

  const heading = String(operation.headingSelector || "").replace(/^#+\s*/, "").trim().toLowerCase();
  const lines = currentMarkdown.split(/\r?\n/);
  const index = lines.findIndex((line) => lineHeadingText(line).toLowerCase() === heading);
  if (index < 0) return `${currentMarkdown.replace(/\s+$/, "")}\n\n${markdown.trim()}\n`;
  const insertIndex = insertMode === "before-heading" ? index : index + 1;
  const nextLines = [...lines];
  nextLines.splice(insertIndex, 0, "", markdown.trim(), "");
  return nextLines.join("\n");
}

function blockTypeSummary(raw = "", path = "") {
  const parsed = parseYaml(raw, path);
  return {
    type: parsed.type || path.split("/").pop()?.replace(/\.ya?ml$/i, ""),
    title: parsed.title || parsed.name || "",
    kind: parsed.kind || "",
    engine: parsed.renderer?.engine || "",
    sourcePath: path,
    example: parsed.example || parsed.examples?.[0] || null,
  };
}

export function diffAiPackage(currentVault, validatedPackageOrFiles) {
  const validatedPackage =
    validatedPackageOrFiles?.normalizedOperations && validatedPackageOrFiles?.packageFiles
      ? validatedPackageOrFiles
      : validateAiPackage(currentVault, validatedPackageOrFiles);
  const packageFiles = validatedPackage.packageFiles;
  const filesToCreate = [];
  const filesToModify = [];
  const nodesToAdd = [];
  const edgesToAdd = [];
  const blockTypesToAdd = [];
  const notePreviews = [];
  const graphDiff = [];
  const reviewItems = [...(validatedPackage.reviewItems || [])];

  validatedPackage.normalizedOperations.forEach((operation) => {
    if (operation.type === "add_node") {
      const metaPath = targetMetaPath(operation);
      const notePath = targetNotePath(operation);
      const containsEdge = {
        id: edgeId(operation.parentId, "contains", operation.id),
        from: operation.parentId,
        to: operation.id,
        relation: "contains",
      };

      filesToCreate.push(
        { path: metaPath, sourcePath: generatedMetaPath(operation), kind: "meta" },
        { path: notePath, sourcePath: generatedNotePath(operation), kind: "note" },
      );
      nodesToAdd.push({
        id: operation.id,
        title: operation.title,
        domain: operation.domain,
        type: operation.nodeType,
        status: operation.status,
        parentId: operation.parentId,
      });
      edgesToAdd.push(containsEdge);
      graphDiff.push({ action: "add", edge: containsEdge, reason: "structural contains edge for add_node" });
      notePreviews.push({
        nodeId: operation.id,
        title: operation.title,
        mode: "create",
        markdown: packageFiles.generatedNoteFiles[generatedNotePath(operation)] || "",
      });
    }

    if (operation.type === "append_note_section") {
      const targetId = operation.targetId || operation.id;
      const node = (currentVault.nodes || []).find((item) => item.id === targetId);
      const notePath = node ? `content/${node.domain}/${targetId}/note.md` : `content/${targetId}/note.md`;
      const currentMarkdown = currentVault.notes?.[targetId]?.markdown || "";
      filesToModify.push({ path: notePath, kind: "note", operation: "append_note_section" });
      notePreviews.push({
        nodeId: targetId,
        title: node?.title || targetId,
        mode: "modify",
        markdown: mergeMarkdown(currentMarkdown, operation),
      });
    }

    if (operation.type === "add_edge") {
      const edge = {
        id: edgeId(operation.from, operation.relation, operation.to),
        from: operation.from,
        to: operation.to,
        relation: operation.relation,
      };
      edgesToAdd.push(edge);
      graphDiff.push({ action: "add", edge, reason: "semantic relation from package" });
      if (!filesToModify.some((file) => file.path === "graph.yaml")) {
        filesToModify.push({ path: "graph.yaml", kind: "graph" });
      }
    }

    if (operation.type === "add_block_type") {
      const raw = packageFiles.blockTypeFiles[operation.file] || "";
      const summary = blockTypeSummary(raw, operation.file);
      const targetPath = operation.file;
      filesToCreate.push({ path: targetPath, sourcePath: operation.file, kind: "block-type" });
      blockTypesToAdd.push(summary);
    }

    if (operation.type === "propose_native_block") {
      reviewItems.push({
        type: "propose_native_block",
        title: operation.blockType || operation.typeName || operation.name,
        message: operation.reason || "Proposal only; no executable files will be written.",
      });
    }
  });

  if (edgesToAdd.length && !filesToModify.some((file) => file.path === "graph.yaml")) {
    filesToModify.push({ path: "graph.yaml", kind: "graph" });
  }

  return {
    filesToCreate,
    filesToModify,
    nodesToAdd,
    edgesToAdd,
    blockTypesToAdd,
    notePreviews,
    graphDiff,
    reviewItems,
    validation: {
      valid: validatedPackage.valid,
      errors: validatedPackage.errors,
      warnings: validatedPackage.warnings,
    },
  };
}
