import YAML from "yaml";
import { KNOWLEDGE_STATUS, KNOWLEDGE_TYPES, RELATION_TYPES } from "../schema.js";
import { NATIVE_BLOCK_TYPES, getBlockRegistry } from "../block-registry.js";

const WAWAPKG_MIMETYPE = "application/x-wawa-kb-ai-import-package";

const AI_KB_GUIDE = "# Wawa Knowledge Base AI Guide\n\n## Final output\n\nFinal user-facing output must be a single `.wawapkg` file.\n\nA `.wawapkg` is a ZIP-compatible archive. The archive root must contain:\n\n```text\nmimetype\nmanifest.yaml\nsources.yaml\npatch.yaml\ngenerated/\nblock-types/\nreview/\n```\n\nThe `mimetype` file must contain exactly:\n\n```text\napplication/x-wawa-kb-ai-import-package\n```\n\n## Primary goal\n\nCreate knowledge pages that are at least as clear as the source material and preferably clearer.\n\nDo not compress a high-quality tutorial, visual explanation, or interactive article into a short summary. The package should preserve the source's strongest teaching devices, including images, videos, animations, interactive demos, layout rhythm, and figure-caption explanations.\n\nThe AI may reorganize, expand, annotate, add explanations, add interactions, and improve the teaching sequence. The AI must not make the result weaker or shorter in substance than the original source.\n\n## Required planning\n\nBefore writing package files, create a plan and include it in `review/import-plan.md`:\n\n1. source scope,\n2. source teaching structure,\n3. source asset and interactive demo inventory,\n4. knowledge extraction,\n5. candidate nodes and rejected nodes,\n6. relation plan,\n7. note format decision: `markdown`, `html`, or `none`,\n8. asset preservation plan,\n9. quality self-check.\n\n## Content format decision\n\nUse `contentFormat: markdown` and `note.md` for compact structured notes.\n\nUse `contentFormat: html` and `note.html` for tutorial/article pages, figure-heavy notes, source-asset-heavy notes, and any source whose clarity depends on visual flow or interactive demonstrations.\n\nUse `contentFormat: none` for empty placeholder nodes that should appear in the graph but intentionally have no note yet.\n\n## Source-first asset policy\n\nOriginal source assets are mandatory when they are central to the source's explanation.\n\nThe AI must not generate raster images. Do not create AI-generated PNG/JPEG/WebP diagrams, decorative backgrounds, fake screenshots, or replacement figures.\n\nUse original source URLs directly when possible. For private/non-public use, stable original URLs are acceptable:\n\n```html\n<img src=\"https://original-source/path/figure.png\" alt=\"...\">\n<video controls src=\"https://original-source/path/demo.mp4\"></video>\n```\n\nIf an original asset cannot be directly embedded, use a source demo card or source link close to the relevant explanation. Do not silently omit it.\n\n## Interactive source rule\n\nIf the source contains interactive demonstrations, the note must represent every important demo. Representation can be:\n\n1. iframe embed of the original demo/page,\n2. original video/gif/canvas asset URL,\n3. direct source demo link with location label,\n4. AI-authored JS/SVG/Canvas supplemental interaction that explains the same mechanism.\n\nOmitting important interactive demos is a quality failure.\n\n## JavaScript in HTML notes\n\nJavaScript is allowed inside `note.html` when it improves understanding. Use it for educational interactivity: sliders, canvas demos, SVG manipulation, parameterized simulations, synchronized captions, and comparison panels.\n\nJavaScript must serve explanation. Avoid decorative effects.\n\n## Source block requirement\n\nEvery claim, figure, demo, formula, close paraphrase, or source-grounded explanation should include a nearby short source block:\n\n```html\n<aside class=\"source-block\">\n  <strong>Source</strong>\n  <a href=\"https://example.com/article\" target=\"_blank\" rel=\"noreferrer\">Original article</a>\n  <span>Location: section title / figure number / demo name</span>\n</aside>\n```\n\nDo not put all source references only at the end.\n\n## Output language\n\nWrite explanatory note content in Chinese by default. Keep standard technical terms in English when they are more precise.\n\nUse direct teaching voice. Do not write `原文中说`, `这篇文章提到`, or `作者表示` in note body. Explain the concept directly.\n\n## Domain rules\n\nIf `DOMAIN_INDEX.yaml` is empty, start with `add_domain`. If no suitable existing domain fits, create a small, stable, broad domain. Do not create excessive narrow domains.\n\n## Canonical operation shapes\n\nUse the canonical flat add_edge shape to avoid ambiguous package parsing:\n\n```yaml\n- type: add_edge\n  from: source-node-id\n  to: target-node-id\n  relation: depends-on\n  reason: why this relationship is useful\n```\n\nNested `edge:` objects are forbidden. Generated packages must use the flat form above because the application parser and validator expect top-level `from`, `to`, and `relation` fields.\n";

