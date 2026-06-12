# Source Snapshot Usage Guide

## Purpose

A source snapshot is a local, private mirror of an original web page and its runtime assets. Use it as an asset library and behavior reference for building a knowledge-base-native note.

The snapshot is not the final note UI. Do not make the final note a thin iframe wrapper around the snapshot page.

## Expected snapshot structure

A snapshot usually contains:

```text
assets/source-snapshot/<source-id>/index.html
assets/source-snapshot/<source-id>/snapshot-manifest.json
assets/source-snapshot/<source-id>/README.md
assets/source-snapshot/<source-id>/_resources/**
```

The `_resources/` folder may contain copied original images, CSS, JavaScript, videos, fonts, wasm, JSON, and other runtime assets.

## Required workflow

When a source snapshot is available, the AI must do the following before writing `note.html`:

1. Inspect `assets/source-snapshot/<source-id>/snapshot-manifest.json` when present.
2. Inspect `assets/source-snapshot/<source-id>/index.html` to identify original section structure, demo containers, controls, labels, canvas/SVG elements, and script/style dependencies.
3. Inspect relevant local CSS/JS resources under `_resources/`, especially source-specific scripts such as `lenses.js`, simulation code, shader code, data files, and media assets.
4. Extract the actual source variables, controls, update logic, and visual output behavior.
5. Build a knowledge-base-styled note that directly ports the important interactions into `note.html` using the source snapshot assets and behavior.

## Primary preservation strategy

Use this strategy for important interactive demos:

```yaml
preservation_strategy: source-snapshot-assets + source-ported-interaction
```

This means:

- the note uses local assets copied from the source snapshot where relevant,
- the note's controls and interaction behavior are ported from the original source behavior,
- the UI may be redesigned to fit the knowledge base style,
- the conceptual behavior must remain faithful to the original demonstration.

If a reconstruction is not based on specific snapshot-observed source behavior, it must be marked as supplementary rather than primary preservation.

## Forbidden final representation

Do not use this as the final representation:

```html
<iframe src="assets/source-snapshot/<source-id>/index.html"></iframe>
```

A whole-snapshot iframe may be useful while debugging, but it is not an acceptable final note section unless the user explicitly asks for a raw snapshot viewer. For normal AI import packages, the final note should directly implement the teaching content.

## Do not mention the snapshot in learner-facing prose

The learner-facing note must teach the concept directly. Do not write:

- `原 snapshot 中...`
- `原始 SNAPSHOT 参考视图`
- `根据 snapshot...`
- `source snapshot shows...`

Snapshot paths are implementation details. They may appear in `review/source-asset-manifest.md` and in HTML asset paths, but not as explanatory prose.

Source blocks must cite the original URL and original source location, not the snapshot file:

```html
<aside class="source-block">
  <strong>Source</strong>
  <a href="https://ciechanow.ski/cameras-and-lenses/" target="_blank" rel="noreferrer">Cameras and Lenses</a>
  <span>Location: Pinhole camera / hole diameter and sensor distance controls</span>
</aside>
```

## UI adaptation rule

The UI may be changed to match the knowledge base: dark panels, hard edges, concise control labels, source-linked captions, and app font-size variables.

The explanation must remain clear and direct. Preserve the original demo's key variables, cause-effect behavior, and observable results. Do not simplify the interaction so much that it becomes weaker than the source.

## Review files

For snapshot-backed packages, `review/source-asset-manifest.md` must include evidence of source-porting:

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

## Language and style

Use the target locale for explanations, section titles, captions, review questions, and answers. Keep precise English technical terms when useful, but explain them in the target locale. Use direct teaching voice.


# Source-first strict revisions

These rules override weaker or older guidance in this context export.

## Learner-facing voice

Never write the note as if it is commenting on a snapshot or the source document. Use direct teaching voice in the target locale. The source URL is cited for attribution, while the explanation should read like the knowledge base itself is teaching the concept.

## Snapshot-backed source preservation

If a package includes `assets/source-snapshot/`, that snapshot must be treated as the highest-priority source asset library.

Do not use a whole snapshot iframe as the primary note representation. The AI should use the snapshot's local assets and behavior to port the important demos directly inside `note.html` with knowledge-base-styled HTML/CSS/JS.

Allowed fallback: a whole-snapshot iframe may be included only as a secondary reference/debug view when the interaction cannot be isolated or faithfully ported. It must be clearly labeled as fallback and must not replace the teaching explanation.

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
2. Port source interactions directly in the note using knowledge-base-styled controls and snapshot-observed behavior.
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
  <!-- Directly ported controls/canvas/SVG using snapshot assets and observed behavior. -->
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
      - assets/source-snapshot/cameras-and-lenses/_resources/source-specific.js
    ported_original_controls:
      - hole diameter
      - sensor distance
    ported_original_behavior:
      - increasing hole diameter increases brightness and blur
    preservation_strategy: source-snapshot-assets + source-ported-interaction
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
