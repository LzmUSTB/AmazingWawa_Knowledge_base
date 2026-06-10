#!/usr/bin/env node
import path from "node:path";
import { diffAiPackage, validateAiPackage } from "../src/index.js";
import { readVaultForCli } from "./read-vault-for-cli.js";
import { readPackageInput } from "./read-package-input.js";

function usage() {
  console.error("Usage: npm run kb:diff-ai-import -- ./vault ./package.wawapkg");
}

function printList(title, items, formatter) {
  console.log(`\n${title}:`);
  if (!items.length) {
    console.log("- none");
    return;
  }
  items.forEach((item) => console.log(`- ${formatter(item)}`));
}

const [vaultRoot, packageRoot] = process.argv.slice(2);
if (!vaultRoot || !packageRoot) {
  usage();
  process.exit(1);
}

try {
  const vault = readVaultForCli(vaultRoot);
  const validation = validateAiPackage(vault, readPackageInput(path.resolve(packageRoot)));
  const diff = diffAiPackage(vault, validation);
  console.log(`Import diff: ${validation.previewModel.packageId}`);
  console.log(`Validation: ${validation.valid ? "valid" : "invalid"} (${validation.errors.length} errors, ${validation.warnings.length} warnings)`);

  printList("Files to create", diff.filesToCreate, (file) => `${file.path} (${file.kind})`);
  printList("Files to modify", diff.filesToModify, (file) => `${file.path} (${file.kind})`);
  printList("Nodes to add", diff.nodesToAdd, (node) => `${node.id} / ${node.domain} / parent ${node.parentId}`);
  printList("Edges to add", diff.edgesToAdd, (edge) => `${edge.from} ${edge.relation} ${edge.to}`);
  printList("Block types to add", diff.blockTypesToAdd, (block) => `${block.type} / ${block.kind} / ${block.engine}`);
  printList("Note previews", diff.notePreviews, (preview) => `${preview.nodeId} (${preview.mode}, ${preview.markdown.length} chars)`);
  printList("Review items", diff.reviewItems, (item) => `${item.title}: ${item.message}`);

  if (validation.errors.length) {
    console.log("\nErrors:");
    validation.errors.forEach((error) => console.log(`- ${error}`));
  }
  if (validation.warnings.length) {
    console.log("\nWarnings:");
    validation.warnings.forEach((warning) => console.log(`- ${warning}`));
  }
  process.exit(validation.valid ? 0 : 1);
} catch (error) {
  console.error(`Failed to diff import package: ${error?.message || error}`);
  process.exit(1);
}
