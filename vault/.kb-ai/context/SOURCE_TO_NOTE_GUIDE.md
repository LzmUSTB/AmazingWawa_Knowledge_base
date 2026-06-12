# Source-to-Note Guide

This guide merges source extraction, source asset preservation, source snapshot usage, runtime porting, canvas integrity, and visual contrast requirements.

## Source extraction

Extract reusable knowledge, source assets, and teaching structure. Do not summarize paragraphs in order.

Record source identity:

```yaml
source_id:
title:
author:
url:
source_type: article | paper | documentation | video | code | interactive-article | other
date:
language:
```

For high-quality tutorials, preserve the explanatory sequence. Extract:

- major sections,
- important figures,
- important videos/animations,
- important interactive demos,
- concepts introduced by each section,
- variables/parameters controlled by each demo,
- conclusions demonstrated by each visual.

## Source asset inventory

For visual or interactive sources, create a full inventory:

```yaml
source_assets:
  - id:
    type: image | video | animation | interactive-demo | downloadable-project | external-page | source-snapshot
    source_url:
    source_location:
    required: true | false
    teaching_role:
    preservation_strategy:
    represented_in_node:
    note_location:
```

Important source visuals are not optional. If they are central to explanation, mark `required: true`.

## Source asset preservation

Hard rule: do not generate images. Use original source assets or source URLs.

This applies to:

- images,
- diagrams,
- screenshots,
- animations,
- videos,
- interactive demos,
- downloadable source/project files.

Allowed strategies, strongest first:

1. `source-snapshot-assets + source-ported-interaction`
2. `local-copy`
3. `direct-url`
4. `iframe` only as fallback/reference
5. `source-link`
6. `js-reproduction` only as supplementary explanation

Forbidden as a complete preservation strategy:

```yaml
preservation_strategy: source-link + js-reproduction
```

Forbidden when a snapshot exists:

```yaml
preservation_strategy: snapshot-iframe-only
```

## Source snapshot usage

A source snapshot is a local, private mirror of an original web page and its runtime assets. Use it as an asset library and behavior reference for building a knowledge-base-native note.

The snapshot is not the final note UI. Do not make the final note a thin iframe wrapper around the snapshot page.

Expected structure:

```text
assets/source-snapshot/<source-id>/index.html
assets/source-snapshot/<source-id>/snapshot-manifest.json
assets/source-snapshot/<source-id>/README.md
assets/source-snapshot/<source-id>/_resources/**
```

The `_resources/` folder may contain copied original images, CSS, JavaScript, videos, fonts, wasm, JSON, and other runtime assets.

## Required snapshot workflow

When a source snapshot is available, do the following before writing `note.html`:

1. Inspect `assets/source-snapshot/<source-id>/snapshot-manifest.json` when present.
2. Inspect `assets/source-snapshot/<source-id>/index.html` to identify original section structure, demo containers, controls, labels, canvas/SVG elements, and script/style dependencies.
3. Inspect relevant local CSS/JS resources under `_resources/`, especially source-specific scripts such as simulation code, shader code, data files, and media assets.
4. Extract the actual source variables, controls, update logic, and visual output behavior.
5. Build a knowledge-base-styled note that directly ports important interactions into `note.html` using source snapshot assets and behavior.

Use this strategy for important interactive demos:

```yaml
preservation_strategy: source-snapshot-assets + source-ported-interaction
```

This means:

- the note uses local assets copied from the source snapshot where relevant;
- the note's controls and interaction behavior are ported from the original source behavior;
- the UI may be redesigned to fit the knowledge base style;
- the conceptual behavior must remain faithful to the original demonstration.

If a reconstruction is not based on specific snapshot-observed source behavior, it must be marked as supplementary rather than primary preservation.

## Do not mention the snapshot in learner-facing prose

The learner-facing note must teach the concept directly. Do not write:

- `原 snapshot 中...`
- `原始 SNAPSHOT 参考视图`
- `根据 snapshot...`
- `source snapshot shows...`

Snapshot paths are implementation details. They may appear in `review/source-asset-manifest.md` and HTML asset paths, but not explanatory prose.

