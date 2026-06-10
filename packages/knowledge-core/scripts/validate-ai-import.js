#!/usr/bin/env node
import path from "node:path";
import { validateAiPackage } from "../src/index.js";
import { readVaultForCli } from "./read-vault-for-cli.js";
import { readPackageInput } from "./read-package-input.js";

function usage() {
  console.error("Usage: npm run kb:validate-ai-import -- ./vault ./package.wawapkg");
}

const [vaultRoot, packageRoot] = process.argv.slice(2);
if (!vaultRoot || !packageRoot) {
  usage();
  process.exit(1);
}

try {
  const vault = readVaultForCli(vaultRoot);
  const result = validateAiPackage(vault, readPackageInput(path.resolve(packageRoot)));
  console.log(`${result.valid ? "VALID" : "INVALID"} import package: ${result.previewModel.packageId}`);
  console.log(`Operations: ${result.previewModel.operationCount}`);
  console.log(`Package block types: ${result.previewModel.packageBlockTypes.join(", ") || "none"}`);
  if (result.errors.length) {
    console.log("\nErrors:");
    result.errors.forEach((error) => console.log(`- ${error}`));
  }
  if (result.warnings.length) {
    console.log("\nWarnings:");
    result.warnings.forEach((warning) => console.log(`- ${warning}`));
  }
  if (result.reviewItems.length) {
    console.log("\nReview items:");
    result.reviewItems.forEach((item) => console.log(`- ${item.title}: ${item.message}`));
  }
  process.exit(result.valid ? 0 : 1);
} catch (error) {
  console.error(`Failed to validate import package: ${error?.message || error}`);
  process.exit(1);
}
