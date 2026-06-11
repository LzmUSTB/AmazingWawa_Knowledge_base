# HTML Rich Note Guide

## Purpose

Use HTML rich notes when the source material is visual, interactive, tutorial-like, or when Markdown/content blocks would reduce clarity.

The goal is not to summarize the source. The goal is to create a knowledge page that is at least as clear as the original source and preferably clearer.

For high-quality visual or interactive sources, preserve the original teaching power. Do not compress an interactive tutorial into a few static concept cards.

## Content format

For rich tutorial notes, use:

```yaml
contentFormat: html
```

The generated file must be:

```text
generated/content/<domain>/<node-id>/note.html
```

## Creative freedom

The AI may freely design the HTML structure, explanatory flow, interactive sections, diagrams, tables, callouts, comparison panels, timelines, and simulations, as long as the result remains clear, readable, and consistent with the knowledge base application style.

The AI may use JavaScript inside HTML notes when JavaScript improves understanding.

Allowed JavaScript uses:

- interactive sliders,
- canvas demonstrations,
- SVG manipulation,
- WebGL or Canvas-based educational demos,
- parameterized optical/geometric simulations,
- collapsible explanations,
- synchronized figure/caption interactions,
- interactive comparison panels,
- procedural educational visualization.

JavaScript must serve explanation. Do not add decorative effects that do not improve comprehension.

## Application style compatibility

HTML notes must visually match the knowledge base program.

Use the app style system rather than arbitrary isolated styling.

Preferred CSS variables:

```css
var(--color-bg)
var(--color-panel)
var(--color-panel-soft)
var(--color-text)
var(--color-text-muted)
var(--color-border)
var(--color-accent)
var(--font-size-xs)
var(--font-size-sm)
var(--font-size-md)
var(--font-size-lg)
var(--font-size-xl)
var(--font-size-2xl)
var(--font-size-3xl)
var(--ui-font-scale)
```

Text must respond to the knowledge base font-size scale. Prefer app font-size variables over fixed pixel sizes.

Use hard-edged, high-contrast, technical layouts consistent with the knowledge base style. Prefer square corners, clear lines, strong hierarchy, and restrained accent color.

## No AI-generated images

The AI must not generate raster images to replace source material.

Forbidden:

- AI-generated PNG/JPEG/WebP diagrams,
- AI-generated illustration images,
- AI-generated screenshots,
- AI-generated fake source figures,
- AI-generated decorative backgrounds,
- data URL images,
- fabricated figure assets.

If a source already contains clear images, videos, animations, or interactive demonstrations, those original assets must be used or referenced.

Generated images are not allowed as fallback.

If an original asset cannot be directly embedded, use one of these instead:

1. original asset URL,
2. original page URL with figure/demo locator,
3. trusted iframe embed of the original source page or demo,
4. AI-authored procedural interactive demo using JS/SVG/Canvas, clearly marked as a supplementary explanation and accompanied by a source block.

## Original asset priority

When the source contains images, videos, animations, or interactive demos, the note must preserve them as primary teaching material.

Priority order:

1. Use the original image/video/demo URL directly.
2. Use a local cached copy of the original asset if the package includes it.
3. Embed the original interactive source page or demo with iframe if stable and useful.
4. Link to the exact source section if direct embedding is not possible.
5. Create a JS/SVG/Canvas explanatory reproduction only as a supplement, not a replacement.

Do not silently omit important original visuals.

## Interactive demo preservation

If the source contains interactive demonstrations, the note must include a section for each important demo.

Represent each important demo by one or more of:

```html
<iframe class="rich-source-frame" src="..."></iframe>
```

```html
<a class="rich-source-demo-link" href="..." target="_blank">Open original interactive demo</a>
```

```html
<section class="rich-js-demo" data-source-block="...">
  <!-- AI-authored supplementary JS demo -->
</section>
```

For interactive sources such as optics, physics, graphics, simulation, math, or shader tutorials, omitting the demonstrations is a quality failure.

## Source block requirement

When the note explains a claim, figure, demo, formula, interaction, or implementation detail that comes from the source or is grounded in the source, add a short source block near that section.

Use this structure:

```html
<aside class="source-block">
  <strong>Source</strong>
  <a href="https://example.com/article" target="_blank" rel="noreferrer">Original article</a>
  <span>Location: section title / figure number / demo name / nearby heading</span>
</aside>
```

For a figure:

```html
<aside class="source-block">
  <strong>Source</strong>
  <a href="https://ciechanow.ski/cameras-and-lenses/" target="_blank" rel="noreferrer">Cameras and Lenses</a>
  <span>Location: Pinhole camera section, aperture slider demonstration</span>
</aside>
```

For a quote or close paraphrase, keep the quoted text short and attribute it.

Do not put all sources only at the end. Source blocks should appear close to the relevant explanation.

## Coverage requirement

A rich note must not be more superficial than the original source.

Before writing `note.html`, identify the original source's important teaching units:

```yaml
source_coverage_plan:
  - id: photon-collection-demo
    type: interactive-demo
    location: sensor / exposure section
    required: true
  - id: pinhole-diameter-slider
    type: interactive-demo
    location: pinhole camera section
    required: true
  - id: refraction-demo
    type: interactive-demo
    location: refraction section
    required: true
```

Every required item must appear in the note as:

- embedded source URL,
- direct source link,
- original image/video reference,
- iframe,
- or supplementary JS demo plus source block.

If a required source asset cannot be embedded, explicitly say so in the note and provide a link to the original section.

## Recommended HTML structure

```html
<article class="rich-note-article">
  <header class="rich-hero">
    <p class="rich-kicker">Domain / Topic</p>
    <h1>Title</h1>
    <p class="rich-lead">High-level explanation.</p>
  </header>

  <section class="rich-section" data-source-unit="...">
    <div class="rich-section-head">
      <span class="rich-section-num">01</span>
      <h2>Section title</h2>
    </div>

    <div class="rich-prose">...</div>

    <figure class="rich-figure">
      <img src="https://original-source/asset.png" alt="...">
      <figcaption>...</figcaption>
    </figure>

    <aside class="source-block">
      <strong>Source</strong>
      <a href="https://original-source/article" target="_blank" rel="noreferrer">Original article</a>
      <span>Location: figure/demo/section</span>
    </aside>
  </section>
</article>
```

## Review files

Every rich HTML package must include:

```text
review/source-coverage-plan.md
review/source-asset-manifest.md
review/interactive-demo-coverage.md
```

The review must explicitly list:

- original images used,
- original videos used,
- original interactive demos embedded or linked,
- required demos not embedded and why,
- any AI-authored JS demos and what source unit they explain.


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