Source blocks must cite the original URL and original source location, not the snapshot file:

```html
<aside class="source-block">
  <strong>Source</strong>
  <a href="https://ciechanow.ski/cameras-and-lenses/" target="_blank" rel="noreferrer">Cameras and Lenses</a>
  <span>Location: Pinhole camera / hole diameter and sensor distance controls</span>
</aside>
```

## Required markup

Every required source asset or demo must have a stable id and must be marked in the HTML with `data-source-asset`:

```html
<section class="rich-js-demo" data-source-asset="pinhole-diameter-distance-demo">
  <!-- Directly ported controls/canvas/SVG using source assets and observed behavior. -->
</section>
```

For snapshot-backed demos, the manifest must include evidence of source-porting:

```yaml
source_assets:
  - id: pinhole-diameter-distance-demo
    type: interactive-demo
    source_url: https://example.com/original
    source_location: section / demo label
    required: true
    represented_in_node: node-id
    note_location: section 02
    snapshot_path: assets/source-snapshot/source-id/index.html
    snapshot_assets_used:
      - assets/source-snapshot/source-id/_resources/source-specific.js
      - assets/source-snapshot/source-id/_resources/source-specific.css
    ported_original_controls:
      - hole diameter
      - sensor distance
    ported_original_behavior:
      - increasing hole diameter increases brightness and blur
      - increasing sensor distance changes image size and exposure distribution
    preservation_strategy: source-snapshot-assets + source-ported-interaction
```

If an interaction cannot be directly ported, state the limitation with `unavailable_reason:` and mark any AI-authored demo as supplementary.

## UI adaptation

The UI may be changed to match the knowledge base: dark panels, hard edges, concise control labels, source-linked captions, and app font-size variables.

The explanation must remain clear and direct. Preserve the original demo's key variables, cause-effect behavior, and observable results. Do not simplify the interaction so much that it becomes weaker than the source.

## Canvas compositing integrity

For source demos that use canvas, inspect the original rendering context before making visual fixes.

Do not globally patch `CanvasRenderingContext2D.prototype` to force a background color. This can destroy source compositing behavior.

Before changing a canvas background, audit:

- `globalCompositeOperation`
- alpha clearing behavior
- transparent overlays
- dark/light parent section
- original canvas container background
- source CSS variables and inherited colors

Use this order for background fixes:

1. preserve source DOM/context and original canvas behavior;
2. fix container/CSS background;
3. apply per-demo audited bitmap fill only when safe.

Never apply a global canvas prototype patch.

## Visual contrast and readability

For every HTML note, audit:

- body text contrast,
- source block contrast,
- slider label contrast,
- table header and cell contrast,
- canvas foreground/background contrast,
- review question panel contrast,
- code block contrast.

If the original source uses light canvases or dark canvases, preserve the intended visual context. Do not place a dark-only source canvas on a light panel or a light-only canvas on a dark panel without explicit CSS/container adaptation.

## Interactive demo coverage

If the source contains interactive demonstrations, the note must include a section for each important demo.

Represent each important demo by one or more of:

- source-ported HTML/CSS/JS interaction,
- local original image/video/animation,
- exact source demo link with source block,
- fallback iframe only when direct porting is infeasible,
- supplementary JS/SVG/Canvas demo clearly marked as supplementary.

Omitting important interactive demos is a quality failure.

## Source-grounded claims

Extract source-grounded claims:

```yaml
claims:
  - statement:
    source_evidence:
    source_location:
    confidence: high | medium | low
```

Do not cite all claims only at the end. Add nearby source blocks.

## Parameters and variables

For technical content, identify:

```yaml
parameter:
  name:
  meaning:
  affects:
  typical_range:
  failure_mode:
  source_location:
```

If the source does not provide a range, say unknown. Do not invent precise values.

## Candidate nodes

Before writing files, list candidate nodes:

```yaml
candidate_nodes:
  - id:
    type: topic | concept | skill | question | paper | tool | project
    why_node:
    keep_or_reject:
    reason:
```

Reject nodes that are too small, duplicate, or only source-specific.
