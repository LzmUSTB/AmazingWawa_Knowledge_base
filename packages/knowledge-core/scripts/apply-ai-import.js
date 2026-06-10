#!/usr/bin/env node
import path from "node:path";
import { applyAiPackage } from "../src/ai-import/apply-ai-package.js";
import { readVaultForCli } from "./read-vault-for-cli.js";

function usage() {
  console.error("Usage: npm run kb:apply-ai-import -- ./vault ./vault/.kb-ai/imports/<packageId>");
}

const [vaultRoot, packageRoot] = process.argv.slice(2);
if (!vaultRoot || !packageRoot) {
  usage();
  process.exit(1);
}

try {
  const result = applyAiPackage(path.resolve(vaultRoot), path.resolve(packageRoot), {
    readVault: readVaultForCli,
  });
  console.log(`Applied AI import package: ${result.packageId}`);
  console.log(`Backup: ${result.backupRelativeDir}`);
  console.log(`Created: ${result.created.length}`);
  result.created.forEach((item) => console.log(`- ${item}`));
  console.log(`Modified: ${result.modified.length}`);
  result.modified.forEach((item) => console.log(`- ${item}`));
  process.exit(0);
} catch (error) {
  console.error(`Failed to apply AI import package: ${error?.message || error}`);
  process.exit(1);
}
