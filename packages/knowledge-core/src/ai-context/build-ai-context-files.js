
import YAML from "yaml";
import { KNOWLEDGE_STATUS, KNOWLEDGE_TYPES, RELATION_TYPES } from "../schema.js";
import { NATIVE_BLOCK_TYPES, getBlockRegistry } from "../block-registry.js";

const WAWAPKG_MIMETYPE = "application/x-wawa-kb-ai-import-package";

const AI_KB_GUIDE = "# Wawa Knowledge Base AI Guide\n\n## Final output\n\nFinal user-facing output must be a single `.wawapkg` file.\n\nA `.wawapkg` is a ZIP-compatible archive. The archive root must contain:\n\n```text\nmimetype\nmanifest.yaml\nsources.yaml\npatch.yaml\ngenerated/\nblock-types/\nreview/\n```\n\nThe `mimetype` file must contain exactly:\n\n```text\napplication/x-wawa-kb-ai-import-package\n```\n\n## Primary goal\n\nCreate learnable knowledge, not a loose summary. A good package should help the user understand, recall, connect, and apply the source material.\n\n## Required planning\n\nBefore writing package files, create a plan and include it in `review/import-plan.md`:\n\n1. source scope,\n2. knowledge extraction,\n3. candidate nodes and rejected nodes,\n4. relation plan,\n5. note format decision: `markdown`, `html`, or `none`,\n6. block/asset plan,\n7. quality self-check.\n\n## Content format decision\n\nUse `contentFormat: markdown` and `note.md` for compact structured notes.\n\nUse `contentFormat: html` and `note.html` for high-quality tutorial/article notes, figure-heavy explanations, source-asset-heavy notes, and visual reading experiences.\n\nUse `contentFormat: none` for empty placeholder nodes that should appear in the graph but intentionally have no note yet.\n\n## Source asset policy\n\nPrefer original source assets when they are public/stable and improve explanation. HTML notes may reference stable `https://` image/video URLs directly, but packaged local assets are preferred for durability.\n\nFor Markdown notes, use local packaged assets only:\n\n```markdown\n![Alt text](assets/example-diagram.png)\n```\n\n## Output language\n\nWrite explanatory note content in Chinese by default. Keep standard technical terms in English when they are more precise.\n\nDo not mechanically translate English. Explain mechanisms.\n\n## Domain rules\n\nIf `DOMAIN_INDEX.yaml` is empty, start with `add_domain`. If no suitable existing domain fits, create a small, stable, broad domain. Do not create excessive narrow domains.\n";
const SOURCE_EXTRACTION_GUIDE = "# Source Extraction Guide\n\nExtract reusable knowledge, not paragraph summaries.\n\nFor each source, derive:\n\n- source identity,\n- source scope,\n- core claims,\n- mechanisms,\n- procedures,\n- parameters and variables,\n- concrete examples,\n- limitations,\n- misconceptions,\n- candidate nodes,\n- relation plan.\n\n## Tutorial / visual source rule\n\nFor visual/tutorial sources, preserve the teaching sequence when it improves learning.\n\nIf the source already explains something clearly, the note must not shrink it. Expand it by adding transitions, variable definitions, implementation implications, and review questions.\n\nPrefer original figures/videos when they are central to understanding.\n\n## Candidate node protocol\n\nBefore writing files, list candidate nodes:\n\n```yaml\ncandidate_nodes:\n  - id:\n    type: topic | concept | skill | question | paper | tool | project\n    why_node:\n    keep_or_reject:\n    reason:\n```\n\nReject nodes that are too small, duplicate, or only source-specific.\n";
const NOTE_COMPOSITION_GUIDE = "# Note Composition Guide\n\nA note should be a reusable learning unit. It should teach one knowledge object clearly enough that the user can review it later without reopening the original source.\n\nDo not produce a loose article summary. Do not merely translate the source.\n\n## Node granularity\n\nEach note should correspond to one reusable knowledge object.\n\nGood node objects:\n\n- concept: `Curl Noise`\n- mechanism: `Pressure Projection`\n- skill: `Authoring Curl Noise Inputs`\n- question: `Can Curl Noise Tile Seamlessly?`\n- comparison: `Curl Noise vs Flow Map`\n- procedure: `Generating Flipbook VFX`\n\nBad node objects:\n\n- an entire source article as one node when the source contains multiple reusable concepts,\n- one node per minor paragraph,\n- vague titles such as `Interesting Notes`,\n- source-specific titles with no reusable meaning.\n\n## Required note structure\n\nA high-quality note should include most of the following, adapted to content type:\n\n1. precise definition,\n2. problem solved,\n3. core intuition,\n4. mechanism and cause-effect,\n5. formal/technical detail,\n6. concrete examples,\n7. parameters or variables,\n8. common mistakes,\n9. relation to other nodes,\n10. review questions.\n\n## Tutorial-style source rule\n\nWhen a source is already a clear tutorial or article, the note must be at least as detailed as the source. It may reorganize or expand, but must not omit important examples, insights, figures, videos, or authoring observations.\n\nUse a direct teaching voice. Do not say `原文中说`, `这篇文章提到`, or `作者表示` inside the note body. Explain the concept as knowledge.\n\n## Markdown and block syntax\n\nUse triple-colon content block syntax. The block body is YAML.\n\nUse content blocks when they improve learning, not to decorate.\n\n## Depth requirements\n\nEach important concept note should include at least one of:\n\n```text\n- changing X affects Y because Z\n- step A -> B -> C\n- A differs from B in mechanism or use case\n- implementation representation in code/shader/data\n- failure mode or limitation\n```\n";
const HTML_RICH_NOTE_GUIDE = "# HTML Rich Note Guide\n\n## Purpose\n\nHTML Rich Notes are for high-quality tutorial-style or figure-heavy notes. They should feel like polished knowledge pages inside the app, not standalone web pages.\n\nUse HTML when Markdown + content blocks would flatten the explanation, especially for:\n\n- article-like tutorials,\n- figure-heavy VFX/graphics notes,\n- paper explanations with diagrams,\n- step-by-step visual workflows,\n- source-asset-heavy notes,\n- material where the original teaching rhythm matters.\n\n## Required package structure\n\nFor an HTML note, `meta.yaml` must include:\n\n```yaml\ncontentFormat: html\n```\n\nThe node directory must include:\n\n```text\ngenerated/content/<domain>/<node-id>/meta.yaml\ngenerated/content/<domain>/<node-id>/note.html\n```\n\nFor an empty graph-only placeholder node, use:\n\n```yaml\ncontentFormat: none\n```\n\nand omit both `note.md` and `note.html`.\n\n## Fragment only\n\nGenerate an HTML fragment, not a full HTML document.\n\nAllowed root pattern:\n\n```html\n<article class=\"rich-note-article\">\n  ...\n</article>\n```\n\nDo not include:\n\n```text\n<!doctype>\n<html>\n<head>\n<body>\n<style>\n<script>\niframe\ninline event handlers such as onclick\njavascript: URLs\ndata: URLs\n```\n\n## App style and font scale\n\nHTML Rich Notes are rendered inside the knowledge base app. They must fit the app visual language:\n\n- dark background,\n- hard rectangular panels,\n- thin borders,\n- small accent bars,\n- high contrast,\n- technical/HUD-like structure,\n- no soft consumer-card style,\n- no excessive glow,\n- no rounded decorative components.\n\nDo not write custom inline styles. Use approved classes.\n\nThe renderer supplies CSS driven by app variables such as:\n\n```text\n--font-size-ui\n--font-size-title\n--font-size-note-title\n--font-size-small\n--font-size-mono\n--ui-font-scale\n```\n\nTherefore the HTML note will respond to the app font-size scale automatically.\n\n## Approved classes\n\nUse these classes:\n\n```text\nrich-note-article\nrich-hero\nrich-kicker\nrich-lead\nrich-grid\nrich-two-col\nrich-three-col\nrich-section\nrich-section-head\nrich-section-num\nrich-card\nrich-callout\nrich-callout accent\nrich-callout warn\nrich-callout green\nrich-figure-grid\nrich-flow\nrich-step\nrich-compare\nrich-badge-row\nrich-badge\nrich-asset-link\nrich-prose\nrich-equation\n```\n\nDo not invent arbitrary class names unless the current context explicitly documents them.\n\n## Allowed tags\n\nUse semantic HTML:\n\n```text\narticle, section, header, nav, div, aside, figure, figcaption,\nh1, h2, h3, h4, p, strong, em, code, pre,\nul, ol, li, table, thead, tbody, tr, th, td,\na, img, video, audio, source, details, summary\n```\n\n## Assets\n\nFor durable packages, prefer packaged local assets:\n\n```html\n<img src=\"assets/fig-01-divergence-curl.png\" alt=\"Divergence and curl visualization\">\n```\n\nIf original source assets are public and stable, HTML notes may use HTTPS URLs directly:\n\n```html\n<img src=\"https://example.com/source-image.png\" alt=\"...\">\n<video controls src=\"https://example.com/source-video.mp4\"></video>\n```\n\nEvery image/video must have surrounding explanatory text and a caption. Do not add decorative assets.\n\n## Content requirements\n\nFor tutorial-style sources, the HTML note must preserve and improve the source's teaching sequence. Do not shrink the source.\n\nThe HTML note should:\n\n1. explain the concept directly in the AI's own teaching voice,\n2. keep all important insights from the source,\n3. expand mechanisms and variables,\n4. include original assets when useful,\n5. add transitions between sections,\n6. turn observations into reusable rules,\n7. end with review questions or takeaways.\n\nAvoid phrases such as:\n\n```text\n原文中说...\n这篇文章提到...\n作者在这里表示...\n```\n\nUse direct explanation instead:\n\n```text\nCurl Noise 的关键是...\n当 rotation 偏离 90° 时...\n这个现象说明...\n```\n";
const NOTE_QUALITY_RUBRIC = "# Note Quality Rubric\n\nTarget score: 4 or higher.\n\n## 5 Excellent\n\nPrecise definition, clear problem, mechanism, examples, parameters, mistakes, relations, review questions, and purposeful visuals. Tutorial-style notes preserve and improve the original teaching rhythm.\n\n## 4 Good\n\nUsable and mostly complete. Clear mechanism and at least one concrete example.\n\n## 3 Shallow\n\nStructurally valid but too summary-like.\n\n## 2 Poor\n\nMostly paraphrase with little mechanism. Tutorial source is heavily compressed.\n\n## 1 Invalid\n\nIncorrect, empty, misleading, or broken.\n\n## Mandatory self-check\n\nFor each note, answer in `review/validation-checklist.md`:\n\n```yaml\nnote_quality:\n  node_id:\n  contentFormat: markdown | html | none\n  estimated_score:\n  strongest_part:\n  weakest_part:\n  missing_information:\n  revision_done: true | false\n```\n\nFor rich HTML notes, also check:\n\n- not shorter than the source when source is already clear,\n- original assets are used where needed,\n- visual rhythm helps understanding,\n- app style classes are used,\n- font-size scale can affect all text,\n- no inline scripts/styles.\n";
const RELATION_SEMANTICS_GUIDE = "# Relation Semantics Guide\n\nRelation types are frozen: contains, depends-on, used-in, compares-with.\n\nDo not create new relation types.\n\n## contains\n\nHierarchy only. Usually generated by `parentId`. Do not manually add with `add_edge`.\n\n## depends-on\n\n`A depends-on B` means understanding B helps understand A.\n\nDirection matters.\n\nExample:\n\n```text\ncurl-noise depends-on divergence-and-curl\n```\n\n## used-in\n\n`A used-in B` means A is a technique/component/concept used inside B.\n\nExample:\n\n```text\ncurl-noise used-in real-time-vfx\n```\n\n## compares-with\n\nA and B are alternatives, contrasts, or related concepts that answer similar questions.\n\nExample:\n\n```text\ncurl-noise compares-with flow-map\n```\n\n## Relation quality rules\n\nDo not create edges just because two concepts appeared in the same article.\n\nEvery non-contains relation should be explainable in one sentence.\n";
const BLOCK_CREATION_POLICY = "# Block Creation Policy\n\nPrefer existing native blocks. Create declarative visual blocks only when existing blocks are insufficient.\n\nIf a simple static diagram or image is enough, prefer a packaged local asset image.\n\nIf interaction, structured comparison, semantic highlighting, repeated geometry, labeled technical structure, or staged inspection is needed, use a declarative visual block.\n\nUse HTML Rich Notes when the whole note needs article-like layout and visual reading flow.\n\nPackages cannot create relation types, native renderer code, executable logic, or app components.\n\nDo not include executable JS, Vue, CSS, full HTML documents, script, iframe, eval, inline event handlers, or remote executable resources.\n\n## Block decision matrix\n\n| Teaching goal | Preferred representation |\n|---|---|\n| Define a concept | concept-card |\n| Show a process | process-flow |\n| Compare alternatives | compare-table |\n| Explain code | code-explain |\n| Test recall | quiz |\n| Show safe scalar formula behavior | expression-visualizer |\n| Show vector fields / architecture | declarative visual or HTML note |\n| Preserve a full tutorial reading flow | HTML Rich Note |\n";
const CONTENT_BLOCK_USAGE_GUIDE = "# Content Block Usage Guide\n\nUse content blocks to improve learning density and clarity. Do not use blocks as decoration.\n\nFor full tutorial/article presentation, use `contentFormat: html` instead of stacking many unrelated blocks.\n\n## concept-card\n\nUse for definition, why it matters, and core intuition.\n\n## process-flow\n\nUse for pipelines, algorithms, authoring workflows, dependency chains, and cause-effect stages.\n\nUse stable ids and `depends_on`.\n\n## compare-table\n\nUse for technique comparisons, tradeoffs, alternatives, and misconception correction.\n\nRows should be conceptual dimensions, not random facts.\n\n## code-explain\n\nUse for shader code, pseudo-code, formulas translated into algorithm, or data transformation steps.\n\n## quiz\n\nUse for review questions, misconception checks, and transfer of knowledge.\n\n## expression-visualizer\n\nUse only when the expression is a scalar 2D curve or scalar 3D surface, a safe render spec is provided, and parameters have meaningful slider ranges.\n\n## declarative visual blocks\n\nUse when structured labels and relationships matter.\n\n## packaged images\n\nUse when source material has a useful figure or the visual depends on raster detail.\n";
const DECLARATIVE_VISUAL_GRAMMAR_GUIDE = "# Declarative Visual Grammar Guide\n\nCustom block-types live in `block-types/*.yaml` and must use:\n\n```yaml\nkind: declarative-visual\nrenderer:\n  engine: visual-grammar\n```\n\nUse declarative visual blocks when the note needs labeled nodes, explicit arrows, staged diagrams, formula callouts, simple geometry, or repeated visual elements based on block data.\n\n## Supported layout types\n\n- split-panel\n- stack\n- grid\n\n## Supported panel types\n\n- svg-scene\n- inspector\n\n## Supported element types\n\n- node\n- edge\n- arrow\n- label\n- text\n- badge\n- formula-callout\n- rect\n- line\n- circle\n\nCoordinates use normalized 2D values in [0, 1].\n\n## Data binding\n\nElements may bind to note block data with `$.` paths.\n\n```yaml\nelements:\n  - type: node\n    each: $.items\n    template:\n      id: $.id\n      label: $.label\n      x: $.x\n      y: $.y\n```\n\nDo not include script, eval, iframe, HTML, CSS, JS, Vue, remote URLs, arbitrary event handlers, inline SVG, or executable code.\n";
const EXPRESSION_VISUALIZER_CONTEXT_GUIDE = "# Expression Visualizer Context Guide\n\n`expression-visualizer` is an educational block for visualizing a safe, explicit mathematical render specification.\n\nIt must not be used as a generic formula display block. If the package only needs to show a formula, use normal Markdown text, a concept-card, or an HTML Rich Note formula callout.\n\n## Required model\n\nSeparate human-readable formula text from machine-rendered expression:\n\n- `formula_display`: shown to the user only.\n- `render`: the safe render specification actually used for drawing.\n- `parameters`: explicit slider definitions.\n\nSupported render modes:\n\n- `curve2d` with `render.y`\n- `surface3d` with `render.z`\n\nDo not use expression-visualizer for vector fields, symbolic derivatives, or unsupported formulas such as `F(x,y) = (∂N/∂y, -∂N/∂x)`.\n";
const PACKAGE_SCHEMA_GUIDE = "# Wawa Package Schema Guide\n\n## manifest.yaml\n\n```yaml\npackageFormat: wawapkg\npackageKind: import\nschemaVersion: \"1.1\"\npackageId: wawa-import-YYYYMMDD-topic-name\nstatus: seed\npreview:\n  mode: in-app\n  generatedHtmlPreview: false\n```\n\n## add_node\n\n```yaml\n- type: add_node\n  node:\n    id: curl-noise\n    title: Curl Noise\n    domain: computer-graphics\n    type: concept\n    status: growing\n    summary: One sentence summary.\n    contentFormat: html # markdown | html | none\n  parentId: computer-graphics\n```\n\nEvery add_node must include generated meta:\n\n```text\ngenerated/content/<domain>/<node-id>/meta.yaml\n```\n\nThe generated meta must include and strictly match patch.yaml:\n\n```yaml\nid: curl-noise\ntitle: Curl Noise\ndomain: computer-graphics\ntype: concept\nstatus: growing\nsummary: One sentence summary.\ncontentFormat: html\naliases: []\ntags: []\nsourceIds: []\n```\n\nIf `contentFormat: markdown`, include `note.md`.\n\nIf `contentFormat: html`, include `note.html` and follow `HTML_RICH_NOTE_GUIDE.md`.\n\nIf `contentFormat: none`, do not include note.md or note.html; this creates a graph-visible empty node.\n\nAllowed add_edge relations: depends-on, used-in, compares-with. Do not use contains in add_edge; parentId creates contains.\n\n## Assets\n\nMarkdown notes use packaged local assets only.\n\nHTML notes may use packaged local assets or stable public HTTPS source assets.\n\nDo not include executable/source files. `note.html` is allowed only as the canonical content file for an HTML note.\n";

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

