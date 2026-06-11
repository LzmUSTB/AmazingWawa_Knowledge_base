import YAML from "yaml";
import { KNOWLEDGE_STATUS, KNOWLEDGE_TYPES, RELATION_TYPES } from "../schema.js";
import { NATIVE_BLOCK_TYPES, getBlockRegistry } from "../block-registry.js";

const WAWAPKG_MIMETYPE = "application/x-wawa-kb-ai-import-package";

const AI_KB_GUIDE = `# Wawa Knowledge Base AI Guide

Final user-facing output must be a single .wawapkg file.

A .wawapkg is a ZIP-compatible archive with a custom extension. The archive root must contain:

\`\`\`text
mimetype
manifest.yaml
sources.yaml
patch.yaml
generated/
block-types/
review/
\`\`\`

The mimetype file must contain exactly:

\`\`\`text
${WAWAPKG_MIMETYPE}
\`\`\`

## Primary goal

Create learnable knowledge, not a loose summary. A good package should help the user understand, recall, connect, and apply the source material.

## Required planning

Before writing package files, internally create a plan and include it in \`review/import-plan.md\`:

1. source scope,
2. knowledge extraction,
3. candidate nodes and rejected nodes,
4. relation plan,
5. note format decision: \`markdown\`, \`html\`, or \`none\`,
6. block/asset plan,
7. quality self-check.

## Content format decision

Use \`contentFormat: markdown\` and \`note.md\` for compact structured notes.

Use \`contentFormat: html\` and \`note.html\` for high-quality tutorial/article notes, figure-heavy explanations, source-asset-heavy notes, and visual reading experiences.

Use \`contentFormat: none\` for empty placeholder nodes that should appear in the graph but intentionally have no note yet.

## Source asset policy

Prefer original source assets when they are public/stable and improve explanation. HTML notes may reference stable \`https://\` image/video URLs directly, but packaged local assets are preferred for durability.

For markdown notes, use local packaged assets only:

\`\`\`markdown
![Alt text](assets/example-diagram.png)
\`\`\`

## Domain rules

If DOMAIN_INDEX.yaml is empty, start with add_domain. If no suitable existing domain fits, create a small, stable, broad domain. Do not create excessive narrow domains.
`;

const NOTE_COMPOSITION_GUIDE = `# Note Composition Guide

A note should be a reusable learning unit. It should teach one knowledge object clearly enough that the user can review it later without reopening the original source.

Do not produce a loose article summary. Do not merely translate the source.

## Required content depth

Important notes should include:

1. precise definition,
2. problem solved,
3. core intuition,
4. mechanism,
5. formal/technical detail,
6. concrete examples,
7. parameters or variables,
8. common mistakes,
9. relation to other nodes,
10. review questions.

A note must not be more concise than the original source when the source is already clear and educational. For tutorial-style sources, preserve the teaching progression and add clarifying explanation.

## Format choice

Use Markdown when the note is card-like, compact, or block-driven.

Use HTML Rich Note when the material is figure-heavy, tutorial-like, visually staged, or has strong article flow.

Use empty node only when creating a planned placeholder with no note yet.
`;

