import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import YAML from "yaml";
import {
  EXERCISE_MODES,
  PROTOCOL_METADATA,
  RELATION_TYPES,
  buildExerciseIndex,
  parseExerciseProgress,
} from "../src/index.js";
import { createProposalEnvelope, proposalToAiPackageFiles } from "../src/proposal.js";
import { readWawaPackageBuffer, writeWawaPackageBuffer } from "../src/wawapkg/wawapkg.js";

const fixture = JSON.parse(fs.readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../fixtures/wawapkg-contract/cases.json"), "utf8"));

function baseProposal(overrides = {}) {
  return createProposalEnvelope({
    packageId: "wawa-import-protocol-test",
    source: { type: "chat", title: "Protocol test", capturedAt: "2026-07-11T00:00:00Z" },
    ...overrides,
  });
}

test("exports stable schema and version metadata", () => {
  assert.equal(PROTOCOL_METADATA.protocolVersion, "1.0.0");
  assert.deepEqual(EXERCISE_MODES, ["recall", "practice"]);
  assert.deepEqual(RELATION_TYPES, ["contains", "depends-on", "used-in", "compares-with"]);
  assert.equal(fixture.cases.length, 10);
});

test("proposal converts and .wawapkg round-trips HTML with local CSS/JS/image assets", () => {
  const proposal = baseProposal({
    operations: [{ type: "add_node", parentId: "math", node: { id: "demo", title: "Demo", domain: "math", type: "concept", status: "seed", contentFormat: "html" } }],
    generatedTextFiles: {
      "generated/content/math/demo/meta.yaml": YAML.stringify({ id: "demo", title: "Demo", domain: "math", type: "concept", status: "seed", contentFormat: "html" }),
      "generated/content/math/demo/note.html": "<!doctype html><link rel=\"stylesheet\" href=\"assets/style.css\"><script src=\"assets/app.js\"></script>"
    },
    generatedBinaryFiles: {
      "generated/content/math/demo/assets/style.css": Buffer.from("body{color:black}").toString("base64"),
      "generated/content/math/demo/assets/app.js": Buffer.from("document.body.dataset.ready='1'").toString("base64"),
      "generated/content/math/demo/assets/image.png": Buffer.from([137,80,78,71]).toString("base64")
    },
  });
  const files = proposalToAiPackageFiles(proposal);
  const roundTrip = readWawaPackageBuffer(writeWawaPackageBuffer(files), "test.wawapkg");
  assert.match(roundTrip.generatedHtmlNoteFiles["generated/content/math/demo/note.html"], /script/);
  assert.deepEqual(roundTrip.assetFiles.map((asset) => path.extname(asset.packageRelativePath)).sort(), [".css", ".js", ".png"]);
});

test("writer rejects traversal and executable assets", () => {
  const files = proposalToAiPackageFiles(baseProposal());
  files.reviewFiles["review/../evil.txt"] = "bad";
  assert.throws(() => writeWawaPackageBuffer(files), /unsafe path/);
  delete files.reviewFiles["review/../evil.txt"];
  files.assetFiles.push({ packageRelativePath: "generated/content/math/demo/assets/run.exe", vaultRelativePath: "content/math/demo/assets/run.exe", base64: "", size: 0 });
  assert.throws(() => writeWawaPackageBuffer(files), /Unsupported asset file type/);
});

test("ExerciseSet enforces diagnostic/practice and strips practice scheduling history", () => {
  const exerciseFiles = { "content/math/demo/exercises.yaml": YAML.stringify({ version: 1, nodeId: "demo", title: "Demo", problems: [{ id: "p1", mode: "recall", type: "diagnostic", difficulty: "introductory", title: "D", prompt: "P", answer: "A", solution: "S" }] }) };
  const exercises = buildExerciseIndex(exerciseFiles);
  assert.ok(exercises.byNodeId.demo.errors.some((error) => error.includes("diagnostic")));
  const validExercises = buildExerciseIndex({ "content/math/demo/exercises.yaml": exerciseFiles["content/math/demo/exercises.yaml"].replace("mode: recall", "mode: practice") });
  const progress = parseExerciseProgress(YAML.stringify({ version: 2, problems: { "demo/p1": { mode: "practice", attempts: 9, accuracy: 1, attemptsLog: [{ result: "wrong", userAnswer: "old", at: "old" }], userAnswer: "latest", result: "correct", answeredAt: "now", updatedAt: "now" } } }), validExercises);
  assert.deepEqual(Object.keys(progress.problems["demo/p1"]).sort(), ["answeredAt", "exerciseSetNodeId", "mode", "problemId", "result", "updatedAt", "userAnswer"].sort());
});
