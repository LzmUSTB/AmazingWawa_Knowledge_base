import YAML from "yaml";
import { WAWAPKG_SCHEMA_VERSION, PROTOCOL_VERSION } from "./protocol-version.js";
import { normalizeAiPackageFiles } from "./ai-import/normalize-ai-package-files.js";

const PROPOSAL_MAJOR = "1";

function assertObject(value, label) {
  if (!value || Array.isArray(value) || typeof value !== "object") throw new Error(`${label} must be an object.`);
}

export function proposalToAiPackageFiles(proposal) {
  assertObject(proposal, "Proposal");
  const version = String(proposal.protocolVersion || "");
  if (version.split(".")[0] !== PROPOSAL_MAJOR) throw new Error(`Unsupported proposal protocolVersion: ${version || "missing"}`);
  const packageId = String(proposal.packageId || "").trim();
  if (!/^(?:ai|wawa)-import-[a-z0-9-]+$/.test(packageId)) throw new Error("Proposal packageId must start with ai-import- or wawa-import- and use lowercase kebab-case.");
  if (!Array.isArray(proposal.operations)) throw new Error("Proposal operations must be an array.");
  assertObject(proposal.generatedTextFiles || {}, "Proposal generatedTextFiles");
  assertObject(proposal.generatedBinaryFiles || {}, "Proposal generatedBinaryFiles");

  const text = proposal.generatedTextFiles || {};
  const binary = proposal.generatedBinaryFiles || {};
  const manifest = {
    schemaVersion: WAWAPKG_SCHEMA_VERSION,
    packageFormat: "wawapkg",
    packageKind: "import",
    packageId,
    title: proposal.title || proposal.source?.title || packageId,
    status: "ready",
    protocolVersion: version || PROTOCOL_VERSION,
    preview: { mode: "in-app", generatedHtmlPreview: false },
  };
  const sources = { sources: proposal.source ? [{ id: "chat-source", ...proposal.source }] : [] };
  const result = {
    packageId,
    packageFormat: "wawapkg",
    manifestRaw: YAML.stringify(manifest),
    sourcesRaw: YAML.stringify(sources),
    patchRaw: YAML.stringify({ operations: proposal.operations }),
    generatedMetaFiles: {},
    generatedNoteFiles: {},
    generatedHtmlNoteFiles: {},
    generatedExerciseFiles: {},
    generatedConceptMapFiles: {},
    assetFiles: [],
    blockTypeFiles: {},
    reviewFiles: { ...(proposal.reviewFiles || {}) },
  };
  for (const [filePath, contents] of Object.entries(text)) {
    if (/^generated\/content\/[^/]+\/[^/]+\/meta\.yaml$/.test(filePath)) result.generatedMetaFiles[filePath] = String(contents);
    else if (/^generated\/content\/[^/]+\/[^/]+\/note\.md$/.test(filePath)) result.generatedNoteFiles[filePath] = String(contents);
    else if (/^generated\/content\/[^/]+\/[^/]+\/note\.html$/.test(filePath)) result.generatedHtmlNoteFiles[filePath] = String(contents);
    else if (/^generated\/content\/[^/]+\/[^/]+\/exercises\.yaml$/.test(filePath)) result.generatedExerciseFiles[filePath] = String(contents);
    else if (/^generated\/concept-maps\/[^/]+\.ya?ml$/.test(filePath)) result.generatedConceptMapFiles[filePath] = String(contents);
    else if (/^block-types\/[^/]+\.ya?ml$/.test(filePath)) result.blockTypeFiles[filePath] = String(contents);
    else if (/^review\//.test(filePath)) result.reviewFiles[filePath] = String(contents);
    else throw new Error(`Unsupported generated text path: ${filePath}`);
  }
  for (const [filePath, value] of Object.entries(binary)) {
    const match = filePath.match(/^generated\/content\/([^/]+)\/([^/]+)\/assets\/(.+)$/);
    if (!match) throw new Error(`Unsupported generated binary path: ${filePath}`);
    const base64 = typeof value === "string" ? value : value.base64;
    const bytes = Buffer.from(base64 || "", "base64");
    result.assetFiles.push({
      packageRelativePath: filePath,
      vaultRelativePath: `content/${match[1]}/${match[2]}/assets/${match[3]}`,
      base64: bytes.toString("base64"),
      mimeType: typeof value === "object" ? value.mimeType || "application/octet-stream" : "application/octet-stream",
      size: bytes.length,
    });
  }
  return normalizeAiPackageFiles(result);
}

export function createProposalEnvelope(input = {}) {
  return {
    protocolVersion: PROTOCOL_VERSION,
    packageId: input.packageId,
    source: input.source || { type: "chat", title: "", capturedAt: new Date().toISOString() },
    operations: input.operations || [],
    generatedTextFiles: input.generatedTextFiles || {},
    generatedBinaryFiles: input.generatedBinaryFiles || {},
    reviewFiles: input.reviewFiles || {},
  };
}