const SOURCE_EXTRACTION_GUIDE = "# Source Extraction Guide\n\nExtract reusable knowledge, source assets, and teaching structure. Do not summarize paragraphs in order.\n\n## Source identity\n\nRecord:\n\n```yaml\nsource_id:\ntitle:\nauthor:\nurl:\nsource_type: article | paper | documentation | video | code | interactive-article | other\ndate:\nlanguage:\n```\n\n## Source teaching structure\n\nFor high-quality tutorials, preserve the explanatory sequence.\n\nExtract:\n\n- major sections,\n- important figures,\n- important videos/animations,\n- important interactive demos,\n- concepts introduced by each section,\n- variables/parameters controlled by each demo,\n- conclusions demonstrated by each visual.\n\n## Source asset and demo extraction\n\nFor visual or interactive sources, create a full inventory:\n\n```yaml\nsource_assets:\n  - id:\n    type: image | video | animation | interactive-demo | downloadable-project | external-page\n    source_url:\n    source_location:\n    required: true | false\n    teaching_role:\n    preservation_strategy: direct-url | local-copy | iframe | source-link | js-reproduction\n```\n\nImportant source visuals are not optional. If they are central to explanation, mark `required: true`.\n\n## Core claims\n\nExtract source-grounded claims:\n\n```yaml\nclaims:\n  - statement:\n    source_evidence:\n    source_location:\n    confidence: high | medium | low\n```\n\n## Mechanisms\n\nExtract cause-effect structures:\n\n```text\nX changes Y because Z.\nX is transformed into Y through steps A, B, C.\nChanging parameter P affects result R.\n```\n\n## Procedures\n\nExtract workflows:\n\n```yaml\nprocedure:\n  goal:\n  steps:\n    - id:\n      action:\n      reason:\n      output:\n```\n\n## Parameters and variables\n\nFor technical content, identify:\n\n```yaml\nparameter:\n  name:\n  meaning:\n  affects:\n  typical_range:\n  failure_mode:\n  source_location:\n```\n\nIf the source does not provide a range, say unknown. Do not invent precise values.\n\n## Candidate nodes\n\nBefore writing files, list candidate nodes:\n\n```yaml\ncandidate_nodes:\n  - id:\n    type: topic | concept | skill | question | paper | tool | project\n    why_node:\n    keep_or_reject:\n    reason:\n```\n\nReject nodes that are too small, duplicate, or only source-specific.\n\n## Coverage rule\n\nIf the source is clearer than a plain note because of visuals or interaction, the generated package must preserve those visual/interactive units. Any required source asset or demo not represented must be listed in `review/interactive-demo-coverage.md` with a reason.\n";

const NOTE_COMPOSITION_GUIDE = "# Note Composition Guide\n\nA note should teach one reusable knowledge object clearly enough that the user can review and apply it later.\n\nDo not produce a loose article summary. Do not merely translate the source.\n\n## No shrinkage rule\n\nIf the source is already a clear tutorial or interactive article, the generated note must not be less detailed, less visual, or less interactive than the source.\n\nAllowed:\n\n- clearer sectioning,\n- expanded explanation,\n- more explicit mechanisms,\n- more examples,\n- source-linked figures,\n- embedded demos,\n- AI-authored supplemental JS interactions,\n- comparison tables,\n- review questions.\n\nNot allowed:\n\n- reducing an interactive article to a few paragraphs,\n- replacing source visuals with AI-generated images,\n- omitting important demos,\n- flattening multiple source demonstrations into one generic diagram,\n- losing the source's explanatory sequence.\n\n## Direct teaching voice\n\nDo not write as a reviewer of the source. Write as the teacher.\n\nAvoid:\n\n```text\n原文中说...\n这篇文章提到...\n作者在这里表示...\n```\n\nUse:\n\n```text\n小孔相机的核心是...\n当 aperture 变大时...\n这个交互演示说明...\n```\n\n## Node granularity\n\nEach note should correspond to one reusable knowledge object.\n\nGood node objects:\n\n- concept,\n- mechanism,\n- skill,\n- question,\n- comparison,\n- procedure,\n- rich tutorial overview.\n\nBad node objects:\n\n- one node per minor paragraph,\n- vague titles,\n- source-specific title with no reusable meaning,\n- heavily compressed article summary.\n\n## Required note structure\n\nA high-quality note should include most of:\n\n1. precise definition,\n2. problem solved,\n3. core intuition,\n4. mechanism and cause-effect,\n5. formal/technical detail,\n6. concrete examples,\n7. parameters or variables,\n8. source images/videos/demos,\n9. common mistakes,\n10. relation to other nodes,\n11. source blocks near source-grounded explanations,\n12. review questions.\n\n## Markdown and block syntax\n\nUse Markdown and native content blocks for compact notes.\n\nUse `contentFormat: html` when the source is visual, interactive, or tutorial-like.\n\nDo not force rich source material into many small blocks if an HTML note would be clearer.\n";

