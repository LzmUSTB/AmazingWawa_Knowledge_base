# Note Quality Rubric and Pre-export Checklist

Target score: 4 or higher.

## 5 Excellent

The note is at least as clear as the source and preferably clearer.

Criteria:

- precise definition,
- clear problem,
- mechanism,
- examples,
- parameters,
- common mistakes,
- meaningful relations,
- review questions with answers,
- purposeful original source visuals,
- all important interactive demos represented or source-ported,
- source blocks close to source-grounded explanations,
- source snapshot assets and runtime behavior used when available,
- AI-authored JS interactions improve understanding when used.

## 4 Good

Usable and mostly complete. Clear mechanism and concrete examples. Important source assets are preserved, ported, or linked.

## 3 Shallow

Structurally valid but too summary-like, or missing some important source visuals/demos.

## 2 Poor

Mostly paraphrase with little mechanism. Tutorial source is heavily compressed.

A rich HTML note cannot score above 2 if it replaces high-quality original figures or interactive demos with AI-generated images or generic demos.

## 1 Invalid

Incorrect, empty, misleading, broken, or fails source asset preservation.

## Mandatory self-check

For each note, answer in `review/validation-checklist.md`:

```yaml
note_quality:
  node_id:
  contentFormat: markdown | html | none
  estimated_score:
  strongest_part:
  weakest_part:
  source_assets_preserved: true | false
  required_demos_represented: true | false
  generated_images_used: false
  source_blocks_near_claims: true | false
  revision_done: true | false
```

## Runtime quality self-audit

For source-rich or snapshot-backed HTML notes, also include:

```yaml
runtime_quality:
  original_demo_ids_present: true | false
  original_demo_contexts_preserved: true | false
  original_controls_or_behavior_ported: true | false
  dark_light_canvas_contexts_verified: true | false
  slider_overlap_checked: true | false
  contrast_checked_for_text_and_canvas: true | false
  learner_facing_meta_language_removed: true | false
  module_explanations_sufficient: true | false
  unsupported_assets_filtered: true | false
```

## Visual contrast checklist

Before export, inspect the actual rendered note and check:

- main prose contrast,
- source block contrast,
- table header/cell contrast,
- slider labels,
- canvas visibility,
- review panels,
- code blocks,
- captions,
- disabled/loading states.

## Learner-facing language audit

Remove implementation-facing prose from the final note body:

- no `source snapshot` explanations,
- no `source-ported` labels in title/body,
- no `strictly ported` claims,
- no `按照 zh-CN`,
- no “I used the snapshot” style statements.

The note should teach the concept directly in the target locale.

## Content sufficiency audit

If the source explanation is terse, expand it. If the source is insufficient for a required concept, use external research only when needed, cite supplemental sources, and clearly separate supplemental explanation from source-grounded statements.

## Package reliability checklist

Before final `.wawapkg`:

- package root contains required files,
- `mimetype` exact match,
- `manifest.yaml` valid,
- `patch.yaml` uses canonical operation shapes,
- `add_node` uses nested `node:` form or flat `nodeType`; never use top-level `type: add_node` as the node knowledge type,
- `contentFormat: none` nodes have no `note.md` or `note.html`,
- all `add_edge` operations are flat,
- all referenced note files exist,
- all required review files exist for visual/interactive sources,
- no generated raster images,
- unsupported assets filtered or allowed by importer,
- JavaScript syntax checked,
- important local assets referenced,
- source asset manifest complete and parseable as fenced YAML with top-level `source_assets`.
