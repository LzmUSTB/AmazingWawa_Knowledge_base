#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { readWawaPackageBuffer, writeWawaPackageBuffer } from "../src/wawapkg/wawapkg.js";
import { readPackageInput } from "./read-package-input.js";

const [packageRootArg, outputArg] = process.argv.slice(2);
if (!packageRootArg || !outputArg) {
  console.error("Usage: npm run kb:pack-ai-import -- ./package-folder ./wawa-import-xxx.wawapkg");
  process.exit(1);
}

try {
  const outputPath = path.resolve(outputArg);
  if (!outputPath.toLowerCase().endsWith(".wawapkg")) throw new Error("Output file must use .wawapkg extension.");
  const archive = writeWawaPackageBuffer(readPackageInput(path.resolve(packageRootArg)));
  readWawaPackageBuffer(archive, outputPath);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, archive);
  console.log(`Packed .wawapkg: ${outputPath}`);
} catch (error) {
  console.error(`Failed to pack .wawapkg: ${error?.message || error}`);
  process.exit(1);
}
