#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";
import {
  KNOWLEDGE_STATUS,
  KNOWLEDGE_TYPES,
  NATIVE_BLOCK_TYPES,
  RELATION_TYPES,
  getBlockRegistry,
  normalizeVault,
} from "../src/index.js";

const LINK_RELATIONS = ["depends-on", "used-in", "compares-with"];

function usage() {
  console.error("Usage: npm run kb:export-ai-context -- ./vault");
}

function readText(filePath, fallback = "") {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return fallback;
  }
}

function readContentFiles(root, targetName) {
  const output = {};
  const contentRoot = path.join(root, "content");
  if (!fs.existsSync(contentRoot)) return output;

  function walk(current) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }
      if (entry.isFile() && entry.name === targetName) {
        output[path.relative(root, fullPath).replaceAll("\\", "/")] = readText(fullPath);
      }
    }
  }

  walk(contentRoot);
  return output;
}

function readBlockTypeFiles(root) {
  const output = {};
  const blockRoot = path.join(root, "block-types");
  if (!fs.existsSync(blockRoot)) return output;
  for (const entry of fs.readdirSync(blockRoot, { withFileTypes: true })) {
    if (!entry.isFile() || !/\.ya?ml$/i.test(entry.name)) continue;
    const fullPath = path.join(blockRoot, entry.name);
    output[path.relative(root, fullPath).replaceAll("\\", "/")] = readText(fullPath);
  }
  return output;
}

function readVault(vaultRoot) {
  return normalizeVault({
    vaultYaml: readText(path.join(vaultRoot, "vault.yaml")),
    domainsYaml: readText(path.join(vaultRoot, "domains.yaml")),
    graphYaml: readText(path.join(vaultRoot, "graph.yaml")),
    graphLayoutYaml: readText(path.join(vaultRoot, "graph-layout.yaml")),
    metaFiles: readContentFiles(vaultRoot, "meta.yaml"),
    noteFiles: readContentFiles(vaultRoot, "note.md"),
    blockTypeFiles: readBlockTypeFiles(vaultRoot),
  });
}

function nodeIndex(vault) {
  return vault.nodes
    .filter((node) => node.type !== "domain")
    .map((node) => ({
      id: node.id,
      title: node.title,
      aliases: node.aliases || [],
      domain: node.domain,
      type: node.type,
      status: node.status,
      summary: node.summary || "",
      path: {
        meta: node.filePath,
        note: node.filePath ? node.filePath.replace(/meta\.yaml$/, "note.md") : "",
      },
      tags: node.tags || [],
    }));
}

function relationIndex(vault) {
  return vault.edges.map((edge) => ({
    id: edge.id,
    from: edge.from,
    to: edge.to,
    relation: edge.relation,
  }));
}

function domainIndex(vault) {
  return vault.domains.map((domain) => ({
    id: domain.id,
    title: domain.title,
    description: domain.description || "",
    color: domain.color,
    order: domain.order,
  }));
}

function blockRegistryMarkdown(vault) {
  const registry = getBlockRegistry(vault);
  const customTypes = Object.values(registry.declarative || {});
  return `# Block Registry

## Native Blocks

${NATIVE_BLOCK_TYPES.map((type) => `- ${type}`).join("\n")}

## Custom Declarative Blocks

${
  customTypes.length
    ? customTypes.map((block) => `- ${block.type}: ${block.title || block.description || block.sourcePath}`).join("\n")
    : "- none installed"
}

## Registry Warnings

${(registry.warnings || []).length ? registry.warnings.map((item) => `- ${item}`).join("\n") : "- none"}

## Registry Errors

${(registry.errors || []).length ? registry.errors.map((item) => `- ${item}`).join("\n") : "- none"}
`;
}

function writeContextFiles(vaultRoot, vault) {
  const contextRoot = path.join(vaultRoot, ".kb-ai", "context");
  fs.mkdirSync(contextRoot, { recursive: true });

  const constraints = {
    idPattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$",
    allowedDomains: vault.domains.map((domain) => domain.id),
    allowedNodeTypes: KNOWLEDGE_TYPES.filter((type) => type !== "domain"),
    allowedStatuses: KNOWLEDGE_STATUS.filter((status) => status !== "domain"),
    allowedRelations: RELATION_TYPES,
    allowedLinkRelations: LINK_RELATIONS,
  };

  const files = {
    "AI_KB_GUIDE.md": `# AI Knowledge Base Guide

You must output a Draft AI Import Package. Do not directly modify the vault.

Hard rules:
- Do not create relation types outside: ${RELATION_TYPES.join(", ")}.
- Use existing domains only.
- Do not include executable JS, Vue, CSS, HTML previews, scripts, iframes, eval, inline event handlers, or remote resources.
- AI-generated HTML preview is forbidden. The desktop app renders previews in-app.
- Create declarative visual blocks only when existing blocks are insufficient.
- Propose native blocks only when declarative blocks are insufficient, and mark them proposal-only.
`,
    "AI_CONTEXT.yaml": YAML.stringify({
      vault: vault.vault,
      generatedAt: new Date().toISOString(),
      constraints,
      counts: {
        domains: vault.domains.length,
        nodes: vault.nodes.length,
        edges: vault.edges.length,
        customBlockTypes: Object.keys(vault.blockTypes || {}).length,
      },
    }),
    "NODE_INDEX.yaml": YAML.stringify({ nodes: nodeIndex(vault) }),
    "RELATION_INDEX.yaml": YAML.stringify({ edges: relationIndex(vault) }),
    "DOMAIN_INDEX.yaml": YAML.stringify({ domains: domainIndex(vault) }),
    "BLOCK_REGISTRY.md": blockRegistryMarkdown(vault),
    "BLOCK_CREATION_POLICY.md": `# Block Creation Policy

Prefer existing native blocks: ${NATIVE_BLOCK_TYPES.join(", ")}.

Custom block-types must live in block-types/*.yaml, use kind: declarative-visual, renderer.engine: visual-grammar, and must not contain executable or remote-resource fields.
`,
    "NOTE_COMPOSITION_GUIDE.md": `# Note Composition Guide

Each knowledge page should aim to include:
1. One-sentence definition
2. Problem it solves
3. Core intuition
4. Formal explanation
5. Minimal example
6. Common mistakes
7. Related knowledge
8. Review questions

Content blocks use triple-colon syntax:

:::concept-card
title: Example
summary: Safe declarative content only.
:::
`,
  };

  Object.entries(files).forEach(([fileName, contents]) => {
    fs.writeFileSync(path.join(contextRoot, fileName), contents, "utf8");
  });

  return contextRoot;
}

const vaultRoot = process.argv[2];
if (!vaultRoot) {
  usage();
  process.exit(1);
}

const resolvedVaultRoot = path.resolve(vaultRoot);
if (!fs.existsSync(path.join(resolvedVaultRoot, "vault.yaml"))) {
  console.error(`Invalid vault root: ${resolvedVaultRoot}`);
  process.exit(1);
}

const vault = readVault(resolvedVaultRoot);
const contextRoot = writeContextFiles(resolvedVaultRoot, vault);
console.log(`AI context exported to ${contextRoot}`);
console.log(`Nodes: ${nodeIndex(vault).length}`);
console.log(`Edges: ${vault.edges.length}`);
console.log(`Domains: ${vault.domains.length}`);
console.log(`Custom block types: ${Object.keys(vault.blockTypes || {}).length}`);
