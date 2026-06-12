# Source Snapshot Usage Guide

## Purpose

A source snapshot is a local, private mirror of an original web page and its runtime assets. Use it to preserve the source's original assets and interaction behavior without repeatedly embedding external URLs.

The snapshot is not automatically the final note. Treat it as a local source asset repository and behavioral reference.

## Expected snapshot structure

A snapshot usually contains:

```text
assets/source-snapshot/<source-id>/index.html
assets/source-snapshot/<source-id>/snapshot-manifest.json
assets/source-snapshot/<source-id>/README.md
assets/source-snapshot/<source-id>/_resources/**
```

The `_resources/` folder may contain copied original images, CSS, JavaScript, videos, fonts, wasm, JSON, and other runtime assets.

## Priority order

When a snapshot is available, use this priority order:

1. Directly use copied original media from `assets/source-snapshot/<source-id>/_resources/`.
2. Recreate source interactions directly inside `note.html` using HTML/CSS/JS and snapshot assets as reference.
3. Use the original source URL only for attribution and exact-location source blocks.
4. Use a whole-snapshot iframe only as fallback/debug reference, not as the main note experience.
5. Use AI-authored supplementary demos only when the snapshot cannot provide enough isolated behavior.

## Do not use snapshot as default iframe

Do not make the final note a thin wrapper around:

```html
<iframe src="assets/source-snapshot/<source-id>/index.html"></iframe>
```

This is discouraged because it preserves the original page but does not produce a knowledge-base-native teaching note.

Instead, write a clear teaching note that:

- uses source snapshot assets directly,
- implements the important controls directly in the note when feasible,
- explains each control and observation in the target locale,
- uses source blocks near claims and demos,
- keeps the layout consistent with the knowledge base style.

## Reimplementing source interactions

When the original source has sliders, play/pause controls, draggable handles, canvas demos, or synchronized figures, reproduce the educational behavior directly in the note.

A good reconstruction keeps:

- the same conceptual variables,
- the same cause-effect relationship,
- the same observed outcome,
- the same source asset or visual reference when available.

The UI may be redesigned to fit the knowledge base style. It may use different visual framing, panels, labels, control layout, and explanatory callouts, as long as the interaction remains clear and faithful.

## Required markup

Mark every source-backed visual or reconstructed interaction with `data-source-asset`:

```html
<section class="rich-js-demo" data-source-asset="pinhole-diameter-distance-demo">
  <!-- knowledge-base styled controls and canvas/svg based on snapshot behavior -->
</section>
```

Use source blocks near the demo:

```html
<aside class="source-block">
  <strong>Source</strong>
  <a href="https://ciechanow.ski/cameras-and-lenses/" target="_blank" rel="noreferrer">Cameras and Lenses</a>
  <span>Location: Pinhole camera / hole diameter and sensor distance controls; reconstructed using local source snapshot assets.</span>
</aside>
```

## Review files

For snapshot-backed packages, `review/source-asset-manifest.md` must state:

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
      - assets/source-snapshot/source-id/_resources/example.png
      - assets/source-snapshot/source-id/_resources/example.js
    preservation_strategy: snapshot-assets + direct-js-reimplementation
    fallback_if_any: none
```

If an interaction cannot be directly reimplemented, state the limitation clearly and use `unavailable_reason:`.

## Language and style

Use the target locale for explanatory text. The note UI may be adapted to the knowledge base visual style, but the explanation must remain clear, direct, and teachable.


# Source-first strict revisions

These rules override weaker or older guidance in this context export.

## Snapshot-backed source preservation

If a package includes `assets/source-snapshot/`, that snapshot must be treated as the highest-priority source asset library.

Do not use a whole snapshot iframe as the primary note representation. The AI should use the snapshot's local assets and behavior to implement the important demos directly inside `note.html` with knowledge-base-styled HTML/CSS/JS.

Allowed fallback: a whole-snapshot iframe may be included only as a secondary reference/debug view when the interaction cannot be isolated or faithfully reimplemented. It must be clearly labeled as fallback and must not replace the teaching explanation.

## Original media and interactive demos

For asset-rich or interactive sources, source-root links are not enough. A note must try to show or reconstruct original source material directly inside the note.

Priority order when no source snapshot exists:

1. Direct original media URL: `<img src="https://...">`, `<video src="https://...">`, `<source src="https://...">`.
2. Local copied original media: `<img src="assets/original/...">` or `<img src="assets/source-assets/...">`.
3. Original interactive source embed only if no snapshot is available and direct reconstruction is not feasible.
4. Direct source demo link with exact location label.
5. AI-authored JS/Canvas/SVG demos only as supplementary explanation.

Priority order when a source snapshot exists:

1. Use local original assets from `assets/source-snapshot/<source-id>/_resources/`.
2. Reimplement source interactions directly in the note using knowledge-base-styled controls and snapshot-observed behavior.
3. Use source URL/source blocks for attribution and source location.
4. Use iframe only as fallback/reference, not as the primary final note.

Forbidden as a complete preservation strategy:

```yaml
preservation_strategy: source-link + js-reproduction
```

Also forbidden when a snapshot exists:

```yaml
preservation_strategy: snapshot-iframe-only
```

## Required source asset markers

Every required source asset or demo must have a stable id and must be marked in the HTML with `data-source-asset`:

```html
<section class="rich-js-demo" data-source-asset="pinhole-diameter-distance-demo">
  <!-- Directly implemented controls/canvas/SVG using snapshot assets and observed behavior. -->
</section>
```

For snapshot-backed demos, prefer this manifest shape:

```yaml
source_assets:
  - id: pinhole-diameter-distance-demo
    type: interactive-demo
    source_url: https://ciechanow.ski/cameras-and-lenses/
    source_location: Pinhole camera / hole diameter and sensor distance sliders
    required: true
    represented_in_node: pinhole-camera-geometry
    note_location: section 01
    snapshot_path: assets/source-snapshot/cameras-and-lenses/index.html
    snapshot_assets_used:
      - assets/source-snapshot/cameras-and-lenses/_resources/example.png
    preservation_strategy: snapshot-assets + direct-js-reimplementation
```

Do not put `node-id / section xx` into `note_location` as the only machine-readable location. Use `represented_in_node` for the node id.

## UI adaptation rule

The note's explanatory UI may be redesigned to match the knowledge base style: hard-edged panels, dark theme, restrained accent color, clear control labels, and app font-size variables.

The source interaction's meaning must remain faithful: preserve variables, cause-effect behavior, and observed outcomes. Do not hide important original controls or simplify the interaction so much that the concept becomes weaker than the source.

## Locale rule

Use the target locale for explanations, section titles, captions, review questions, and answers.

Locale priority:

1. `manifest.yaml.language`,
2. `AI_CONTEXT.yaml.vault.language`,
3. source language,
4. `zh-CN` fallback.

Keep standard technical terms in English when they are more precise, but explain them in the target locale.

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

For sources whose clarity comes from interactive demos, the package must not pretend that a local AI-authored canvas is equivalent to the original. If a source snapshot exists, the correct high-fidelity approach is direct note implementation using snapshot assets and behavior, not repeated iframes or external links.
