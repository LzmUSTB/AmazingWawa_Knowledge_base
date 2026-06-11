# Block Creation Policy

Prefer existing native blocks for compact Markdown notes.

Use HTML Rich Notes when the whole note needs article-like layout, source assets, interactive demos, or visual reading flow.

## JavaScript policy

JavaScript is allowed in HTML notes when it improves understanding.

JavaScript is not for decorative effects. Use it for educational interaction: sliders, canvas, SVG manipulation, WebGL/Canvas demos, parameterized models, synchronized captions, and interactive comparisons.

## Image policy

Do not generate images. Use original source assets or URLs.

## Native blocks

Use native blocks for simple structured explanations:

| Teaching goal | Preferred representation |
|---|---|
| Define a concept | concept-card |
| Show a process | process-flow |
| Compare alternatives | compare-table |
| Explain code | code-explain |
| Test recall | quiz |
| Show safe scalar formula behavior | expression-visualizer |
| Preserve source-rich tutorial | HTML Rich Note |

## Custom declarative blocks

Custom block-types remain declarative visual YAML unless the app explicitly supports executable custom blocks. For maximum freedom, put interactive logic inside `note.html` instead of `block-types/*.yaml`.
