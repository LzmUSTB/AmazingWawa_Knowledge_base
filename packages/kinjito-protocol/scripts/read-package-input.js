import fs from "node:fs";
import path from "node:path";
import { readAiPackage } from "../src/ai-import/read-ai-package.js";
import { readWawaPackageBuffer } from "../src/wawapkg/wawapkg.js";

export function readPackageInput(inputPath) {
  const resolved = path.resolve(inputPath);
  const stat = fs.statSync(resolved);
  if (stat.isDirectory()) return readAiPackage(resolved);
  if (stat.isFile() && resolved.toLowerCase().endsWith(".wawapkg")) {
    return readWawaPackageBuffer(fs.readFileSync(resolved), resolved);
  }
  throw new Error("Package input must be a package folder or .wawapkg file.");
}
