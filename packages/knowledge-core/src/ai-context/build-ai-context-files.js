import YAML from "yaml";
import { getBlockRegistry } from "../block-registry.js";
import { KNOWLEDGE_STATUS, KNOWLEDGE_TYPES, RELATION_TYPES } from "../schema.js";
import { RULE_PRIORITY, STATIC_CONTEXT_FILES } from "./static-context-files.js";

const WAWAPKG_MIMETYPE = "application/x-wawa-kb-ai-import-package";

const NATIVE_BLOCK_TYPES = [
  "concept-card",
  "process-flow",
  "compare-table",
  "code-explain",
  "quiz",
  "expression-visualizer",
];

function blockRegistryMarkdown(customBlocks) {
  const nativeList = NATIVE_BLOCK_TYPES.map((type) => `- ${type}`).join("\n");
  const customList = customBlocks.length
    ? customBlocks
        .map((block) => `- ${block.type}: ${block.title || block.description || block.sourcePath || "Custom declarative visual block"}`)
        .join("\n")
    : "- none installed";

  return `# Block Registry

## Native Blocks

${nativeList}

Use native blocks for compact Markdown explanations. Use \`note.html\` when source media, rich layout, or educational interaction is central. See \`NOTE_SCHEMA.md\`.

## Custom Declarative Blocks

${customList}
`;
}

function customBlockIndex(customBlocks) {
  return YAML.stringify({
    customBlockTypes: customBlocks.map((block) => ({
      type: block.type,
      title: block.title || "",
      kind: block.kind || "",
      description: block.description || "",
      sourcePath: block.sourcePath || "",
      engine: block.renderer?.engine || "",
      supportedElements: block.supportedElements || [],
    })),
  });
}

function inferContentFormat(node, note) {
  if (node?.contentFormat) return node.contentFormat;
  if (note?.format) return note.format;
  if (note?.html) return "html";
  if (note?.markdown) return "markdown";
  return "none";
}

function notePathSummary(note = {}) {
  const markdownPath = note.markdownPath || note.markdownFilePath || (note.markdown ? note.filePath || "" : "");
  const htmlPath = note.htmlPath || (note.html ? note.filePath || "" : "");
  return {
    note: note.filePath || markdownPath || htmlPath,
    markdown: markdownPath,
    html: htmlPath,
  };
}

function displayTitle(entity = {}) {
  return entity.titleLocale || entity.title || entity.id || "";
}

function contextSummary(vault, domains, nodes, edges, customBlocks) {
  const metadata = vault.vault || vault;
  const markdownNotes = nodes.filter((node) => node.hasMarkdownNote).length;
  const htmlNotes = nodes.filter((node) => node.hasHtmlNote).length;
  const exerciseSets = nodes.filter((node) => node.hasExerciseSet).length;

  return {
    exportMode: "stepwise-authoring",
    defaultAction: "ask-task-type",
    packageGeneration: "explicit-only",
    supportedTasks: [
      "node-architecture",
      "single-node-note",
      "single-node-exercises",
      "source-analysis-plan",
      "package-build",
      "package-fix",
    ],
    vault: {
      schemaVersion: metadata.schemaVersion || 1,
      title: metadata.title || "AmazingWawa Knowledge Base",
      description: metadata.description || "Local-first knowledge graph vault.",
      language: metadata.language || "zh-CN",
      defaultDomain: metadata.defaultDomain || domains[0]?.id || "",
    },
    generatedAt: new Date().toISOString(),
    contentCapabilities: {
      notes: {
        markdown: true,
        html: true,
      },
      exercises: {
        exerciseSetPerNode: true,
        path: "content/<domain>/<nodeId>/exercises.yaml",
      },
      stages: {
        layoutOnly: true,
        notContentOwner: true,
      },
    },
    constraints: {
      idPattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$",
      allowedDomains: domains.map((domain) => domain.id),
      canAddDomains: true,
      allowedNodeTypes: KNOWLEDGE_TYPES.filter((type) => type !== "domain"),
      allowedStatuses: KNOWLEDGE_STATUS.filter((status) => status !== "domain"),
      allowedRelations: RELATION_TYPES,
      allowedLinkRelations: ["depends-on", "used-in", "compares-with"],
      contentFormats: ["markdown", "html", "none"],
      patchShape: {
        topLevel: "object-with-operations-array",
        supportedOperations: ["add_domain", "add_node", "append_note_section", "append_exercise_set", "add_edge", "add_block_type", "propose_native_block"],
        addNode: "nested-node-object",
        addDomain: "nested-domain-object",
        addEdge: "flat-top-level-from-to-relation",
        appendExerciseSet: "one-operation-per-owner-node",
      },
      localeTitle: {
        titleRequired: true,
        titleLocaleRecommended: true,
        titleLocaleRequired: false,
        summaryLocaleRecommended: true,
        fallbackDisplay: "titleLocale || title || id",
      },
      package: {
        format: "wawapkg",
        kind: "import",
        mimetype: WAWAPKG_MIMETYPE,
        generationPolicy: "explicit-only",
      },
      assets: {
        generatedImagesAllowed: false,
        allowedLocalMediaRoots: ["assets/original/", "assets/source/", "assets/source-assets/", "assets/source-snapshot/"],
        forbidBareLocalMediaPaths: true,
        forbidUnreferencedPackagedAssets: true,
        sourceBlocksRequired: "conditional-when-source-material-is-used",
      },
      emptyNode: {
        contentFormat: "none",
        omitNoteFiles: true,
        visibleInGraph: true,
      },
      exerciseSet: {
        owner: "node",
        maximumPerNode: 1,
        stageBindingAllowed: false,
        path: "content/<domain>/<nodeId>/exercises.yaml",
        importBehavior: "append-only",
        requiredProblemFields: ["id", "mode", "type", "difficulty", "title", "prompt", "answer", "solution"],
        optionalProblemFields: ["hints"],
        allowedModes: ["recall", "practice"],
        allowedTypes: ["conceptual", "calculation", "proof", "derivation", "application", "comparison", "implementation", "diagnostic"],
        allowedDifficulties: ["introductory", "undergraduate", "undergraduate-advanced", "graduate", "research-oriented"],
        modeDecision: {
          recallOnlyFor: [
            "definitions",
            "formulas",
            "named terms",
            "named theorems",
            "symbol conventions",
            "durable rules or criteria",
            "compact reusable concept cards",
          ],
          practiceFor: [
            "calculation",
            "proof",
            "derivation",
            "application",
            "comparison",
            "implementation",
            "diagnostic",
            "reasoning-based conceptual questions",
          ],
          diagnosticMode: "practice",
          defaultWhenUnsure: "practice",
          modeMustBeExplicit: true,
        },
        runtimeProgress: {
          recall: "Anki-like review: Wrong/Hard/Good/Easy, mastery, ease, intervalDays, dueAt",
          practice: "single current answer state: userAnswer, result correct/wrong, answeredAt, updatedAt",
        },
        forbiddenProblemFields: [
          "mistakeTags",
          "errorCategory",
          "weaknessCategory",
          "aiJudgement",
          "attempts",
          "accuracy",
          "attemptsLog",
        ],
        qualityGate: [
          "targets the owner node's actual knowledge",
          "solution explains reasoning, not just answer",
          "practice requires real work",
          "recall is used sparingly for reusable memory objects",
          "difficulty matches the actual task",
          "no duplicate, near-duplicate, trivia, or source-paraphrase problems",
        ],
      },
    },
    counts: {
      domains: domains.length,
      nodes: nodes.length,
      edges: edges.length,
      markdownNotes,
      htmlNotes,
      exerciseSets,
      customBlockTypes: customBlocks.length,
    },
  };
}

