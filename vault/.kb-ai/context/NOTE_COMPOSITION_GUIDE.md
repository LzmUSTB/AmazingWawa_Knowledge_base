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