const HTML_RICH_NOTE_GUIDE = `# HTML Rich Note Guide

## Purpose

HTML Rich Notes are for high-quality tutorial-style or figure-heavy notes. They should feel like polished knowledge pages inside the app, not standalone web pages.

## Required package structure

For an HTML note, \`meta.yaml\` must include:

\`\`\`yaml
contentFormat: html
\`\`\`

The node directory must include:

\`\`\`text
generated/content/<domain>/<node-id>/meta.yaml
generated/content/<domain>/<node-id>/note.html
\`\`\`

For an empty graph-only placeholder node, use:

\`\`\`yaml
contentFormat: none
\`\`\`

and omit both \`note.md\` and \`note.html\`.

## Fragment only

Generate an HTML fragment, not a full HTML document.

Allowed root pattern:

\`\`\`html
<article class="rich-note-article">
  ...
</article>
\`\`\`

Do not include:

\`\`\`text
<!doctype>
<html>
<head>
<body>
<style>
<script>
iframe
inline event handlers such as onclick
javascript: URLs
data: URLs
\`\`\`

## App style and font scale

HTML Rich Notes are rendered inside the knowledge base app. They must fit the app visual language:

- dark background,
- hard rectangular panels,
- thin borders,
- small accent bars,
- no soft consumer-card style,
- no excessive glow,
- no rounded decorative components.

Do not write custom inline styles. Use the approved classes below. The renderer supplies CSS that is driven by app variables such as \`--font-size-ui\`, \`--font-size-title\`, \`--font-size-note-title\`, \`--font-size-small\`, \`--font-size-mono\`, and \`--ui-font-scale\`. Therefore the HTML note will respond to the app font-size scale automatically.

## Approved classes

Use these classes:

\`\`\`text
rich-note-article
rich-hero
rich-kicker
rich-lead
rich-grid
rich-two-col
rich-three-col
rich-section
rich-section-head
rich-section-num
rich-card
rich-callout
rich-callout accent
rich-callout warn
rich-callout green
rich-figure-grid
rich-flow
rich-step
rich-compare
rich-badge-row
rich-badge
rich-asset-link
rich-prose
\`\`\`

## Allowed tags

Use semantic HTML:

\`\`\`text
article, section, header, nav, div, aside, figure, figcaption,
h1, h2, h3, h4, p, strong, em, code, pre,
ul, ol, li, table, thead, tbody, tr, th, td,
a, img, video, source, details, summary
\`\`\`

## Assets

For durable packages, prefer packaged local assets:

\`\`\`html
<img src="assets/fig-01-divergence-curl.png" alt="Divergence and curl visualization">
\`\`\`

If original source assets are public and stable, HTML notes may use HTTPS URLs directly:

\`\`\`html
<img src="https://example.com/source-image.png" alt="...">
<video controls src="https://example.com/source-video.mp4"></video>
\`\`\`

Every image/video must have surrounding explanatory text and a caption. Do not add decorative assets.

## Quality requirements

For tutorial-style sources, the HTML note must preserve and improve the source's teaching sequence. Do not shrink the source. Expand explanations, add transitions, define variables, and convert observations into reusable rules.
`;

const PACKAGE_SCHEMA_GUIDE = `# Wawa Package Schema Guide

## manifest.yaml

\`\`\`yaml
packageFormat: wawapkg
packageKind: import
schemaVersion: "1.1"
packageId: wawa-import-YYYYMMDD-topic-name
status: seed
preview:
  mode: in-app
  generatedHtmlPreview: false
\`\`\`

## add_node

\`\`\`yaml
- type: add_node
  node:
    id: curl-noise
    title: Curl Noise
    domain: computer-graphics
    type: concept
    status: growing
    summary: One sentence summary.
  parentId: computer-graphics
\`\`\`

Every add_node must include generated meta:

\`\`\`text
generated/content/<domain>/<node-id>/meta.yaml
\`\`\`

The generated meta must include and strictly match patch.yaml:

\`\`\`yaml
id: curl-noise
title: Curl Noise
domain: computer-graphics
type: concept
status: growing
summary: One sentence summary.
contentFormat: markdown # markdown | html | none
aliases: []
tags: []
sourceIds: []
\`\`\`

If \`contentFormat: markdown\`, include \`note.md\`.

If \`contentFormat: html\`, include \`note.html\`.

If \`contentFormat: none\`, do not include note.md or note.html; this creates a graph-visible empty node.

Allowed add_edge relations: depends-on, used-in, compares-with. Do not use contains in add_edge; parentId creates contains.
`;

const SOURCE_EXTRACTION_GUIDE = `# Source Extraction Guide

Extract reusable knowledge, not paragraph summaries.

For each source, derive:

- source scope,
- core claims,
- mechanisms,
- procedures,
- parameters/variables,
- concrete examples,
- limitations,
- misconceptions,
- candidate nodes,
- relation plan.

For visual/tutorial sources, preserve the author's explanatory sequence when it improves learning. Use original figures/videos when they are central to understanding.
`;

const NOTE_QUALITY_RUBRIC = `# Note Quality Rubric

Target score: 4 or higher.

## 5 Excellent

Precise definition, clear problem, mechanism, examples, parameters, mistakes, relations, review questions, and purposeful visuals.

## 4 Good

Usable and mostly complete. Clear mechanism and at least one concrete example.

## 3 Shallow

Structurally valid but too summary-like.

## 2 Poor

Mostly paraphrase with little mechanism.

## 1 Invalid

Incorrect, empty, or broken.

For rich HTML notes, also check:

- not shorter than the source,
- assets are used where needed,
- visual rhythm helps understanding,
- app style classes are used,
- no inline scripts/styles.
`;