export function buildAiContextFiles(vault = {}) {
  const registry = getBlockRegistry(vault);
  const customBlocks = Object.values(registry.declarative || {});
  const exercisesByNodeId = vault.exercises?.byNodeId || {};

  const domains = (vault.domains || []).map((domain) => ({
    id: domain.id,
    title: domain.title,
    titleLocale: domain.titleLocale || domain.title_locale || "",
    displayTitle: displayTitle(domain),
    description: domain.description || "",
    descriptionLocale: domain.descriptionLocale || domain.description_locale || "",
    color: domain.color,
    order: domain.order,
  }));

  const notes = vault.notes || {};
  const nodes = (vault.nodes || [])
    .filter((node) => node.type !== "domain")
    .map((node) => {
      const note = notes[node.id] || {};
      const exerciseSet = exercisesByNodeId[node.id];
      const hasMarkdownNote = Boolean(note.markdown);
      const hasHtmlNote = Boolean(note.html);
      return {
        id: node.id,
        title: node.title,
        titleLocale: node.titleLocale || node.title_locale || "",
        displayTitle: displayTitle(node),
        aliases: node.aliases || [],
        domain: node.domain,
        type: node.type,
        status: node.status,
        summary: node.summary || "",
        summaryLocale: node.summaryLocale || node.summary_locale || "",
        contentFormat: inferContentFormat(node, note),
        hasNote: hasMarkdownNote || hasHtmlNote,
        hasMarkdownNote,
        hasHtmlNote,
        hasExerciseSet: Boolean(exerciseSet),
        path: {
          meta: node.filePath || "",
          ...notePathSummary(note),
          exercises: exerciseSet?.filePath || "",
        },
        tags: node.tags || [],
      };
    });

  const edges = (vault.edges || []).map((edge) => ({
    id: edge.id,
    from: edge.from,
    to: edge.to,
    relation: edge.relation,
    reason: edge.reason || "",
  }));

  return {
    ...STATIC_CONTEXT_FILES,
    "AI_CONTEXT.yaml": YAML.stringify(contextSummary(vault, domains, nodes, edges, customBlocks)),
    "RULE_PRIORITY.yaml": YAML.stringify(RULE_PRIORITY),
    "DOMAIN_INDEX.yaml": YAML.stringify({ domains }),
    "NODE_INDEX.yaml": YAML.stringify({ nodes }),
    "RELATION_INDEX.yaml": YAML.stringify({ relations: edges }),
    "CUSTOM_BLOCK_INDEX.yaml": customBlockIndex(customBlocks),
    "BLOCK_REGISTRY.md": blockRegistryMarkdown(customBlocks),
  };
}
