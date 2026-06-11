# Source Extraction Guide

Extract reusable knowledge, source assets, and teaching structure. Do not summarize paragraphs in order.

## Source identity

Record:

```yaml
source_id:
title:
author:
url:
source_type: article | paper | documentation | video | code | interactive-article | other
date:
language:
```

## Source teaching structure

For high-quality tutorials, preserve the explanatory sequence.

Extract:

- major sections,
- important figures,
- important videos/animations,
- important interactive demos,
- concepts introduced by each section,
- variables/parameters controlled by each demo,
- conclusions demonstrated by each visual.

## Source asset and demo extraction

For visual or interactive sources, create a full inventory:

```yaml
source_assets:
  - id:
    type: image | video | animation | interactive-demo | downloadable-project | external-page
    source_url:
    source_location:
    required: true | false
    teaching_role:
    preservation_strategy: direct-url | local-copy | iframe | source-link | js-reproduction
```

Important source visuals are not optional. If they are central to explanation, mark `required: true`.

## Core claims

Extract source-grounded claims:

```yaml
claims:
  - statement:
    source_evidence:
    source_location:
    confidence: high | medium | low
```

## Mechanisms

Extract cause-effect structures:

```text
X changes Y because Z.
X is transformed into Y through steps A, B, C.
Changing parameter P affects result R.
```

## Procedures

Extract workflows:

```yaml
procedure:
  goal:
  steps:
    - id:
      action:
      reason:
      output:
```

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

## Coverage rule

If the source is clearer than a plain note because of visuals or interaction, the generated package must preserve those visual/interactive units. Any required source asset or demo not represented must be listed in `review/interactive-demo-coverage.md` with a reason.


# Source-first strict revisions

These rules override weaker or older guidance in this context export.

## Original media and interactive demos

For asset-rich or interactive sources, source-root links are not enough. A note must try to show original source material directly inside the note.

Priority order:

1. Direct original media URL: `<img src="https://...">`, `<video src="https://...">`, `<source src="https://...">`.
2. Original interactive source embed: `<iframe src="https://...">` with `data-source-asset="..."`.
3. If per-demo URLs are unavailable, embed the source page or closest section URL and identify the exact source location in a nearby source block.
4. AI-authored JS/Canvas/SVG demos may be added only as supplementary explanation. They do not replace original demos.
5. If embedding is impossible because the source blocks framing, uses inaccessible generated resources, or exposes no stable asset URL, document this in `review/source-asset-manifest.md` using `unavailable_reason:` and provide a precise source link.

Forbidden as a complete preservation strategy:

```yaml
preservation_strategy: source-link + js-reproduction
```

This is allowed only as a fallback when paired with `unavailable_reason:` and explicit source blocks.

## Required source asset markers

Every required source asset or demo must have a stable id and must be marked in the HTML with `data-source-asset`:

```html
<section class="rich-source-demo" data-source-asset="pinhole-diameter-distance-demo">
  <iframe class="rich-source-frame" src="https://ciechanow.ski/cameras-and-lenses/#pinhole-camera"></iframe>
  <aside class="source-block">
    <strong>Source</strong>
    <a href="https://ciechanow.ski/cameras-and-lenses/" target="_blank" rel="noreferrer">Cameras and Lenses</a>
    <span>Location: Pinhole camera / hole diameter and sensor distance sliders</span>
  </aside>
</section>
```

In `review/source-asset-manifest.md`, use machine-readable note ids separately from human section labels:

```yaml
source_assets:
  - id: pinhole-diameter-distance-demo
    type: interactive-demo
    source_url: https://ciechanow.ski/cameras-and-lenses/
    source_location: Pinhole camera / hole diameter and sensor distance sliders
    required: true
    represented_in_node: pinhole-camera-geometry
    note_location: section 01
    preservation_strategy: iframe + supplementary-js
```

Do not put `node-id / section xx` into `note_location` as the only machine-readable location. Use `represented_in_node` for the node id.

## Review questions with answers

Review questions must not be a bare list. Each question must include an answer using `details`/`summary`:

```html
<section class="rich-review">
  <h2>复习问题</h2>
  <details class="rich-qa">
    <summary>为什么小孔相机会形成倒立图像？</summary>
    <div class="rich-answer">
      <p>因为来自场景上方的光线穿过小孔后落到传感器下方，来自左侧的光线落到右侧，上下和左右各翻转一次，合起来相当于 180° 旋转。</p>
      <aside class="source-block">
        <strong>Source</strong>
        <a href="https://ciechanow.ski/cameras-and-lenses/" target="_blank" rel="noreferrer">Cameras and Lenses</a>
        <span>Location: Pinhole camera / ray inversion explanation</span>
      </aside>
    </div>
  </details>
</section>
```

Bare `<ol><li>question</li></ol>` review sections are not acceptable for final-quality notes.

## Quality bar for Ciechanowski-style sources

For sources whose clarity comes from interactive demos, the package must not pretend that a local AI-authored canvas is equivalent to the original. The note should either embed the original source/demo, use original media URLs, or clearly state why a direct embed is impossible while still linking the exact source location.