const HTML_RICH_NOTE_GUIDE = "# HTML Rich Note Guide\n\n## Purpose\n\nUse HTML rich notes when the source material is visual, interactive, tutorial-like, or when Markdown/content blocks would reduce clarity.\n\nThe goal is not to summarize the source. The goal is to create a knowledge page that is at least as clear as the original source and preferably clearer.\n\nFor high-quality visual or interactive sources, preserve the original teaching power. Do not compress an interactive tutorial into a few static concept cards.\n\n## Content format\n\nFor rich tutorial notes, use:\n\n```yaml\ncontentFormat: html\n```\n\nThe generated file must be:\n\n```text\ngenerated/content/<domain>/<node-id>/note.html\n```\n\n## Creative freedom\n\nThe AI may freely design the HTML structure, explanatory flow, interactive sections, diagrams, tables, callouts, comparison panels, timelines, and simulations, as long as the result remains clear, readable, and consistent with the knowledge base application style.\n\nThe AI may use JavaScript inside HTML notes when JavaScript improves understanding.\n\nAllowed JavaScript uses:\n\n- interactive sliders,\n- canvas demonstrations,\n- SVG manipulation,\n- WebGL or Canvas-based educational demos,\n- parameterized optical/geometric simulations,\n- collapsible explanations,\n- synchronized figure/caption interactions,\n- interactive comparison panels,\n- procedural educational visualization.\n\nJavaScript must serve explanation. Do not add decorative effects that do not improve comprehension.\n\n## Application style compatibility\n\nHTML notes must visually match the knowledge base program.\n\nUse the app style system rather than arbitrary isolated styling.\n\nPreferred CSS variables:\n\n```css\nvar(--color-bg)\nvar(--color-panel)\nvar(--color-panel-soft)\nvar(--color-text)\nvar(--color-text-muted)\nvar(--color-border)\nvar(--color-accent)\nvar(--font-size-xs)\nvar(--font-size-sm)\nvar(--font-size-md)\nvar(--font-size-lg)\nvar(--font-size-xl)\nvar(--font-size-2xl)\nvar(--font-size-3xl)\nvar(--ui-font-scale)\n```\n\nText must respond to the knowledge base font-size scale. Prefer app font-size variables over fixed pixel sizes.\n\nUse hard-edged, high-contrast, technical layouts consistent with the knowledge base style. Prefer square corners, clear lines, strong hierarchy, and restrained accent color.\n\n## No AI-generated images\n\nThe AI must not generate raster images to replace source material.\n\nForbidden:\n\n- AI-generated PNG/JPEG/WebP diagrams,\n- AI-generated illustration images,\n- AI-generated screenshots,\n- AI-generated fake source figures,\n- AI-generated decorative backgrounds,\n- data URL images,\n- fabricated figure assets.\n\nIf a source already contains clear images, videos, animations, or interactive demonstrations, those original assets must be used or referenced.\n\nGenerated images are not allowed as fallback.\n\nIf an original asset cannot be directly embedded, use one of these instead:\n\n1. original asset URL,\n2. original page URL with figure/demo locator,\n3. trusted iframe embed of the original source page or demo,\n4. AI-authored procedural interactive demo using JS/SVG/Canvas, clearly marked as a supplementary explanation and accompanied by a source block.\n\n## Original asset priority\n\nWhen the source contains images, videos, animations, or interactive demos, the note must preserve them as primary teaching material.\n\nPriority order:\n\n1. Use the original image/video/demo URL directly.\n2. Use a local cached copy of the original asset if the package includes it.\n3. Embed the original interactive source page or demo with iframe if stable and useful.\n4. Link to the exact source section if direct embedding is not possible.\n5. Create a JS/SVG/Canvas explanatory reproduction only as a supplement, not a replacement.\n\nDo not silently omit important original visuals.\n\n## Source snapshot asset usage mode\n\nFor sources with many tightly integrated interactive demos, a captured source snapshot is an asset library, not the final note UI.\n\nDo not embed the whole snapshot page as the primary explanation with an iframe. The generated note should directly use the snapshot's local assets and, when feasible, reimplement the relevant interaction inside the note with knowledge-base-styled HTML/CSS/JS.\n\nUse source snapshot mode when the original article depends on custom JavaScript/canvas/WebGL demonstrations and the source assets can be downloaded or mirrored for private local use.\n\nSnapshot assets may be provided under one of these folders:\n\n```text\ngenerated/content/<domain>/<node-id>/assets/source-snapshot/<source-id>/index.html\ngenerated/content/<domain>/<node-id>/assets/source-snapshot/<source-id>/_resources/**\ngenerated/content/<domain>/<node-id>/assets/original/**\ngenerated/content/<domain>/<node-id>/assets/source-assets/**\n```\n\nRequired workflow for using a snapshot:\n\n1. Inspect `assets/source-snapshot/<source-id>/snapshot-manifest.json` when present.\n2. Inspect `assets/source-snapshot/<source-id>/index.html` to understand which original controls, canvases, figures, and scripts exist.\n3. Use local copied source assets directly in the note, for example `<img src=\"assets/source-snapshot/<source-id>/_resources/...png\">`, `<video src=\"assets/source-snapshot/<source-id>/_resources/...mp4\">`, or JS-loaded local resources.\n4. Recreate the important interaction directly in the note's HTML/JS using the snapshot's assets and behavior as reference.\n5. Keep the note UI consistent with the knowledge base style, but keep the interaction's meaning, parameter names, and cause-effect behavior clear.\n\nDo not use this as the default final representation:\n\n```html\n<iframe class=\"rich-source-frame\" src=\"assets/source-snapshot/cameras-and-lenses/index.html\"></iframe>\n```\n\nA whole-snapshot iframe is allowed only as a fallback/debug reference when the original interaction cannot reasonably be isolated or reimplemented. If used, it must be clearly marked as fallback and must not replace the explanatory note.\n\nAI-authored JS/canvas demos are allowed, but for snapshot-backed sources they should be based on the snapshot's observed assets/behavior and marked as reconstructed from the source snapshot. They must not be described as a complete restoration unless the note actually reproduces the relevant controls and output behavior.\n\n## Interactive demo preservation\n\nIf the source contains interactive demonstrations, the note must include a section for each important demo.\n\nRepresent each important demo by one or more of:\n\n```html\n<iframe class=\"rich-source-frame\" src=\"...\"></iframe>\n```\n\n```html\n<a class=\"rich-source-demo-link\" href=\"...\" target=\"_blank\">Open original interactive demo</a>\n```\n\n```html\n<section class=\"rich-js-demo\" data-source-block=\"...\">\n  <!-- AI-authored supplementary JS demo -->\n</section>\n```\n\nFor interactive sources such as optics, physics, graphics, simulation, math, or shader tutorials, omitting the demonstrations is a quality failure.\n\n## Source block requirement\n\nWhen the note explains a claim, figure, demo, formula, interaction, or implementation detail that comes from the source or is grounded in the source, add a short source block near that section.\n\nUse this structure:\n\n```html\n<aside class=\"source-block\">\n  <strong>Source</strong>\n  <a href=\"https://example.com/article\" target=\"_blank\" rel=\"noreferrer\">Original article</a>\n  <span>Location: section title / figure number / demo name / nearby heading</span>\n</aside>\n```\n\nFor a figure:\n\n```html\n<aside class=\"source-block\">\n  <strong>Source</strong>\n  <a href=\"https://ciechanow.ski/cameras-and-lenses/\" target=\"_blank\" rel=\"noreferrer\">Cameras and Lenses</a>\n  <span>Location: Pinhole camera section, aperture slider demonstration</span>\n</aside>\n```\n\nFor a quote or close paraphrase, keep the quoted text short and attribute it.\n\nDo not put all sources only at the end. Source blocks should appear close to the relevant explanation.\n\n## Coverage requirement\n\nA rich note must not be more superficial than the original source.\n\nBefore writing `note.html`, identify the original source's important teaching units:\n\n```yaml\nsource_coverage_plan:\n  - id: photon-collection-demo\n    type: interactive-demo\n    location: sensor / exposure section\n    required: true\n  - id: pinhole-diameter-slider\n    type: interactive-demo\n    location: pinhole camera section\n    required: true\n  - id: refraction-demo\n    type: interactive-demo\n    location: refraction section\n    required: true\n```\n\nEvery required item must appear in the note as:\n\n- embedded source URL,\n- direct source link,\n- original image/video reference,\n- iframe,\n- or supplementary JS demo plus source block.\n\nIf a required source asset cannot be embedded, explicitly say so in the note and provide a link to the original section.\n\n## Recommended HTML structure\n\n```html\n<article class=\"rich-note-article\">\n  <header class=\"rich-hero\">\n    <p class=\"rich-kicker\">Domain / Topic</p>\n    <h1>Title</h1>\n    <p class=\"rich-lead\">High-level explanation.</p>\n  </header>\n\n  <section class=\"rich-section\" data-source-unit=\"...\">\n    <div class=\"rich-section-head\">\n      <span class=\"rich-section-num\">01</span>\n      <h2>Section title</h2>\n    </div>\n\n    <div class=\"rich-prose\">...</div>\n\n    <figure class=\"rich-figure\">\n      <img src=\"https://original-source/asset.png\" alt=\"...\">\n      <figcaption>...</figcaption>\n    </figure>\n\n    <aside class=\"source-block\">\n      <strong>Source</strong>\n      <a href=\"https://original-source/article\" target=\"_blank\" rel=\"noreferrer\">Original article</a>\n      <span>Location: figure/demo/section</span>\n    </aside>\n  </section>\n</article>\n```\n\n## Review files\n\nEvery rich HTML package must include:\n\n```text\nreview/source-coverage-plan.md\nreview/source-asset-manifest.md\nreview/interactive-demo-coverage.md\n```\n\nThe review must explicitly list:\n\n- original images used,\n- original videos used,\n- original interactive demos embedded or linked,\n- required demos not embedded and why,\n- any AI-authored JS demos and what source unit they explain.\n";

