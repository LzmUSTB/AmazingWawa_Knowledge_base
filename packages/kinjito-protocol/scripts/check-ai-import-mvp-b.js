#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import { diffAiPackage, validateAiPackage } from "../src/index.js";
import { applyAiPackage } from "../src/ai-import/apply-ai-package.js";
import { readAiPackage } from "../src/ai-import/read-ai-package.js";
import { readVaultForCli } from "./read-vault-for-cli.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const vaultRoot = path.join(repoRoot, "vault");
const fixtureRoot = path.join(repoRoot, "fixtures", "ai-import-20260610-position-based-fluids");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function tempPackage(name) {
  const root = path.join(os.tmpdir(), `ai-import-${name}-${Date.now()}`);
  fs.cpSync(fixtureRoot, root, { recursive: true });
  return root;
}

function readPatch(packageRoot) {
  return YAML.parse(fs.readFileSync(path.join(packageRoot, "patch.yaml"), "utf8"));
}

function writePatch(packageRoot, patch) {
  fs.writeFileSync(path.join(packageRoot, "patch.yaml"), YAML.stringify(patch), "utf8");
}

function withPackageId(packageRoot, packageId) {
  const manifestPath = path.join(packageRoot, "manifest.yaml");
  const manifest = YAML.parse(fs.readFileSync(manifestPath, "utf8"));
  manifest.packageId = packageId;
  fs.writeFileSync(manifestPath, YAML.stringify(manifest), "utf8");
}

function ensureSimulationSph(vaultRootPath) {
  const domainsPath = path.join(vaultRootPath, "domains.yaml");
  const domainsYaml = YAML.parse(fs.readFileSync(domainsPath, "utf8")) || {};
  const domains = Array.isArray(domainsYaml.domains) ? domainsYaml.domains : [];
  if (!domains.some((domain) => domain.id === "simulation")) {
    domains.push({
      id: "simulation",
      title: "Simulation",
      description: "Simulation knowledge.",
      color: "#7C5CFF",
      order: 10,
    });
    fs.writeFileSync(domainsPath, YAML.stringify({ ...domainsYaml, schemaVersion: 1, domains }), "utf8");
  }

  const sphRoot = path.join(vaultRootPath, "content", "simulation", "sph");
  fs.mkdirSync(path.join(sphRoot, "assets"), { recursive: true });
  fs.writeFileSync(path.join(sphRoot, "meta.yaml"), YAML.stringify({
    id: "sph",
    title: "SPH",
    domain: "simulation",
    type: "concept",
    status: "seed",
    summary: "Smoothed particle hydrodynamics.",
    createdAt: "2026-06-10",
    updatedAt: "2026-06-10",
    tags: ["simulation"],
    prerequisites: [],
    related: [],
  }), "utf8");
  fs.writeFileSync(path.join(sphRoot, "note.md"), "# SPH\n\nSmoothed particle hydrodynamics.\n", "utf8");
}

const cleanVaultRoot = path.join(os.tmpdir(), `ai-import-clean-vault-${Date.now()}`);
fs.cpSync(vaultRoot, cleanVaultRoot, { recursive: true });
ensureSimulationSph(cleanVaultRoot);
fs.rmSync(path.join(cleanVaultRoot, "content", "simulation", "position-based-fluids"), { recursive: true, force: true });
fs.rmSync(path.join(cleanVaultRoot, "block-types", "solver-loop-diagram.yaml"), { force: true });
fs.rmSync(path.join(cleanVaultRoot, ".kb-ai", "history", "ai-import-20260610-position-based-fluids.yaml"), { force: true });
const cleanGraphPath = path.join(cleanVaultRoot, "graph.yaml");
const cleanGraph = YAML.parse(fs.readFileSync(cleanGraphPath, "utf8"));
cleanGraph.edges = (cleanGraph.edges || []).filter(
  (edge) => ![edge.from, edge.to].includes("position-based-fluids"),
);
fs.writeFileSync(cleanGraphPath, YAML.stringify(cleanGraph), "utf8");
const cleanVault = readVaultForCli(cleanVaultRoot);

const valid = validateAiPackage(cleanVault, readAiPackage(fixtureRoot));
assert(valid.valid, `Expected fixture to be valid: ${valid.errors.join("; ")}`);

const diff = diffAiPackage(cleanVault, valid);
assert(diff.nodesToAdd.some((node) => node.id === "position-based-fluids"), "Expected diff to include position-based-fluids.");
assert(diff.edgesToAdd.some((edge) => edge.from === "sph" && edge.relation === "contains" && edge.to === "position-based-fluids"), "Expected diff to include structural contains edge.");
assert(diff.edgesToAdd.some((edge) => edge.from === "position-based-fluids" && edge.relation === "compares-with" && edge.to === "sph"), "Expected diff to include compares-with edge.");

const invalidRelationRoot = tempPackage("invalid-relation");
withPackageId(invalidRelationRoot, path.basename(invalidRelationRoot));
const invalidRelationPatch = readPatch(invalidRelationRoot);
invalidRelationPatch.operations.find((operation) => operation.type === "add_edge").relation = "related-to";
writePatch(invalidRelationRoot, invalidRelationPatch);
assert(!validateAiPackage(cleanVault, readAiPackage(invalidRelationRoot)).valid, "Expected invalid relation type to fail.");

const containsRoot = tempPackage("contains-edge");
withPackageId(containsRoot, path.basename(containsRoot));
const containsPatch = readPatch(containsRoot);
containsPatch.operations.find((operation) => operation.type === "add_edge").relation = "contains";
writePatch(containsRoot, containsPatch);
assert(!validateAiPackage(cleanVault, readAiPackage(containsRoot)).valid, "Expected add_edge contains to fail.");

const duplicateRoot = tempPackage("duplicate-node");
withPackageId(duplicateRoot, path.basename(duplicateRoot));
const duplicatePatch = readPatch(duplicateRoot);
const addNode = duplicatePatch.operations.find((operation) => operation.type === "add_node");
addNode.node.id = "sph";
writePatch(duplicateRoot, duplicatePatch);
assert(!validateAiPackage(cleanVault, readAiPackage(duplicateRoot)).valid, "Expected duplicate node id to fail.");

const scriptRoot = tempPackage("script-block");
withPackageId(scriptRoot, path.basename(scriptRoot));
const blockPath = path.join(scriptRoot, "block-types", "solver-loop-diagram.yaml");
fs.appendFileSync(blockPath, "\nscript: alert(1)\n", "utf8");
assert(!validateAiPackage(cleanVault, readAiPackage(scriptRoot)).valid, "Expected executable block field to fail.");

const tempVault = path.join(os.tmpdir(), `ai-import-apply-vault-${Date.now()}`);
fs.cpSync(cleanVaultRoot, tempVault, { recursive: true });
const applyResult = applyAiPackage(tempVault, fixtureRoot, { readVault: readVaultForCli });
assert(applyResult.created.includes("content/simulation/position-based-fluids/meta.yaml"), "Expected apply to create meta.yaml.");
const appliedGraph = fs.readFileSync(path.join(tempVault, "graph.yaml"), "utf8");
assert(appliedGraph.includes("sph-contains-position-based-fluids"), "Expected graph.yaml to include structural contains edge.");
assert(appliedGraph.includes("position-based-fluids-compares-with-sph"), "Expected graph.yaml to include compares-with edge.");
assert(
  fs.existsSync(path.join(tempVault, ".kb-ai", "history", "ai-import-20260610-position-based-fluids.yaml")),
  "Expected import history to be written.",
);

console.log("AI import MVP-B/D self-check passed.");
