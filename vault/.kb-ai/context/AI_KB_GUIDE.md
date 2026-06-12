# Wawa Knowledge Base AI Guide

## Final output

Final user-facing output must be a single `.wawapkg` file.

A `.wawapkg` is a ZIP-compatible archive. The archive root must contain:

```text
mimetype
manifest.yaml
sources.yaml
patch.yaml
generated/
block-types/
review/
```

The `mimetype` file must contain exactly:

```text
application/x-wawa-kb-ai-import-package
```

## Primary goal

Create knowledge pages that are at least as clear as the source material and preferably clearer.

Do not compress a high-quality tutorial, visual explanation, or interactive article into a short summary. The package should preserve the source's strongest teaching devices, including images, videos, animations, interactive demos, layout rhythm, and figure-caption explanations.

The AI may reorganize, expand, annotate, add explanations, add interactions, and improve the teaching sequence. The AI must not make the result weaker or shorter in substance than the original source.

## Required planning

Before writing package files, create a plan and include it in `review/import-plan.md`:

1. source scope,
2. source teaching structure,
3. source asset and interactive demo inventory,
4. knowledge extraction,
5. candidate nodes and rejected nodes,
6. relation plan,
7. note format decision: `markdown`, `html`, or `none`,
8. asset preservation plan,
9. quality self-check.

## Content format decision

Use `contentFormat: markdown` and `note.md` for compact structured notes.

Use `contentFormat: html` and `note.html` for tutorial/article pages, figure-heavy notes, source-asset-heavy notes, and any source whose clarity depends on visual flow or interactive demonstrations.

Use `contentFormat: none` for empty placeholder nodes that should appear in the graph but intentionally have no note yet.

## Source-first asset policy

Original source assets are mandatory when they are central to the source's explanation.

The AI must not generate raster images. Do not create AI-generated PNG/JPEG/WebP diagrams, decorative backgrounds, fake screenshots, or replacement figures.

Use original source URLs directly when possible. For private/non-public use, stable original URLs are acceptable:

```html
<img src="https://original-source/path/figure.png" alt="...">
<video controls src="https://original-source/path/demo.mp4"></video>
```

If an original asset cannot be directly embedded, use a source demo card or source link close to the relevant explanation. Do not silently omit it.

## Interactive source rule

If the source contains interactive demonstrations, the note must represent every important demo. Representation can be:

1. iframe embed of the original demo/page,
2. original video/gif/canvas asset URL,
3. direct source demo link with location label,
4. AI-authored JS/SVG/Canvas supplemental interaction that explains the same mechanism.

Omitting important interactive demos is a quality failure.

## JavaScript in HTML notes

JavaScript is allowed inside `note.html` when it improves understanding. Use it for educational interactivity: sliders, canvas demos, SVG manipulation, parameterized simulations, synchronized captions, and comparison panels.

JavaScript must serve explanation. Avoid decorative effects.

## Source block requirement

Every claim, figure, demo, formula, close paraphrase, or source-grounded explanation should include a nearby short source block:

```html
<aside class="source-block">
  <strong>Source</strong>
  <a href="https://example.com/article" target="_blank" rel="noreferrer">Original article</a>
  <span>Location: section title / figure number / demo name</span>
</aside>
```

Do not put all source references only at the end.

## Output language

Write explanatory note content in Chinese by default. Keep standard technical terms in English when they are more precise.

Use direct teaching voice. Do not write `原文中说`, `这篇文章提到`, or `作者表示` in note body. Explain the concept directly.

## Domain rules

If `DOMAIN_INDEX.yaml` is empty, start with `add_domain`. If no suitable existing domain fits, create a small, stable, broad domain. Do not create excessive narrow domains.

## Canonical operation shapes

Use the canonical flat add_edge shape to avoid ambiguous package parsing:

```yaml
- type: add_edge
  from: source-node-id
  to: target-node-id
  relation: depends-on
  reason: why this relationship is useful
```

Nested `edge:` objects are forbidden. Generated packages must use the flat form above because the application parser and validator expect top-level `from`, `to`, and `relation` fields.


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