const SOURCE_ASSET_POLICY = "# Source Asset Policy\n\n## Hard rule\n\nDo not generate images. Use original source assets or source URLs.\n\nThis policy applies to:\n\n- images,\n- diagrams,\n- screenshots,\n- animations,\n- videos,\n- interactive demos,\n- downloadable source/project files.\n\n## Allowed preservation strategies\n\nUse the strongest available strategy:\n\n1. `direct-url`: reference original stable URL in HTML.\n2. `local-copy`: include a local copy of the original source asset.\n3. `iframe`: embed original interactive source/demo page.\n4. `source-link`: provide exact link and section/demo locator.\n5. `js-reproduction`: create an AI-authored interactive explanation with JS/SVG/Canvas only as a supplement.\n\n## Source asset manifest\n\nEvery package based on a visual or interactive source must include:\n\n```text\nreview/source-asset-manifest.md\n```\n\nUse this shape:\n\n```yaml\nsource_assets:\n  - id:\n    type: image | video | animation | interactive-demo | downloadable-project | external-page\n    source_url:\n    source_location:\n    required: true | false\n    teaching_role:\n    preservation_strategy: direct-url | local-copy | iframe | source-link | js-reproduction\n    represented_in_note: true | false\n    note_location:\n```\n\n## Required asset coverage\n\nIf `required: true`, the note must represent it. If it cannot be embedded, provide a source link and explain why.\n\nA package is low quality if it omits required visuals or replaces them with AI-generated images.\n";

const NOTE_QUALITY_RUBRIC = "# Note Quality Rubric\n\nTarget score: 4 or higher.\n\n## 5 Excellent\n\nThe note is at least as clear as the source and preferably clearer.\n\nCriteria:\n\n- precise definition,\n- clear problem,\n- mechanism,\n- examples,\n- parameters,\n- mistakes,\n- meaningful relations,\n- review questions,\n- purposeful original source visuals,\n- all important interactive demos represented,\n- source blocks close to source-grounded explanations,\n- AI-authored JS interactions improve understanding when used.\n\n## 4 Good\n\nUsable and mostly complete. Clear mechanism and concrete examples. Important source assets are preserved or linked.\n\n## 3 Shallow\n\nStructurally valid but too summary-like, or missing some important source visuals/demos.\n\n## 2 Poor\n\nMostly paraphrase with little mechanism. Tutorial source is heavily compressed.\n\nA rich HTML note cannot score above 2 if it replaces high-quality original figures or interactive demos with AI-generated images.\n\n## 1 Invalid\n\nIncorrect, empty, misleading, broken, or fails source asset preservation.\n\n## Mandatory self-check\n\nFor each note, answer in `review/validation-checklist.md`:\n\n```yaml\nnote_quality:\n  node_id:\n  contentFormat: markdown | html | none\n  estimated_score:\n  strongest_part:\n  weakest_part:\n  source_assets_preserved: true | false\n  required_demos_represented: true | false\n  generated_images_used: false\n  source_blocks_near_claims: true | false\n  revision_done: true | false\n```\n";

const RELATION_SEMANTICS_GUIDE = "# Relation Semantics Guide\n\nRelation types are frozen: contains, depends-on, used-in, compares-with.\n\nDo not create new relation types.\n\n## contains\n\nHierarchy only. Usually generated by `parentId`. Do not manually add with `add_edge`.\n\n## depends-on\n\n`A depends-on B` means understanding B helps understand A.\n\nDirection matters.\n\nExample:\n\n```text\nthin-lens-and-focus depends-on refraction-and-snell-law\n```\n\n## used-in\n\n`A used-in B` means A is a technique/component/concept used inside B.\n\nExample:\n\n```text\npinhole-camera-geometry used-in camera-projection\n```\n\n## compares-with\n\nA and B are alternatives, contrasts, or related concepts that answer similar questions.\n\n## Relation quality rules\n\nDo not create edges just because two concepts appeared in the same article.\n\nEvery non-contains relation should be explainable in one sentence.\n";

