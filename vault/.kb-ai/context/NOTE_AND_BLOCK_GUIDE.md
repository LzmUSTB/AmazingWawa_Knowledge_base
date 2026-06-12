# Note and Block Guide

This guide merges note composition, HTML rich notes, content block usage, block registry guidance, declarative visuals, and expression visualizer rules.

## Note purpose

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
- embedded or ported demos,
- AI-authored supplemental JS interactions,
- comparison tables,
- review questions.

Not allowed:

- reducing an interactive article to a few paragraphs,
- replacing source visuals with AI-generated images,
- omitting important demos,
- flattening multiple source demonstrations into one generic diagram,
- losing the source's explanatory sequence.

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
12. review questions with answers.

## HTML rich note selection rule

Do not use `contentFormat: html` for a plain static concept note unless HTML materially improves the explanation.

Prefer:

- `markdown` for compact static concept notes;
- `none` for placeholder graph nodes;
- `html` for source-rich tutorials, interactive demonstrations, source media, substantial SVG/canvas diagrams, or complex tutorial layouts.

The validator keeps a warning for HTML notes with no visible interactive element. This warning is intentional. Do not remove it by adding meaningless decorative scripts or canvases; either make the interaction educational or use Markdown instead.

## HTML rich notes

Use HTML rich notes when the source material is visual, interactive, tutorial-like, or when Markdown/content blocks would reduce clarity.

For rich tutorial notes, use:

```yaml
contentFormat: html
```

The generated file must be:

```text
generated/content/<domain>/<node-id>/note.html
```

The AI may freely design HTML structure, explanatory flow, interactive sections, diagrams, tables, callouts, comparison panels, timelines, and simulations, as long as the result remains clear, readable, source-grounded, and consistent with the knowledge base style.

JavaScript is allowed when it improves understanding:

- interactive sliders,
- canvas demonstrations,
- SVG manipulation,
- WebGL or Canvas educational demos,
- parameterized optical/geometric simulations,
- collapsible explanations,
- synchronized figure/caption interactions,
- interactive comparison panels.

JavaScript must serve explanation. Do not add decorative effects.

## Application style compatibility

HTML notes must visually match the knowledge base program.

Use app CSS variables where possible:

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

Prefer hard-edged, high-contrast technical layouts, square corners, clear lines, strong hierarchy, and restrained accent color.

## Source block structure

When the note explains a claim, figure, demo, formula, interaction, or implementation detail that actually comes from a source or another network resource, add a nearby source block:

```html
<aside class="source-block">
  <strong>Source</strong>
  <a href="https://example.com/article" target="_blank" rel="noreferrer">Original article</a>
  <span>Location: section title / figure number / demo name / nearby heading</span>
</aside>
```

Do not put all source attributions only at the end when source material is actually used. Do not add source blocks for purely original explanation.

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

## Native blocks

Use native blocks for compact Markdown notes:

- `concept-card`
- `process-flow`
- `compare-table`
- `code-explain`
- `quiz`
- `expression-visualizer`

Teaching goals:

| Teaching goal | Preferred representation |
|---|---|
| Define a concept | concept-card |
| Show a process | process-flow |
| Compare alternatives | compare-table |
| Explain code | code-explain |
| Test recall | quiz |
| Show safe scalar formula behavior | expression-visualizer |
| Preserve source-rich tutorial | HTML Rich Note |

Do not use blocks as decoration.

## HTML over excessive blocks

For full tutorial/article presentation, source assets, or interactivity, use `contentFormat: html` instead of stacking many unrelated native blocks.

For maximum creative freedom or JavaScript interaction, use `note.html` rather than custom block types.

## Custom declarative blocks

Custom block-types live in `block-types/*.yaml` and must use:

```yaml
kind: declarative-visual
renderer:
  engine: visual-grammar
```

Use declarative visual blocks when the note needs labeled nodes, explicit arrows, staged diagrams, formula callouts, simple geometry, or repeated visual elements based on block data.

Supported layout types:

- split-panel
- stack
- grid

Supported panel types:

- svg-scene
- inspector

Supported element types:

- node
- edge
- arrow
- label
- text
- badge
- formula-callout
- rect
- line
- circle

Coordinates use normalized 2D values in [0, 1].

Do not use declarative visual blocks to replace original source figures. Use original source asset URLs, local source assets, or HTML source-ported interactions when original visuals exist.

## Expression visualizer

`expression-visualizer` is for visualizing a safe, explicit mathematical render specification.

It must not be used as a generic formula display block.

Supported render modes:

- `curve2d` with `render.y`
- `surface3d` with `render.z`

Do not use expression-visualizer for vector fields, symbolic derivatives, or unsupported formulas. Use HTML notes with source assets or JS/SVG/Canvas demos instead.