## Native Block Examples

### concept-card

\`\`\`markdown
:::concept-card
title: Curl Noise
summary: 从标量噪声场构造旋转向量场，用较低成本生成类似流体的纹理运动。
why: 它能在不运行完整流体模拟的情况下，为实时 VFX 生成可控的旋涡感。
key_intuition: 梯度指向噪声变化最快的方向；把梯度旋转 90° 后，运动会更倾向于绕着等值线流动。
points:
  - 适合纹理扭曲、烟雾、魔法、能量场等视觉效果。
  - 不是完整流体求解器，不保证真实物理。
  - 输入噪声的尺度和模糊程度会强烈影响最终旋涡结构。
tags: [curl-noise, vector-field, vfx]
:::
\`\`\`

### process-flow

\`\`\`markdown
:::process-flow
title: Curl Noise Authoring Pipeline
steps:
  - id: noise
    label: Generate smooth scalar noise
  - id: derivative
    label: Estimate local gradient / derivative
    depends_on: noise
  - id: rotate
    label: Rotate derivative direction by 90 degrees
    depends_on: derivative
  - id: warp
    label: Use vector field to warp source texture
    depends_on: rotate
  - id: tune
    label: Tune scale, strength, blur, and octaves
    depends_on: warp
:::
\`\`\`

### compare-table

\`\`\`markdown
:::compare-table
columns: [Curl Noise, Flow Map]
rows:
  input_data: [Procedural scalar noise, Artist-authored vector texture]
  control_style: [Parameter-driven, Paint/directable]
  runtime_cost: [Usually low, Very low]
  physical_accuracy: [Fluid-like but approximate, Not physical]
  best_use_case: [Organic turbulence, Directed motion]
:::
\`\`\`

### code-explain

\`\`\`markdown
:::code-explain
language: glsl
code: |
  float n0 = noise(uv + vec2(eps, 0.0));
  float n1 = noise(uv - vec2(eps, 0.0));
  float dx = (n0 - n1) / (2.0 * eps);
  vec2 field = vec2(dy, -dx);
lines:
  1: Sample noise slightly to the right.
  2: Sample noise slightly to the left.
  3: Approximate the x derivative with a central difference.
  4: Rotate the gradient-like direction to form a curl-like field.
:::
\`\`\`

### quiz

\`\`\`markdown
:::quiz
question: 为什么 Curl Noise 中把梯度方向旋转 90° 会更容易形成旋涡感？
choices:
  - 因为运动方向更倾向于沿等值线绕行
  - 因为噪声频率会自动变低
  - 因为它会执行完整压力投影
answer: 因为运动方向更倾向于沿等值线绕行。
:::
\`\`\`

## HTML Rich Notes

Use \`contentFormat: html\` for tutorial/article pages that need full layout control. See \`HTML_RICH_NOTE_GUIDE.md\`.

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
  return {
    note: note.filePath || note.markdownPath || note.htmlPath || "",
    markdown: note.markdownPath || (note.markdown ? note.filePath || "" : ""),
    html: note.htmlPath || (note.html ? note.filePath || "" : ""),
  };
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
  const notes = vault.notes || {};
  const nodes = (vault.nodes || [])
    .filter((node) => node.type !== "domain")
    .map((node) => {
      const note = notes[node.id] || {};
      const contentFormat = inferContentFormat(node, note);
      const hasNote = Boolean(note.markdown || note.html);
      return {
        id: node.id,
        title: node.title,
        aliases: node.aliases || [],
        domain: node.domain,
        type: node.type,
        status: node.status,
        summary: node.summary || "",
        contentFormat,
        hasNote,
        path: {
          meta: node.filePath || "",
          ...notePathSummary(note),
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
    "HTML_RICH_NOTE_GUIDE.md": HTML_RICH_NOTE_GUIDE,
    "NOTE_QUALITY_RUBRIC.md": NOTE_QUALITY_RUBRIC,
    "RELATION_SEMANTICS_GUIDE.md": RELATION_SEMANTICS_GUIDE,
    "BLOCK_CREATION_POLICY.md": BLOCK_CREATION_POLICY,
    "CONTENT_BLOCK_USAGE_GUIDE.md": CONTENT_BLOCK_USAGE_GUIDE,
    "BLOCK_REGISTRY.md": blockRegistryMarkdown(customBlocks),
    "CUSTOM_BLOCK_INDEX.yaml": customBlockIndex(customBlocks),
    "DECLARATIVE_VISUAL_GRAMMAR_GUIDE.md": DECLARATIVE_VISUAL_GRAMMAR_GUIDE,
    "EXPRESSION_VISUALIZER_CONTEXT_GUIDE.md": EXPRESSION_VISUALIZER_CONTEXT_GUIDE,
    "PACKAGE_SCHEMA_GUIDE.md": PACKAGE_SCHEMA_GUIDE,
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
        htmlRichNote: {
          fragmentOnly: true,
          allowedRootClass: "rich-note-article",
          mustUseAppClasses: true,
          respondsToFontScale: true,
          disallowInlineStyle: true,
          disallowScript: true,
        },
        emptyNode: {
          contentFormat: "none",
          omitNoteFiles: true,
          visibleInGraph: true,
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