const BLOCK_CREATION_POLICY = "# Block Creation Policy\n\nPrefer existing native blocks for compact Markdown notes.\n\nUse HTML Rich Notes when the whole note needs article-like layout, source assets, interactive demos, or visual reading flow.\n\n## JavaScript policy\n\nJavaScript is allowed in HTML notes when it improves understanding.\n\nJavaScript is not for decorative effects. Use it for educational interaction: sliders, canvas, SVG manipulation, WebGL/Canvas demos, parameterized models, synchronized captions, and interactive comparisons.\n\n## Image policy\n\nDo not generate images. Use original source assets or URLs.\n\n## Native blocks\n\nUse native blocks for simple structured explanations:\n\n| Teaching goal | Preferred representation |\n|---|---|\n| Define a concept | concept-card |\n| Show a process | process-flow |\n| Compare alternatives | compare-table |\n| Explain code | code-explain |\n| Test recall | quiz |\n| Show safe scalar formula behavior | expression-visualizer |\n| Preserve source-rich tutorial | HTML Rich Note |\n\n## Custom declarative blocks\n\nCustom block-types remain declarative visual YAML unless the app explicitly supports executable custom blocks. For maximum freedom, put interactive logic inside `note.html` instead of `block-types/*.yaml`.\n";

const CONTENT_BLOCK_USAGE_GUIDE = "# Content Block Usage Guide\n\nUse content blocks to improve learning density and clarity. Do not use blocks as decoration.\n\nFor full tutorial/article presentation, source assets, or interactivity, use `contentFormat: html` instead of stacking many unrelated blocks.\n\n## concept-card\n\nUse for definition, why it matters, and core intuition.\n\n## process-flow\n\nUse for pipelines, algorithms, authoring workflows, dependency chains, and cause-effect stages.\n\n## compare-table\n\nUse for technique comparisons, tradeoffs, alternatives, and misconception correction.\n\n## code-explain\n\nUse for shader code, pseudo-code, formulas translated into algorithm, or data transformation steps.\n\n## quiz\n\nUse for review questions, misconception checks, and transfer of knowledge.\n\n## expression-visualizer\n\nUse only when the expression is a scalar 2D curve or scalar 3D surface, a safe render spec is provided, and parameters have meaningful slider ranges.\n\n## HTML interactive sections\n\nWhen more freedom is needed, use HTML with JavaScript in `note.html` and keep app style through `rich-*` classes and CSS variables.\n";

const DECLARATIVE_VISUAL_GRAMMAR_GUIDE = "# Declarative Visual Grammar Guide\n\nCustom block-types live in `block-types/*.yaml` and must use:\n\n```yaml\nkind: declarative-visual\nrenderer:\n  engine: visual-grammar\n```\n\nUse declarative visual blocks when the note needs labeled nodes, explicit arrows, staged diagrams, formula callouts, simple geometry, or repeated visual elements based on block data.\n\nFor maximum creative freedom or JavaScript interaction, use `contentFormat: html` and implement the interaction inside `note.html` instead of a declarative block type.\n\n## Supported layout types\n\n- split-panel\n- stack\n- grid\n\n## Supported panel types\n\n- svg-scene\n- inspector\n\n## Supported element types\n\n- node\n- edge\n- arrow\n- label\n- text\n- badge\n- formula-callout\n- rect\n- line\n- circle\n\nCoordinates use normalized 2D values in [0, 1].\n\nDo not use declarative visual blocks to replace original source figures. Use original source asset URLs or HTML source frames when original visuals exist.\n";

const EXPRESSION_VISUALIZER_CONTEXT_GUIDE = "# Expression Visualizer Context Guide\n\n`expression-visualizer` is an educational block for visualizing a safe, explicit mathematical render specification.\n\nIt must not be used as a generic formula display block. If richer interactivity is required, use `contentFormat: html` with JavaScript and source blocks.\n\nSupported render modes:\n\n- `curve2d` with `render.y`\n- `surface3d` with `render.z`\n\nDo not use expression-visualizer for vector fields, symbolic derivatives, or unsupported formulas. Use HTML notes with source assets or AI-authored supplemental JS demos instead.\n";

