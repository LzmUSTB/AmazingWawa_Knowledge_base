#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {
  buildAiContextFiles,
  normalizeVault,
} from "../src/index.js";

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
    noteHtmlFiles: readContentFiles(vaultRoot, "note.html"),
    exerciseFiles: readContentFiles(vaultRoot, "exercises.yaml"),
    blockTypeFiles: readBlockTypeFiles(vaultRoot),
  });
}

function writeContextFiles(vaultRoot, vault) {
  const contextRoot = path.join(vaultRoot, ".kb-ai", "context");
  fs.rmSync(contextRoot, { recursive: true, force: true });
  fs.mkdirSync(contextRoot, { recursive: true });
  const files = buildAiContextFiles(vault);

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
console.log(`Context exported to ${contextRoot}`);
console.log(`Nodes: ${vault.nodes.filter((node) => node.type !== "domain").length}`);
console.log(`Edges: ${vault.edges.length}`);
console.log(`Domains: ${vault.domains.length}`);
console.log(`ExerciseSets: ${Object.keys(vault.exercises?.byNodeId || {}).length}`);
console.log(`Custom block types: ${Object.keys(vault.blockTypes || {}).length}`);
