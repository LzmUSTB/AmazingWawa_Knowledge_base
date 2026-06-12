import YAML from "yaml";
import { KNOWLEDGE_STATUS, KNOWLEDGE_TYPES, RELATION_TYPES } from "../schema.js";
import { getBlockRegistry } from "../block-registry.js";

const WAWAPKG_MIMETYPE = "application/x-wawa-kb-ai-import-package";

const NATIVE_BLOCK_TYPES = [
  "concept-card",
  "process-flow",
  "compare-table",
  "code-explain",
  "quiz",
  "expression-visualizer",
];

const STATIC_CONTEXT_FILES = {
  "README.md": "# Wawa AI Context Export\n\nStart here.\n\nThis context export is optimized for AI-generated `.wawapkg` import packages.\n\nRecommended reading order:\n\n1. `AI_CONTEXT.yaml`\n2. `RULE_PRIORITY.yaml`\n3. `AI_KB_GUIDE.md`\n4. `SOURCE_TO_NOTE_GUIDE.md`\n5. `PACKAGE_AND_RELATION_GUIDE.md`\n6. `NOTE_AND_BLOCK_GUIDE.md`\n7. `NOTE_QUALITY_RUBRIC.md`\n8. `DOMAIN_INDEX.yaml`, `NODE_INDEX.yaml`, `RELATION_INDEX.yaml`, `CUSTOM_BLOCK_INDEX.yaml`\n\nThe Markdown files are intentionally consolidated. Do not infer that missing older guide filenames mean the rules were removed; their content has been merged into these fewer guides.\n",
  "AI_KB_GUIDE.md": "# Wawa Knowledge Base AI Guide\n\n## Final output\n\nFinal user-facing output must be a single `.wawapkg` file.\n\nA `.wawapkg` is a ZIP-compatible archive. The archive root must contain:\n\n```text\nmimetype\nmanifest.yaml\nsources.yaml\npatch.yaml\ngenerated/\nblock-types/\nreview/\n```\n\nThe `mimetype` file must contain exactly:\n\n```text\napplication/x-wawa-kb-ai-import-package\n```\n\n## Primary goal\n\nCreate knowledge pages that are at least as clear as the source material and preferably clearer.\n\nDo not compress a high-quality tutorial, visual explanation, or interactive article into a short summary. Preserve the source's strongest teaching devices: images, videos, animations, interaction rhythm, original variables, source runtime behavior, figure-caption explanations, and review structure.\n\nThe AI may reorganize, expand, annotate, add explanations, add interactions, and improve the teaching sequence. The AI must not make the result weaker, shorter in substance, less visual, or less interactive than the original source.\n\n## Rule priority\n\nWhen rules conflict:\n\n1. `RULE_PRIORITY.yaml`\n2. `AI_CONTEXT.yaml`\n3. The strict rules in this guide\n4. `SOURCE_TO_NOTE_GUIDE.md`\n5. `PACKAGE_AND_RELATION_GUIDE.md`\n6. `NOTE_AND_BLOCK_GUIDE.md`\n7. `NOTE_QUALITY_RUBRIC.md`\n8. Dynamic indexes\n\nNewer source-snapshot and source-porting rules override older iframe-oriented wording.\n\n## Required planning\n\nBefore writing package files, create a plan and include it in `review/import-plan.md`:\n\n1. source scope,\n2. source teaching structure,\n3. source asset and interactive demo inventory,\n4. knowledge extraction,\n5. candidate nodes and rejected nodes,\n6. relation plan,\n7. note format decision: `markdown`, `html`, or `none`,\n8. asset preservation and porting plan,\n9. quality self-check.\n\n## Content format decision\n\nUse `contentFormat: markdown` and `note.md` for compact structured notes.\n\nUse `contentFormat: html` and `note.html` for tutorial/article pages, figure-heavy notes, source-asset-heavy notes, and any source whose clarity depends on visual flow or interactive demonstrations.\n\nUse `contentFormat: none` for empty placeholder nodes that should appear in the graph but intentionally have no note yet.\n\n## Learner-facing voice\n\nThe final note must teach directly. It must not read like a report about implementation, source snapshots, locale compliance, or AI behavior.\n\nForbidden learner-facing phrases include:\n\n- `strictly ported`\n- `source-ported`\n- `source snapshot`\n- `原 snapshot`\n- `根据 snapshot`\n- `按照 zh-CN`\n- `保留原交互结构`\n- `严格移植的交互式笔记`\n\nImplementation details belong in `review/`, not in note body.\n\nUse:\n\n```text\n小孔相机的核心是...\n当 aperture 变大时...\n这个交互演示说明...\n```\n\nDo not use:\n\n```text\n原文中说...\n这篇文章提到...\n作者在这里表示...\n```\n\n## Locale policy\n\nUse the target locale for explanations, section titles, captions, review questions, and answers.\n\nLocale priority:\n\n1. `manifest.yaml.language`,\n2. `AI_CONTEXT.yaml.vault.language`,\n3. source language,\n4. `zh-CN` fallback.\n\nKeep precise English technical terms when they are more accurate, but explain them in the target locale.\n\n## V2 hard failures\n\nA package is unacceptable if any of the following is true:\n\n- learner-facing title or prose contains implementation/meta language listed above;\n- an important original demo is replaced by a conceptually similar AI-authored demo when direct source-porting is feasible;\n- original demo DOM ids are present but original runtime context is missing, causing incorrect canvas background, blend mode, dark/light section behavior, or slider overlap;\n- a canvas, table, source block, slider, or review panel has low contrast text/content in the actual KB rendering context;\n- source explanations are compressed into one-line captions when the source provides a fuller explanation;\n- source-grounded statements have no nearby source block;\n- generated raster images are used as substitutes for source visuals;\n- package paths are invalid or unsupported assets are included in a way that the importer rejects.\n",
  "PACKAGE_AND_RELATION_GUIDE.md": "# Package and Relation Guide\n\n## manifest.yaml\n\n```yaml\npackageFormat: wawapkg\npackageKind: import\nschemaVersion: \"1.1\"\npackageId: wawa-import-YYYYMMDD-topic-name\ntitle: Human readable title\ndescription: Short description\nstatus: seed\nlanguage: zh-CN\npreview:\n  mode: in-app\n  generatedHtmlPreview: false\n```\n\nFor packages with JavaScript-rich HTML notes, include:\n\n```yaml\nhtmlPolicy:\n  allowJavaScript: true\n  assetMode: source-snapshot-assets-first\n  generatedImagesAllowed: false\n  sourceBlocksRequired: true\n```\n\n## Generated node file requirements\n\nFor every `add_node`, include:\n\n```text\ngenerated/content/<domain>/<node-id>/meta.yaml\n```\n\nFor `contentFormat: markdown`, include:\n\n```text\ngenerated/content/<domain>/<node-id>/note.md\n```\n\nFor `contentFormat: html`, include:\n\n```text\ngenerated/content/<domain>/<node-id>/note.html\n```\n\nFor `contentFormat: none`, omit both note files.\n\n`meta.yaml` must include:\n\n```yaml\nid:\ntitle:\ndomain:\ntype:\nstatus:\nsummary:\ncontentFormat: markdown | html | none\naliases: []\ntags: []\nsourceIds: []\ncreatedAt:\nupdatedAt:\n```\n\nStrict match required:\n\n- `meta.id` must equal `node.id`\n- `meta.title` must equal `node.title`\n- `meta.domain` must equal `node.domain`\n- `meta.type` must equal `node.type`\n- `meta.status` must equal `node.status`\n- `meta.contentFormat` must equal `node.contentFormat` when provided\n\n## Canonical operation shapes\n\nUse flat `add_edge` operations only:\n\n```yaml\n- type: add_edge\n  from: source-node-id\n  to: target-node-id\n  relation: depends-on\n  reason: why this relationship is useful\n```\n\nNested `edge:` objects are forbidden.\n\n## Domain rules\n\nIf `DOMAIN_INDEX.yaml` is empty, start with `add_domain`.\n\nIf no suitable existing domain fits, create a small, stable, broad domain. Do not create excessive narrow domains.\n\n## Relation semantics\n\nRelation types are frozen:\n\n- `contains`\n- `depends-on`\n- `used-in`\n- `compares-with`\n\nDo not create new relation types.\n\n### contains\n\nHierarchy only. Usually generated by `parentId`. Do not manually add with `add_edge`.\n\n### depends-on\n\n`A depends-on B` means understanding B helps understand A.\n\nDirection matters.\n\nExample:\n\n```text\nthin-lens-and-focus depends-on refraction-and-snell-law\n```\n\n### used-in\n\n`A used-in B` means A is a technique/component/concept used inside B.\n\nExample:\n\n```text\npinhole-camera-geometry used-in camera-projection\n```\n\n### compares-with\n\nA and B are alternatives, contrasts, or related concepts that answer similar questions.\n\n## Relation quality rules\n\nDo not create edges just because two concepts appeared in the same article.\n\nEvery non-contains relation should be explainable in one sentence.\n\n## Source asset review files\n\nPackages based on visual or interactive sources must include:\n\n```text\nreview/source-coverage-plan.md\nreview/source-asset-manifest.md\nreview/interactive-demo-coverage.md\n```\n\nSource-rich or snapshot-backed packages should also include:\n\n```text\nreview/source-runtime-porting-notes.md\nreview/visual-contrast-audit.md\nreview/learner-facing-language-audit.md\nreview/content-sufficiency-audit.md\n```\n",
  "SOURCE_TO_NOTE_GUIDE.md": "# Source-to-Note Guide\n\nThis guide merges source extraction, source asset preservation, source snapshot usage, runtime porting, canvas integrity, and visual contrast requirements.\n\n## Source extraction\n\nExtract reusable knowledge, source assets, and teaching structure. Do not summarize paragraphs in order.\n\nRecord source identity:\n\n```yaml\nsource_id:\ntitle:\nauthor:\nurl:\nsource_type: article | paper | documentation | video | code | interactive-article | other\ndate:\nlanguage:\n```\n\nFor high-quality tutorials, preserve the explanatory sequence. Extract:\n\n- major sections,\n- important figures,\n- important videos/animations,\n- important interactive demos,\n- concepts introduced by each section,\n- variables/parameters controlled by each demo,\n- conclusions demonstrated by each visual.\n\n## Source asset inventory\n\nFor visual or interactive sources, create a full inventory:\n\n```yaml\nsource_assets:\n  - id:\n    type: image | video | animation | interactive-demo | downloadable-project | external-page | source-snapshot\n    source_url:\n    source_location:\n    required: true | false\n    teaching_role:\n    preservation_strategy:\n    represented_in_node:\n    note_location:\n```\n\nImportant source visuals are not optional. If they are central to explanation, mark `required: true`.\n\n## Source asset preservation\n\nHard rule: do not generate images. Use original source assets or source URLs.\n\nThis applies to:\n\n- images,\n- diagrams,\n- screenshots,\n- animations,\n- videos,\n- interactive demos,\n- downloadable source/project files.\n\nAllowed strategies, strongest first:\n\n1. `source-snapshot-assets + source-ported-interaction`\n2. `local-copy`\n3. `direct-url`\n4. `iframe` only as fallback/reference\n5. `source-link`\n6. `js-reproduction` only as supplementary explanation\n\nForbidden as a complete preservation strategy:\n\n```yaml\npreservation_strategy: source-link + js-reproduction\n```\n\nForbidden when a snapshot exists:\n\n```yaml\npreservation_strategy: snapshot-iframe-only\n```\n\n## Source snapshot usage\n\nA source snapshot is a local, private mirror of an original web page and its runtime assets. Use it as an asset library and behavior reference for building a knowledge-base-native note.\n\nThe snapshot is not the final note UI. Do not make the final note a thin iframe wrapper around the snapshot page.\n\nExpected structure:\n\n```text\nassets/source-snapshot/<source-id>/index.html\nassets/source-snapshot/<source-id>/snapshot-manifest.json\nassets/source-snapshot/<source-id>/README.md\nassets/source-snapshot/<source-id>/_resources/**\n```\n\nThe `_resources/` folder may contain copied original images, CSS, JavaScript, videos, fonts, wasm, JSON, and other runtime assets.\n\n## Required snapshot workflow\n\nWhen a source snapshot is available, do the following before writing `note.html`:\n\n1. Inspect `assets/source-snapshot/<source-id>/snapshot-manifest.json` when present.\n2. Inspect `assets/source-snapshot/<source-id>/index.html` to identify original section structure, demo containers, controls, labels, canvas/SVG elements, and script/style dependencies.\n3. Inspect relevant local CSS/JS resources under `_resources/`, especially source-specific scripts such as simulation code, shader code, data files, and media assets.\n4. Extract the actual source variables, controls, update logic, and visual output behavior.\n5. Build a knowledge-base-styled note that directly ports important interactions into `note.html` using source snapshot assets and behavior.\n\nUse this strategy for important interactive demos:\n\n```yaml\npreservation_strategy: source-snapshot-assets + source-ported-interaction\n```\n\nThis means:\n\n- the note uses local assets copied from the source snapshot where relevant;\n- the note's controls and interaction behavior are ported from the original source behavior;\n- the UI may be redesigned to fit the knowledge base style;\n- the conceptual behavior must remain faithful to the original demonstration.\n\nIf a reconstruction is not based on specific snapshot-observed source behavior, it must be marked as supplementary rather than primary preservation.\n\n## Do not mention the snapshot in learner-facing prose\n\nThe learner-facing note must teach the concept directly. Do not write:\n\n- `原 snapshot 中...`\n- `原始 SNAPSHOT 参考视图`\n- `根据 snapshot...`\n- `source snapshot shows...`\n\nSnapshot paths are implementation details. They may appear in `review/source-asset-manifest.md` and HTML asset paths, but not explanatory prose.\n\nSource blocks must cite the original URL and original source location, not the snapshot file:\n\n```html\n<aside class=\"source-block\">\n  <strong>Source</strong>\n  <a href=\"https://ciechanow.ski/cameras-and-lenses/\" target=\"_blank\" rel=\"noreferrer\">Cameras and Lenses</a>\n  <span>Location: Pinhole camera / hole diameter and sensor distance controls</span>\n</aside>\n```\n\n## Required markup\n\nEvery required source asset or demo must have a stable id and must be marked in the HTML with `data-source-asset`:\n\n```html\n<section class=\"rich-js-demo\" data-source-asset=\"pinhole-diameter-distance-demo\">\n  <!-- Directly ported controls/canvas/SVG using source assets and observed behavior. -->\n</section>\n```\n\nFor snapshot-backed demos, the manifest must include evidence of source-porting:\n\n```yaml\nsource_assets:\n  - id: pinhole-diameter-distance-demo\n    type: interactive-demo\n    source_url: https://example.com/original\n    source_location: section / demo label\n    required: true\n    represented_in_node: node-id\n    note_location: section 02\n    snapshot_path: assets/source-snapshot/source-id/index.html\n    snapshot_assets_used:\n      - assets/source-snapshot/source-id/_resources/source-specific.js\n      - assets/source-snapshot/source-id/_resources/source-specific.css\n    ported_original_controls:\n      - hole diameter\n      - sensor distance\n    ported_original_behavior:\n      - increasing hole diameter increases brightness and blur\n      - increasing sensor distance changes image size and exposure distribution\n    preservation_strategy: source-snapshot-assets + source-ported-interaction\n```\n\nIf an interaction cannot be directly ported, state the limitation with `unavailable_reason:` and mark any AI-authored demo as supplementary.\n\n## UI adaptation\n\nThe UI may be changed to match the knowledge base: dark panels, hard edges, concise control labels, source-linked captions, and app font-size variables.\n\nThe explanation must remain clear and direct. Preserve the original demo's key variables, cause-effect behavior, and observable results. Do not simplify the interaction so much that it becomes weaker than the source.\n\n## Canvas compositing integrity\n\nFor source demos that use canvas, inspect the original rendering context before making visual fixes.\n\nDo not globally patch `CanvasRenderingContext2D.prototype` to force a background color. This can destroy source compositing behavior.\n\nBefore changing a canvas background, audit:\n\n- `globalCompositeOperation`\n- alpha clearing behavior\n- transparent overlays\n- dark/light parent section\n- original canvas container background\n- source CSS variables and inherited colors\n\nUse this order for background fixes:\n\n1. preserve source DOM/context and original canvas behavior;\n2. fix container/CSS background;\n3. apply per-demo audited bitmap fill only when safe.\n\nNever apply a global canvas prototype patch.\n\n## Visual contrast and readability\n\nFor every HTML note, audit:\n\n- body text contrast,\n- source block contrast,\n- slider label contrast,\n- table header and cell contrast,\n- canvas foreground/background contrast,\n- review question panel contrast,\n- code block contrast.\n\nIf the original source uses light canvases or dark canvases, preserve the intended visual context. Do not place a dark-only source canvas on a light panel or a light-only canvas on a dark panel without explicit CSS/container adaptation.\n\n## Interactive demo coverage\n\nIf the source contains interactive demonstrations, the note must include a section for each important demo.\n\nRepresent each important demo by one or more of:\n\n- source-ported HTML/CSS/JS interaction,\n- local original image/video/animation,\n- exact source demo link with source block,\n- fallback iframe only when direct porting is infeasible,\n- supplementary JS/SVG/Canvas demo clearly marked as supplementary.\n\nOmitting important interactive demos is a quality failure.\n\n## Source-grounded claims\n\nExtract source-grounded claims:\n\n```yaml\nclaims:\n  - statement:\n    source_evidence:\n    source_location:\n    confidence: high | medium | low\n```\n\nDo not cite all claims only at the end. Add nearby source blocks.\n\n## Parameters and variables\n\nFor technical content, identify:\n\n```yaml\nparameter:\n  name:\n  meaning:\n  affects:\n  typical_range:\n  failure_mode:\n  source_location:\n```\n\nIf the source does not provide a range, say unknown. Do not invent precise values.\n\n## Candidate nodes\n\nBefore writing files, list candidate nodes:\n\n```yaml\ncandidate_nodes:\n  - id:\n    type: topic | concept | skill | question | paper | tool | project\n    why_node:\n    keep_or_reject:\n    reason:\n```\n\nReject nodes that are too small, duplicate, or only source-specific.\n",
  "NOTE_AND_BLOCK_GUIDE.md": "# Note and Block Guide\n\nThis guide merges note composition, HTML rich notes, content block usage, block registry guidance, declarative visuals, and expression visualizer rules.\n\n## Note purpose\n\nA note should teach one reusable knowledge object clearly enough that the user can review and apply it later.\n\nDo not produce a loose article summary. Do not merely translate the source.\n\n## No shrinkage rule\n\nIf the source is already a clear tutorial or interactive article, the generated note must not be less detailed, less visual, or less interactive than the source.\n\nAllowed:\n\n- clearer sectioning,\n- expanded explanation,\n- more explicit mechanisms,\n- more examples,\n- source-linked figures,\n- embedded or ported demos,\n- AI-authored supplemental JS interactions,\n- comparison tables,\n- review questions.\n\nNot allowed:\n\n- reducing an interactive article to a few paragraphs,\n- replacing source visuals with AI-generated images,\n- omitting important demos,\n- flattening multiple source demonstrations into one generic diagram,\n- losing the source's explanatory sequence.\n\n## Node granularity\n\nEach note should correspond to one reusable knowledge object.\n\nGood node objects:\n\n- concept,\n- mechanism,\n- skill,\n- question,\n- comparison,\n- procedure,\n- rich tutorial overview.\n\nBad node objects:\n\n- one node per minor paragraph,\n- vague titles,\n- source-specific title with no reusable meaning,\n- heavily compressed article summary.\n\n## Required note structure\n\nA high-quality note should include most of:\n\n1. precise definition,\n2. problem solved,\n3. core intuition,\n4. mechanism and cause-effect,\n5. formal/technical detail,\n6. concrete examples,\n7. parameters or variables,\n8. source images/videos/demos,\n9. common mistakes,\n10. relation to other nodes,\n11. source blocks near source-grounded explanations,\n12. review questions with answers.\n\n## HTML rich notes\n\nUse HTML rich notes when the source material is visual, interactive, tutorial-like, or when Markdown/content blocks would reduce clarity.\n\nFor rich tutorial notes, use:\n\n```yaml\ncontentFormat: html\n```\n\nThe generated file must be:\n\n```text\ngenerated/content/<domain>/<node-id>/note.html\n```\n\nThe AI may freely design HTML structure, explanatory flow, interactive sections, diagrams, tables, callouts, comparison panels, timelines, and simulations, as long as the result remains clear, readable, source-grounded, and consistent with the knowledge base style.\n\nJavaScript is allowed when it improves understanding:\n\n- interactive sliders,\n- canvas demonstrations,\n- SVG manipulation,\n- WebGL or Canvas educational demos,\n- parameterized optical/geometric simulations,\n- collapsible explanations,\n- synchronized figure/caption interactions,\n- interactive comparison panels.\n\nJavaScript must serve explanation. Do not add decorative effects.\n\n## Application style compatibility\n\nHTML notes must visually match the knowledge base program.\n\nUse app CSS variables where possible:\n\n```css\nvar(--color-bg)\nvar(--color-panel)\nvar(--color-panel-soft)\nvar(--color-text)\nvar(--color-text-muted)\nvar(--color-border)\nvar(--color-accent)\nvar(--font-size-xs)\nvar(--font-size-sm)\nvar(--font-size-md)\nvar(--font-size-lg)\nvar(--font-size-xl)\nvar(--font-size-2xl)\nvar(--font-size-3xl)\nvar(--ui-font-scale)\n```\n\nPrefer hard-edged, high-contrast technical layouts, square corners, clear lines, strong hierarchy, and restrained accent color.\n\n## Source block structure\n\nWhen the note explains a claim, figure, demo, formula, interaction, or implementation detail that comes from the source, add a nearby source block:\n\n```html\n<aside class=\"source-block\">\n  <strong>Source</strong>\n  <a href=\"https://example.com/article\" target=\"_blank\" rel=\"noreferrer\">Original article</a>\n  <span>Location: section title / figure number / demo name / nearby heading</span>\n</aside>\n```\n\nDo not put all sources only at the end.\n\n## Review questions with answers\n\nReview questions must not be a bare list. Each question must include an answer using `details`/`summary`:\n\n```html\n<section class=\"rich-review\">\n  <h2>复习问题</h2>\n  <details class=\"rich-qa\">\n    <summary>为什么小孔相机会形成倒立图像？</summary>\n    <div class=\"rich-answer\">\n      <p>因为来自场景上方的光线穿过小孔后落到传感器下方，来自左侧的光线落到右侧，上下和左右各翻转一次，合起来相当于 180° 旋转。</p>\n      <aside class=\"source-block\">\n        <strong>Source</strong>\n        <a href=\"https://ciechanow.ski/cameras-and-lenses/\" target=\"_blank\" rel=\"noreferrer\">Cameras and Lenses</a>\n        <span>Location: Pinhole camera / ray inversion explanation</span>\n      </aside>\n    </div>\n  </details>\n</section>\n```\n\n## Native blocks\n\nUse native blocks for compact Markdown notes:\n\n- `concept-card`\n- `process-flow`\n- `compare-table`\n- `code-explain`\n- `quiz`\n- `expression-visualizer`\n\nTeaching goals:\n\n| Teaching goal | Preferred representation |\n|---|---|\n| Define a concept | concept-card |\n| Show a process | process-flow |\n| Compare alternatives | compare-table |\n| Explain code | code-explain |\n| Test recall | quiz |\n| Show safe scalar formula behavior | expression-visualizer |\n| Preserve source-rich tutorial | HTML Rich Note |\n\nDo not use blocks as decoration.\n\n## HTML over excessive blocks\n\nFor full tutorial/article presentation, source assets, or interactivity, use `contentFormat: html` instead of stacking many unrelated native blocks.\n\nFor maximum creative freedom or JavaScript interaction, use `note.html` rather than custom block types.\n\n## Custom declarative blocks\n\nCustom block-types live in `block-types/*.yaml` and must use:\n\n```yaml\nkind: declarative-visual\nrenderer:\n  engine: visual-grammar\n```\n\nUse declarative visual blocks when the note needs labeled nodes, explicit arrows, staged diagrams, formula callouts, simple geometry, or repeated visual elements based on block data.\n\nSupported layout types:\n\n- split-panel\n- stack\n- grid\n\nSupported panel types:\n\n- svg-scene\n- inspector\n\nSupported element types:\n\n- node\n- edge\n- arrow\n- label\n- text\n- badge\n- formula-callout\n- rect\n- line\n- circle\n\nCoordinates use normalized 2D values in [0, 1].\n\nDo not use declarative visual blocks to replace original source figures. Use original source asset URLs, local source assets, or HTML source-ported interactions when original visuals exist.\n\n## Expression visualizer\n\n`expression-visualizer` is for visualizing a safe, explicit mathematical render specification.\n\nIt must not be used as a generic formula display block.\n\nSupported render modes:\n\n- `curve2d` with `render.y`\n- `surface3d` with `render.z`\n\nDo not use expression-visualizer for vector fields, symbolic derivatives, or unsupported formulas. Use HTML notes with source assets or JS/SVG/Canvas demos instead.\n",
  "NOTE_QUALITY_RUBRIC.md": "# Note Quality Rubric and Pre-export Checklist\n\nTarget score: 4 or higher.\n\n## 5 Excellent\n\nThe note is at least as clear as the source and preferably clearer.\n\nCriteria:\n\n- precise definition,\n- clear problem,\n- mechanism,\n- examples,\n- parameters,\n- common mistakes,\n- meaningful relations,\n- review questions with answers,\n- purposeful original source visuals,\n- all important interactive demos represented or source-ported,\n- source blocks close to source-grounded explanations,\n- source snapshot assets and runtime behavior used when available,\n- AI-authored JS interactions improve understanding when used.\n\n## 4 Good\n\nUsable and mostly complete. Clear mechanism and concrete examples. Important source assets are preserved, ported, or linked.\n\n## 3 Shallow\n\nStructurally valid but too summary-like, or missing some important source visuals/demos.\n\n## 2 Poor\n\nMostly paraphrase with little mechanism. Tutorial source is heavily compressed.\n\nA rich HTML note cannot score above 2 if it replaces high-quality original figures or interactive demos with AI-generated images or generic demos.\n\n## 1 Invalid\n\nIncorrect, empty, misleading, broken, or fails source asset preservation.\n\n## Mandatory self-check\n\nFor each note, answer in `review/validation-checklist.md`:\n\n```yaml\nnote_quality:\n  node_id:\n  contentFormat: markdown | html | none\n  estimated_score:\n  strongest_part:\n  weakest_part:\n  source_assets_preserved: true | false\n  required_demos_represented: true | false\n  generated_images_used: false\n  source_blocks_near_claims: true | false\n  revision_done: true | false\n```\n\n## Runtime quality self-audit\n\nFor source-rich or snapshot-backed HTML notes, also include:\n\n```yaml\nruntime_quality:\n  original_demo_ids_present: true | false\n  original_demo_contexts_preserved: true | false\n  original_controls_or_behavior_ported: true | false\n  dark_light_canvas_contexts_verified: true | false\n  slider_overlap_checked: true | false\n  contrast_checked_for_text_and_canvas: true | false\n  learner_facing_meta_language_removed: true | false\n  module_explanations_sufficient: true | false\n  unsupported_assets_filtered: true | false\n```\n\n## Visual contrast checklist\n\nBefore export, inspect the actual rendered note and check:\n\n- main prose contrast,\n- source block contrast,\n- table header/cell contrast,\n- slider labels,\n- canvas visibility,\n- review panels,\n- code blocks,\n- captions,\n- disabled/loading states.\n\n## Learner-facing language audit\n\nRemove implementation-facing prose from the final note body:\n\n- no `source snapshot` explanations,\n- no `source-ported` labels in title/body,\n- no `strictly ported` claims,\n- no `按照 zh-CN`,\n- no “I used the snapshot” style statements.\n\nThe note should teach the concept directly in the target locale.\n\n## Content sufficiency audit\n\nIf the source explanation is terse, expand it. If the source is insufficient for a required concept, use external research only when needed, cite supplemental sources, and clearly separate supplemental explanation from source-grounded statements.\n\n## Package reliability checklist\n\nBefore final `.wawapkg`:\n\n- package root contains required files,\n- `mimetype` exact match,\n- `manifest.yaml` valid,\n- `patch.yaml` uses canonical operation shapes,\n- all `add_edge` operations are flat,\n- all referenced note files exist,\n- all required review files exist for visual/interactive sources,\n- no generated raster images,\n- unsupported assets filtered or allowed by importer,\n- JavaScript syntax checked,\n- important local assets referenced,\n- source asset manifest complete.\n",
  "RULE_PRIORITY.yaml": YAML.stringify({
  "rulePriority": [
    "AI_CONTEXT.yaml",
    "AI_KB_GUIDE.md",
    "SOURCE_TO_NOTE_GUIDE.md",
    "PACKAGE_AND_RELATION_GUIDE.md",
    "NOTE_AND_BLOCK_GUIDE.md",
    "NOTE_QUALITY_RUBRIC.md",
    "BLOCK_REGISTRY.md",
    "dynamic indexes"
  ],
  "conflictResolution": {
    "sourceSnapshotRulesOverrideIframeRules": true,
    "sourcePortedInteractionOverridesGenericJsReproduction": true,
    "learnerFacingVoiceOverridesImplementationDescription": true,
    "noGeneratedImagesOverridesAllFallbacks": true,
    "flatEdgeShapeIsMandatory": true
  }
}),
};