const PACKAGE_SCHEMA_GUIDE = "# Wawa Package Schema Guide\n\n## manifest.yaml\n\n```yaml\npackageFormat: wawapkg\npackageKind: import\nschemaVersion: \"1.1\"\npackageId: wawa-import-YYYYMMDD-topic-name\ntitle: Human readable title\ndescription: Short description\nstatus: seed\nlanguage: zh-CN\npreview:\n  mode: in-app\n  generatedHtmlPreview: false\n```\n\nFor packages with JavaScript-rich HTML notes, include:\n\n```yaml\nhtmlPolicy:\n  allowJavaScript: true\n  assetMode: source-snapshot-assets-first\n  generatedImagesAllowed: false\n  sourceBlocksRequired: true\n```\n\n## patch.yaml\n\n```yaml\noperations:\n  - type: add_domain\n    domain:\n      id: optics\n      title: Optics\n      description: Cameras, lenses, light transport, and image formation.\n      color: \"#00B7FF\"\n      order: 10\n\n  - type: add_node\n    node:\n      id: cameras-and-lenses-rich-tutorial\n      title: Cameras and Lenses\n      domain: optics\n      type: topic\n      status: growing\n      summary: Interactive optics tutorial preserving original source visuals and demos.\n      contentFormat: html\n      aliases: []\n      tags: [camera, lens, optics]\n    parentId: optics\n```\n\n## Generated node file requirements\n\nFor every `add_node`, include:\n\n```text\ngenerated/content/<domain>/<node-id>/meta.yaml\n```\n\nFor `contentFormat: markdown`, include:\n\n```text\ngenerated/content/<domain>/<node-id>/note.md\n```\n\nFor `contentFormat: html`, include:\n\n```text\ngenerated/content/<domain>/<node-id>/note.html\n```\n\nFor `contentFormat: none`, omit both note files.\n\n`meta.yaml` must include:\n\n```yaml\nid:\ntitle:\ndomain:\ntype:\nstatus:\nsummary:\ncontentFormat: markdown | html | none\naliases: []\ntags: []\nsourceIds: []\ncreatedAt:\nupdatedAt:\n```\n\nStrict match required:\n\n- `meta.id` must equal `node.id`\n- `meta.title` must equal `node.title`\n- `meta.domain` must equal `node.domain`\n- `meta.type` must equal `node.type`\n- `meta.status` must equal `node.status`\n- `meta.contentFormat` must equal `node.contentFormat` when provided\n\n## Source asset review files\n\nPackages based on visual or interactive sources must include:\n\n```text\nreview/source-coverage-plan.md\nreview/source-asset-manifest.md\nreview/interactive-demo-coverage.md\n```\n\nThese files must list original assets, important demos, source URLs, and how each is represented.\n\n## Asset placement\n\nFor local original assets:\n\n```text\ngenerated/content/<domain>/<node-id>/assets/<file>\n```\n\nFor HTML notes, stable original `https://` URLs are allowed and preferred when the source asset should remain connected to the original page.\n\n## Edge constraints\n\nAllowed `add_edge` relations:\n\n- depends-on\n- used-in\n- compares-with\n\nDo not use `contains` in `add_edge`. `contains` is generated by `parentId`.\n";




const SOURCE_SNAPSHOT_USAGE_GUIDE = "# Source Snapshot Usage Guide\n\n## Purpose\n\nA source snapshot is a local, private mirror of an original web page and its runtime assets. Use it as an asset library and behavior reference for building a knowledge-base-native note.\n\nThe snapshot is not the final note UI. Do not make the final note a thin iframe wrapper around the snapshot page.\n\n## Expected snapshot structure\n\nA snapshot usually contains:\n\n```text\nassets/source-snapshot/<source-id>/index.html\nassets/source-snapshot/<source-id>/snapshot-manifest.json\nassets/source-snapshot/<source-id>/README.md\nassets/source-snapshot/<source-id>/_resources/**\n```\n\nThe `_resources/` folder may contain copied original images, CSS, JavaScript, videos, fonts, wasm, JSON, and other runtime assets.\n\n## Required workflow\n\nWhen a source snapshot is available, the AI must do the following before writing `note.html`:\n\n1. Inspect `assets/source-snapshot/<source-id>/snapshot-manifest.json` when present.\n2. Inspect `assets/source-snapshot/<source-id>/index.html` to identify original section structure, demo containers, controls, labels, canvas/SVG elements, and script/style dependencies.\n3. Inspect relevant local CSS/JS resources under `_resources/`, especially source-specific scripts such as `lenses.js`, simulation code, shader code, data files, and media assets.\n4. Extract the actual source variables, controls, update logic, and visual output behavior.\n5. Build a knowledge-base-styled note that directly ports the important interactions into `note.html` using the source snapshot assets and behavior.\n\n## Primary preservation strategy\n\nUse this strategy for important interactive demos:\n\n```yaml\npreservation_strategy: source-snapshot-assets + source-ported-interaction\n```\n\nThis means:\n\n- the note uses local assets copied from the source snapshot where relevant,\n- the note's controls and interaction behavior are ported from the original source behavior,\n- the UI may be redesigned to fit the knowledge base style,\n- the conceptual behavior must remain faithful to the original demonstration.\n\nIf a reconstruction is not based on specific snapshot-observed source behavior, it must be marked as supplementary rather than primary preservation.\n\n## Forbidden final representation\n\nDo not use this as the final representation:\n\n```html\n<iframe src=\"assets/source-snapshot/<source-id>/index.html\"></iframe>\n```\n\nA whole-snapshot iframe may be useful while debugging, but it is not an acceptable final note section unless the user explicitly asks for a raw snapshot viewer. For normal AI import packages, the final note should directly implement the teaching content.\n\n## Do not mention the snapshot in learner-facing prose\n\nThe learner-facing note must teach the concept directly. Do not write:\n\n- `原 snapshot 中...`\n- `原始 SNAPSHOT 参考视图`\n- `根据 snapshot...`\n- `source snapshot shows...`\n\nSnapshot paths are implementation details. They may appear in `review/source-asset-manifest.md` and in HTML asset paths, but not as explanatory prose.\n\nSource blocks must cite the original URL and original source location, not the snapshot file:\n\n```html\n<aside class=\"source-block\">\n  <strong>Source</strong>\n  <a href=\"https://ciechanow.ski/cameras-and-lenses/\" target=\"_blank\" rel=\"noreferrer\">Cameras and Lenses</a>\n  <span>Location: Pinhole camera / hole diameter and sensor distance controls</span>\n</aside>\n```\n\n## UI adaptation rule\n\nThe UI may be changed to match the knowledge base: dark panels, hard edges, concise control labels, source-linked captions, and app font-size variables.\n\nThe explanation must remain clear and direct. Preserve the original demo's key variables, cause-effect behavior, and observable results. Do not simplify the interaction so much that it becomes weaker than the source.\n\n## Review files\n\nFor snapshot-backed packages, `review/source-asset-manifest.md` must include evidence of source-porting:\n\n```yaml\nsource_assets:\n  - id: pinhole-diameter-distance-demo\n    type: interactive-demo\n    source_url: https://example.com/original\n    source_location: section / demo label\n    required: true\n    represented_in_node: node-id\n    note_location: section 02\n    snapshot_path: assets/source-snapshot/source-id/index.html\n    snapshot_assets_used:\n      - assets/source-snapshot/source-id/_resources/source-specific.js\n      - assets/source-snapshot/source-id/_resources/source-specific.css\n    ported_original_controls:\n      - hole diameter\n      - sensor distance\n    ported_original_behavior:\n      - increasing hole diameter increases brightness and blur\n      - increasing sensor distance changes image size and exposure distribution\n    preservation_strategy: source-snapshot-assets + source-ported-interaction\n```\n\nIf an interaction cannot be directly ported, state the limitation with `unavailable_reason:` and mark any AI-authored demo as supplementary.\n\n## Language and style\n\nUse the target locale for explanations, section titles, captions, review questions, and answers. Keep precise English technical terms when useful, but explain them in the target locale. Use direct teaching voice.\n";