const RELATION_SEMANTICS_GUIDE = `# Relation Semantics Guide

Relation types are frozen: contains, depends-on, used-in, compares-with.

## depends-on

A depends-on B means understanding B helps understand A.

## used-in

A used-in B means A is used as a technique/component inside B.

## compares-with

A compares-with B means they are alternatives or useful contrasts.

## contains

Hierarchy only. Usually created by parentId. Do not manually add with add_edge.
`;

function blockRegistryMarkdown(customBlocks) {
  return `# Block Registry

## Native Blocks

${NATIVE_BLOCK_TYPES.map((type) => `- ${type}`).join("\n")}

## Native Block Examples

Use native blocks for compact structured notes. Use HTML Rich Notes for tutorial/article pages that need full layout control.

## Custom Declarative Blocks

${customBlocks.length ? customBlocks.map((block) => `- ${block.type}: ${block.title || block.description || block.sourcePath}`).join("\n") : "- none installed"}
`;
}

function customBlockIndex(customBlocks) {
  return YAML.stringify({
    customBlockTypes: customBlocks.map((block) => ({
      type: block.type,
      title: block.title || "",
      kind: block.kind || "",
      sourcePath: block.sourcePath || "",
      engine: block.renderer?.engine || "",
    })),
  });
}

export function buildAiContextFiles(vault = {}) {
  const registry = getBlockRegistry(vault);
  const customBlocks = Object.values(registry.declarative || {});
  const domains = (vault.domains || []).map((domain) => ({
    id: domain.id,
    title: domain.title,
    description: domain.description || "",
    color: domain.color,
    order: domain.order,
  }));
  const nodes = (vault.nodes || [])
    .filter((node) => node.type !== "domain")
    .map((node) => {
      const note = (vault.notes || {})[node.id] || {};
      return {
        id: node.id,
        title: node.title,
        aliases: node.aliases || [],
        domain: node.domain,
        type: node.type,
        status: node.status,
        summary: node.summary || "",
        contentFormat: node.contentFormat || note.format || "markdown",
        hasNote: Boolean(note.markdown || note.html),
        path: {
          meta: node.filePath || "",
          note: note.filePath || "",
        },
        tags: node.tags || [],
      };
    });
  const edges = (vault.edges || []).map((edge) => ({
    id: edge.id,
    from: edge.from,
    to: edge.to,
    relation: edge.relation,
  }));

  return {
    "AI_KB_GUIDE.md": AI_KB_GUIDE,
    "SOURCE_EXTRACTION_GUIDE.md": SOURCE_EXTRACTION_GUIDE,
    "NOTE_COMPOSITION_GUIDE.md": NOTE_COMPOSITION_GUIDE,
    "NOTE_QUALITY_RUBRIC.md": NOTE_QUALITY_RUBRIC,
    "RELATION_SEMANTICS_GUIDE.md": RELATION_SEMANTICS_GUIDE,
    "PACKAGE_SCHEMA_GUIDE.md": PACKAGE_SCHEMA_GUIDE,
    "HTML_RICH_NOTE_GUIDE.md": HTML_RICH_NOTE_GUIDE,
    "BLOCK_REGISTRY.md": blockRegistryMarkdown(customBlocks),
    "CUSTOM_BLOCK_INDEX.yaml": customBlockIndex(customBlocks),
    "AI_CONTEXT.yaml": YAML.stringify({
      vault: vault.vault,
      generatedAt: new Date().toISOString(),
      constraints: {
        idPattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$",
        allowedDomains: domains.map((domain) => domain.id),
        canAddDomains: true,
        allowedNodeTypes: KNOWLEDGE_TYPES.filter((type) => type !== "domain"),
        allowedStatuses: KNOWLEDGE_STATUS.filter((status) => status !== "domain"),
        allowedRelations: RELATION_TYPES,
        allowedLinkRelations: ["depends-on", "used-in", "compares-with"],
        contentFormats: ["markdown", "html", "none"],
        packageFormat: "wawapkg",
        packageKind: "import",
        recommendedPackageIdPrefix: "wawa-import-",
        assetPolicy: {
          markdown: "local packaged assets only",
          html: "local packaged assets preferred; stable https source assets allowed",
        },
      },
      counts: {
        domains: domains.length,
        nodes: nodes.length,
        edges: edges.length,
        customBlockTypes: customBlocks.length,
      },
    }),
    "DOMAIN_INDEX.yaml": YAML.stringify({ domains }),
    "NODE_INDEX.yaml": YAML.stringify({ nodes }),
    "RELATION_INDEX.yaml": YAML.stringify({ relations: edges }),
  };
}
