#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";

function usage() {
  console.error("Usage: npm run kb:reset-vault -- ./vault --yes [--empty-domains]");
}

function ensureInside(root, target) {
  const resolvedRoot = path.resolve(root);
  const resolvedTarget = path.resolve(target);
  if (resolvedTarget !== resolvedRoot && !resolvedTarget.startsWith(`${resolvedRoot}${path.sep}`)) {
    throw new Error(`Refusing to operate outside vault root: ${resolvedTarget}`);
  }
  return resolvedTarget;
}

function resetDir(vaultRoot, relativePath) {
  const target = ensureInside(vaultRoot, path.join(vaultRoot, relativePath));
  fs.rmSync(target, { recursive: true, force: true });
  fs.mkdirSync(target, { recursive: true });
  fs.writeFileSync(path.join(target, ".gitkeep"), "", "utf8");
}

const [vaultRootArg, ...flags] = process.argv.slice(2);
if (!vaultRootArg || !flags.includes("--yes")) {
  usage();
  console.error("This removes vault content, custom block-types, layout, and .kb-ai runtime data. Re-run with --yes to confirm.");
  process.exit(1);
}

try {
  const vaultRoot = path.resolve(vaultRootArg);
  for (const required of ["vault.yaml", "domains.yaml"]) {
    if (!fs.existsSync(path.join(vaultRoot, required))) throw new Error(`Invalid vault root: missing ${required}`);
  }

  resetDir(vaultRoot, "content");
  resetDir(vaultRoot, "block-types");
  fs.mkdirSync(path.join(vaultRoot, ".kb-ai"), { recursive: true });
  fs.writeFileSync(path.join(vaultRoot, ".kb-ai", ".gitkeep"), "", "utf8");

  for (const relativePath of [".kb-ai/context", ".kb-ai/history", ".kb-ai/backups", ".kb-ai/imports"]) {
    fs.rmSync(ensureInside(vaultRoot, path.join(vaultRoot, relativePath)), { recursive: true, force: true });
  }

  fs.writeFileSync(path.join(vaultRoot, "graph.yaml"), "schemaVersion: 1\nedges: []\n", "utf8");
  fs.rmSync(path.join(vaultRoot, "graph-layout.yaml"), { force: true });

  if (flags.includes("--empty-domains")) {
    fs.writeFileSync(path.join(vaultRoot, "domains.yaml"), "schemaVersion: 1\ndomains: []\n", "utf8");
    const vaultPath = path.join(vaultRoot, "vault.yaml");
    const vault = YAML.parse(fs.readFileSync(vaultPath, "utf8")) || {};
    delete vault.defaultDomain;
    fs.writeFileSync(vaultPath, YAML.stringify(vault), "utf8");
  }

  console.log(`Reset vault: ${vaultRoot}`);
  if (flags.includes("--empty-domains")) console.log("Domains: empty");
  console.log("Next: npm run kb:export-ai-context -- ./vault");
} catch (error) {
  console.error(`Failed to reset vault: ${error?.message || error}`);
  process.exit(1);
}