const SOURCE_FIRST_STRICT_REVISIONS = "\n\n# Source-first strict revisions\n\nThese rules override weaker or older guidance in this context export.\n\n## Learner-facing voice\n\nNever write the note as if it is commenting on a snapshot or the source document. Use direct teaching voice in the target locale. The source URL is cited for attribution, while the explanation should read like the knowledge base itself is teaching the concept.\n\n## Snapshot-backed source preservation\n\nIf a package includes `assets/source-snapshot/`, that snapshot must be treated as the highest-priority source asset library.\n\nDo not use a whole snapshot iframe as the primary note representation. The AI should use the snapshot's local assets and behavior to port the important demos directly inside `note.html` with knowledge-base-styled HTML/CSS/JS.\n\nAllowed fallback: a whole-snapshot iframe may be included only as a secondary reference/debug view when the interaction cannot be isolated or faithfully ported. It must be clearly labeled as fallback and must not replace the teaching explanation.\n\n## Original media and interactive demos\n\nFor asset-rich or interactive sources, source-root links are not enough. A note must try to show or reconstruct original source material directly inside the note.\n\nPriority order when no source snapshot exists:\n\n1. Direct original media URL: `<img src=\"https://...\">`, `<video src=\"https://...\">`, `<source src=\"https://...\">`.\n2. Local copied original media: `<img src=\"assets/original/...\">` or `<img src=\"assets/source-assets/...\">`.\n3. Original interactive source embed only if no snapshot is available and direct reconstruction is not feasible.\n4. Direct source demo link with exact location label.\n5. AI-authored JS/Canvas/SVG demos only as supplementary explanation.\n\nPriority order when a source snapshot exists:\n\n1. Use local original assets from `assets/source-snapshot/<source-id>/_resources/`.\n2. Port source interactions directly in the note using knowledge-base-styled controls and snapshot-observed behavior.\n3. Use source URL/source blocks for attribution and source location.\n4. Use iframe only as fallback/reference, not as the primary final note.\n\nForbidden as a complete preservation strategy:\n\n```yaml\npreservation_strategy: source-link + js-reproduction\n```\n\nAlso forbidden when a snapshot exists:\n\n```yaml\npreservation_strategy: snapshot-iframe-only\n```\n\n## Required source asset markers\n\nEvery required source asset or demo must have a stable id and must be marked in the HTML with `data-source-asset`:\n\n```html\n<section class=\"rich-js-demo\" data-source-asset=\"pinhole-diameter-distance-demo\">\n  <!-- Directly ported controls/canvas/SVG using snapshot assets and observed behavior. -->\n</section>\n```\n\nFor snapshot-backed demos, prefer this manifest shape:\n\n```yaml\nsource_assets:\n  - id: pinhole-diameter-distance-demo\n    type: interactive-demo\n    source_url: https://ciechanow.ski/cameras-and-lenses/\n    source_location: Pinhole camera / hole diameter and sensor distance sliders\n    required: true\n    represented_in_node: pinhole-camera-geometry\n    note_location: section 01\n    snapshot_path: assets/source-snapshot/cameras-and-lenses/index.html\n    snapshot_assets_used:\n      - assets/source-snapshot/cameras-and-lenses/_resources/source-specific.js\n    ported_original_controls:\n      - hole diameter\n      - sensor distance\n    ported_original_behavior:\n      - increasing hole diameter increases brightness and blur\n    preservation_strategy: source-snapshot-assets + source-ported-interaction\n```\n\nDo not put `node-id / section xx` into `note_location` as the only machine-readable location. Use `represented_in_node` for the node id.\n\n## UI adaptation rule\n\nThe note's explanatory UI may be redesigned to match the knowledge base style: hard-edged panels, dark theme, restrained accent color, clear control labels, and app font-size variables.\n\nThe source interaction's meaning must remain faithful: preserve variables, cause-effect behavior, and observed outcomes. Do not hide important original controls or simplify the interaction so much that the concept becomes weaker than the source.\n\n## Locale rule\n\nUse the target locale for explanations, section titles, captions, review questions, and answers.\n\nLocale priority:\n\n1. `manifest.yaml.language`,\n2. `AI_CONTEXT.yaml.vault.language`,\n3. source language,\n4. `zh-CN` fallback.\n\nKeep standard technical terms in English when they are more precise, but explain them in the target locale.\n\n## Review questions with answers\n\nReview questions must not be a bare list. Each question must include an answer using `details`/`summary`:\n\n```html\n<section class=\"rich-review\">\n  <h2>复习问题</h2>\n  <details class=\"rich-qa\">\n    <summary>为什么小孔相机会形成倒立图像？</summary>\n    <div class=\"rich-answer\">\n      <p>因为来自场景上方的光线穿过小孔后落到传感器下方，来自左侧的光线落到右侧，上下和左右各翻转一次，合起来相当于 180° 旋转。</p>\n      <aside class=\"source-block\">\n        <strong>Source</strong>\n        <a href=\"https://ciechanow.ski/cameras-and-lenses/\" target=\"_blank\" rel=\"noreferrer\">Cameras and Lenses</a>\n        <span>Location: Pinhole camera / ray inversion explanation</span>\n      </aside>\n    </div>\n  </details>\n</section>\n```\n\nBare `<ol><li>question</li></ol>` review sections are not acceptable for final-quality notes.\n\n## Quality bar for Ciechanowski-style sources\n\nFor sources whose clarity comes from interactive demos, the package must not pretend that a local AI-authored canvas is equivalent to the original. If a source snapshot exists, the correct high-fidelity approach is direct note implementation using snapshot assets and behavior, not repeated iframes or external links.\n";

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