function augmentPackageAndRelationGuide() {
  const guideName = "PACKAGE_AND_RELATION_GUIDE.md";
  let guide = STATIC_CONTEXT_FILES[guideName];

  guide = guide.replace(
    "`meta.yaml` must include:\n\n```yaml\nid:\ntitle:\ndomain:\ntype:\nstatus:\nsummary:\ncontentFormat: markdown | html | none\naliases: []\ntags: []\nsourceIds: []\ncreatedAt:\nupdatedAt:\n```",
    "`meta.yaml` must include an English title and should include locale fields when available:\n\n```yaml\nid:\ntitle: English title\ntitleLocale: Locale title when available\ndomain:\ntype:\nstatus:\nsummary: English one-sentence summary\nsummaryLocale: Locale one-sentence summary when available\ncontentFormat: markdown | html | none\naliases: []\ntags: []\nsourceIds: []\ncreatedAt:\nupdatedAt:\n```"
  );

  guide = guide.replace(
    "- `meta.title` must equal `node.title`\n- `meta.domain` must equal `node.domain`",
    "- `meta.title` must equal `node.title`\n- `meta.titleLocale` must equal `node.titleLocale` when provided\n- `meta.domain` must equal `node.domain`"
  );

  guide = guide.replace(
    "## Canonical operation shapes\n\nUse flat `add_edge` operations only:",
    "## Canonical operation shapes\n\nFor `add_node`, always include the English `title`; include `titleLocale` when a target-locale title is available:\n\n```yaml\n- type: add_node\n  id: pinhole-camera\n  title: Pinhole Camera\n  titleLocale: Xiao Kong Xiang Ji\n  domain: optics\n  type: concept\n  status: seed\n  summary: One sentence in English.\n  summaryLocale: One sentence in the package locale when available.\n  contentFormat: markdown\n  parentId: cameras-and-lenses\n```\n\nUse flat `add_edge` operations only:"
  );

  guide = guide.replace(
    "If `DOMAIN_INDEX.yaml` is empty, start with `add_domain`.\n\nIf no suitable existing domain fits, create a small, stable, broad domain. Do not create excessive narrow domains.",
    "If `DOMAIN_INDEX.yaml` is empty, start with `add_domain`.\n\nFor `add_domain`, always include the English `title`; include `titleLocale` when a target-locale title is available:\n\n```yaml\n- type: add_domain\n  id: optics\n  title: Optics\n  titleLocale: Guang Xue\n  description: Cameras, lenses, light transport, and imaging.\n  descriptionLocale: Domain description in the package locale when available.\n  color: \"#00b7ff\"\n  order: 10\n```\n\nIf no suitable existing domain fits, create a small, stable, broad domain. Do not create excessive narrow domains."
  );

  STATIC_CONTEXT_FILES[guideName] = guide;
}

