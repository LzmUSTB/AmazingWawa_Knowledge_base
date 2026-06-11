# HTML Rich Note Guide

## Purpose

HTML Rich Notes are for high-quality tutorial-style or figure-heavy notes. They should feel like polished knowledge pages inside the app, not standalone web pages.

Use HTML when Markdown + content blocks would flatten the explanation, especially for:

- article-like tutorials,
- figure-heavy VFX/graphics notes,
- paper explanations with diagrams,
- step-by-step visual workflows,
- source-asset-heavy notes,
- material where the original teaching rhythm matters.

## Required package structure

For an HTML note, `meta.yaml` must include:

```yaml
contentFormat: html
```

The node directory must include:

```text
generated/content/<domain>/<node-id>/meta.yaml
generated/content/<domain>/<node-id>/note.html
```

For an empty graph-only placeholder node, use:

```yaml
contentFormat: none
```

and omit both `note.md` and `note.html`.

## Fragment only

Generate an HTML fragment, not a full HTML document.

Allowed root pattern:

```html
<article class="rich-note-article">
  ...
</article>
```

Do not include:

```text
<!doctype>
<html>
<head>
<body>
<style>
<script>
iframe
inline event handlers such as onclick
javascript: URLs
data: URLs
```

## App style and font scale

HTML Rich Notes are rendered inside the knowledge base app. They must fit the app visual language:

- dark background,
- hard rectangular panels,
- thin borders,
- small accent bars,
- high contrast,
- technical/HUD-like structure,
- no soft consumer-card style,
- no excessive glow,
- no rounded decorative components.

Do not write custom inline styles. Use approved classes.

The renderer supplies CSS driven by app variables such as:

```text
--font-size-ui
--font-size-title
--font-size-note-title
--font-size-small
--font-size-mono
--ui-font-scale
```

Therefore the HTML note will respond to the app font-size scale automatically.

## Approved classes

Use these classes:

```text
rich-note-article
rich-hero
rich-kicker
rich-lead
rich-grid
rich-two-col
rich-three-col
rich-section
rich-section-head
rich-section-num
rich-card
rich-callout
rich-callout accent
rich-callout warn
rich-callout green
rich-figure-grid
rich-flow
rich-step
rich-compare
rich-badge-row
rich-badge
rich-asset-link
rich-prose
rich-equation
```

Do not invent arbitrary class names unless the current context explicitly documents them.

## Allowed tags

Use semantic HTML:

```text
article, section, header, nav, div, aside, figure, figcaption,
h1, h2, h3, h4, p, strong, em, code, pre,
ul, ol, li, table, thead, tbody, tr, th, td,
a, img, video, audio, source, details, summary
```

## Assets

For durable packages, prefer packaged local assets:

```html
<img src="assets/fig-01-divergence-curl.png" alt="Divergence and curl visualization">
```

If original source assets are public and stable, HTML notes may use HTTPS URLs directly:

```html
<img src="https://example.com/source-image.png" alt="...">
<video controls src="https://example.com/source-video.mp4"></video>
```

Every image/video must have surrounding explanatory text and a caption. Do not add decorative assets.

## Content requirements

For tutorial-style sources, the HTML note must preserve and improve the source's teaching sequence. Do not shrink the source.

The HTML note should:

1. explain the concept directly in the AI's own teaching voice,
2. keep all important insights from the source,
3. expand mechanisms and variables,
4. include original assets when useful,
5. add transitions between sections,
6. turn observations into reusable rules,
7. end with review questions or takeaways.

Avoid phrases such as:

```text
原文中说...
这篇文章提到...
作者在这里表示...
```

Use direct explanation instead:

```text
Curl Noise 的关键是...
当 rotation 偏离 90° 时...
这个现象说明...
```