## Native Block Guidance

Native blocks are useful for compact Markdown notes. For source-rich, interactive, or article-style notes, prefer \`contentFormat: html\`.

### concept-card

Use for definition, why it matters, and core intuition.

### process-flow

Use for pipelines, algorithms, authoring workflows, dependency chains, and cause-effect stages. Use stable ids and \`depends_on\`.

### compare-table

Use for technique comparisons, tradeoffs, alternatives, and misconception correction.

### code-explain

Use for shader code, pseudo-code, formulas translated into algorithm, or data transformation steps.

### quiz

Use for review questions and misconception checks.

### expression-visualizer

Use only for safe scalar 2D curve or scalar 3D surface demos.

## HTML Rich Notes

Use \`contentFormat: html\` for pages that need full layout control, source assets, JavaScript interaction, iframe/source demo links, or article-like teaching sequence. See \`HTML_RICH_NOTE_GUIDE.md\` and \`SOURCE_ASSET_POLICY.md\`.

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
    "AI_KB_GUIDE.md": AI_KB_GUIDE + SOURCE_FIRST_STRICT_REVISIONS,
    "SOURCE_EXTRACTION_GUIDE.md": SOURCE_EXTRACTION_GUIDE + SOURCE_FIRST_STRICT_REVISIONS,
    "NOTE_COMPOSITION_GUIDE.md": NOTE_COMPOSITION_GUIDE + SOURCE_FIRST_STRICT_REVISIONS,
    "HTML_RICH_NOTE_GUIDE.md": HTML_RICH_NOTE_GUIDE + SOURCE_FIRST_STRICT_REVISIONS,
    "SOURCE_ASSET_POLICY.md": SOURCE_ASSET_POLICY + SOURCE_FIRST_STRICT_REVISIONS,
    "SOURCE_SNAPSHOT_USAGE_GUIDE.md": SOURCE_SNAPSHOT_USAGE_GUIDE + SOURCE_FIRST_STRICT_REVISIONS,
    "NOTE_QUALITY_RUBRIC.md": NOTE_QUALITY_RUBRIC + SOURCE_FIRST_STRICT_REVISIONS,
    "RELATION_SEMANTICS_GUIDE.md": RELATION_SEMANTICS_GUIDE,
    "BLOCK_CREATION_POLICY.md": BLOCK_CREATION_POLICY,
    "CONTENT_BLOCK_USAGE_GUIDE.md": CONTENT_BLOCK_USAGE_GUIDE,
    "BLOCK_REGISTRY.md": blockRegistryMarkdown(customBlocks),
    "CUSTOM_BLOCK_INDEX.yaml": customBlockIndex(customBlocks),
    "DECLARATIVE_VISUAL_GRAMMAR_GUIDE.md": DECLARATIVE_VISUAL_GRAMMAR_GUIDE,
    "EXPRESSION_VISUALIZER_CONTEXT_GUIDE.md": EXPRESSION_VISUALIZER_CONTEXT_GUIDE,
    "PACKAGE_SCHEMA_GUIDE.md": PACKAGE_SCHEMA_GUIDE + SOURCE_FIRST_STRICT_REVISIONS,
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
        mimetype: WAWAPKG_MIMETYPE,
        recommendedPackageIdPrefix: "wawa-import-",
        assetPolicy: {
          generatedImagesAllowed: false,
          mustUseOriginalSourceAssets: true,
          html: "snapshot-assets-first when assets/source-snapshot exists; otherwise source-url-first",
          markdown: "local packaged original/source assets only; no AI-generated images",
          sourceBlocksRequired: true,
          sourceSnapshotFirst: true,
          preferSnapshotAssetsOverExternalUrls: true,
          doNotUseSnapshotIframeAsPrimaryRepresentation: true,
          snapshotAssetRoots: [
            "assets/source-snapshot/<source-id>/",
            "assets/source-snapshot/<source-id>/_resources/",
            "assets/original/",
            "assets/source-assets/",
          ],
        },
        sourceSnapshot: {
          useAsAssetLibrary: true,
          inspectManifest: "assets/source-snapshot/<source-id>/snapshot-manifest.json",
          inspectOriginalHtml: "assets/source-snapshot/<source-id>/index.html",
          directNoteImplementationRequiredWhenFeasible: true,
          iframeOnlyStrategyAllowed: false,
          iframeFallbackAllowedWithReason: true,
          requireSnapshotAssetsUsedList: true,
          preferredStrategy: "source-snapshot-assets + source-ported-interaction",
        },
        htmlRichNote: {
          recommendedForTutorialSources: true,
          fragmentOrFullDocument: "html note may contain rich HTML; renderer should isolate it when JavaScript is used",
          allowJavaScript: true,
          allowInteractiveDemos: true,
          allowIframeSourceEmbeds: true,
          preferDirectSnapshotBackedInteractionsOverIframe: true,
          requireAppStyleCompatibility: true,
          respondsToFontScale: true,
          useAppCssVariables: true,
          prohibitAiGeneratedImages: true,
          sourceBlockClass: "source-block",
          reviewFilesRequiredForVisualSources: [
            "review/source-coverage-plan.md",
            "review/source-asset-manifest.md",
            "review/interactive-demo-coverage.md",
          ],
        },
        localePolicy: {
          priority: ["manifest.language", "vault.language", "source.language", "zh-CN"],
          explanatoryContentMustUseTargetLocale: true,
          keepPreciseEnglishTechnicalTerms: true,
          directTeachingVoice: true,
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
