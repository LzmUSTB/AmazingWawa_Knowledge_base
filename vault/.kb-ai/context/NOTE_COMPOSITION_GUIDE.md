# Note Composition Guide

A note should teach one reusable knowledge object clearly enough that the user can review and apply it later.

Do not produce a loose article summary. Do not merely translate the source.

## No shrinkage rule

If the source is already a clear tutorial or interactive article, the generated note must not be less detailed, less visual, or less interactive than the source.

Allowed:

- clearer sectioning,
- expanded explanation,
- more explicit mechanisms,
- more examples,
- source-linked figures,
- embedded demos,
- AI-authored supplemental JS interactions,
- comparison tables,
- review questions.

Not allowed:

- reducing an interactive article to a few paragraphs,
- replacing source visuals with AI-generated images,
- omitting important demos,
- flattening multiple source demonstrations into one generic diagram,
- losing the source's explanatory sequence.

## Direct teaching voice

Do not write as a reviewer of the source. Write as the teacher.

Avoid:

```text
原文中说...
这篇文章提到...
作者在这里表示...
```

Use:

```text
小孔相机的核心是...
当 aperture 变大时...
这个交互演示说明...
```

## Node granularity

Each note should correspond to one reusable knowledge object.

Good node objects:

- concept,
- mechanism,
- skill,
- question,
- comparison,
- procedure,
- rich tutorial overview.

Bad node objects:

- one node per minor paragraph,
- vague titles,
- source-specific title with no reusable meaning,
- heavily compressed article summary.

## Required note structure

A high-quality note should include most of:

1. precise definition,
2. problem solved,
3. core intuition,
4. mechanism and cause-effect,
5. formal/technical detail,
6. concrete examples,
7. parameters or variables,
8. source images/videos/demos,
9. common mistakes,
10. relation to other nodes,
11. source blocks near source-grounded explanations,
12. review questions.

## Markdown and block syntax

Use Markdown and native content blocks for compact notes.

Use `contentFormat: html` when the source is visual, interactive, or tutorial-like.

Do not force rich source material into many small blocks if an HTML note would be clearer.


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