augmentPackageAndRelationGuide();

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

Native block usage, HTML rich note strategy, declarative visual rules, and expression visualizer rules are consolidated in \`NOTE_AND_BLOCK_GUIDE.md\`.

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

function displayTitle(entity = {}) {
  return entity.titleLocale || entity.title || entity.id || "";
}

function buildAiContextYaml(vault, domains, nodes, edges, customBlocks) {
  const context = {
    vault: {
      schemaVersion: vault.schemaVersion || 1,
      title: vault.title || "AmazingWawa Knowledge Base",
      description:
        vault.description ||
        "Local-first knowledge graph vault for technical learning, project knowledge, and review.",
      language: vault.language || "zh-CN",
      defaultDomain: vault.defaultDomain || domains[0]?.id || "",
    },
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
        html: "source-snapshot-assets-first when assets/source-snapshot exists; otherwise source-url-first",
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
        preserveCanvasCompositing: true,
        noGlobalCanvasPrototypeBackgroundPatch: true,
        scanGlobalCompositeOperationBeforeCanvasFix: true,
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
        preserveCanvasAlphaCompositing: true,
        canvasBackgroundFixOrder: [
          "source DOM/context restoration",
          "container/CSS background",
          "per-demo audited bitmap fill only when safe",
        ],
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
        reviewFilesAdditionalRequiredForSnapshotSources: [
          "review/source-runtime-porting-notes.md",
          "review/visual-contrast-audit.md",
          "review/learner-facing-language-audit.md",
          "review/content-sufficiency-audit.md",
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
  };

  return YAML.stringify(context);
}

export function buildAiContextFiles(vault = {}) {
  const registry = getBlockRegistry(vault);
  const customBlocks = Object.values(registry.declarative || {});

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
      const contentFormat = inferContentFormat(node, note);
      const hasNote = Boolean(note.markdown || note.html);
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
    reason: edge.reason || "",
  }));

  return {
    ...STATIC_CONTEXT_FILES,
    "BLOCK_REGISTRY.md": blockRegistryMarkdown(customBlocks),
    "CUSTOM_BLOCK_INDEX.yaml": customBlockIndex(customBlocks),
    "AI_CONTEXT.yaml": buildAiContextYaml(vault, domains, nodes, edges, customBlocks),
    "DOMAIN_INDEX.yaml": YAML.stringify({ domains }),
    "NODE_INDEX.yaml": YAML.stringify({ nodes }),
    "RELATION_INDEX.yaml": YAML.stringify({ relations: edges }),
  };
}
