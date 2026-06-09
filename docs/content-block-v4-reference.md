# Content Block Preview v4 Implementation Reference

This file summarizes the concrete behaviors and visual details from `content_block_preview_v4.html` so Codex can reproduce the agreed version inside the Vue/Tauri app.

## Global visual style

- Dark technical HUD style.
- Hard edges only: no border radius, no blur, no glow, no glassmorphism, no gradients.
- Base colors:
  - background `#090909`
  - panel `#111111`
  - elevated panel `#181818`
  - primary border `#ededed`
  - muted border `#555555`
  - primary text `#f5f5f5`
  - secondary text `#b8b8b8`
  - muted text `#777777`
- Block cards use a thin border plus a 4px left/top accent bar.
- Use uppercase small mono labels for technical metadata.
- Main document text should be readable and not forced into `<pre>` blocks.

## concept-card

Visual target:
- A bordered technical card with an accent strip.
- Header label: `concept-card`.
- Large title.
- Optional chips such as domain/tag/type.
- Two-column field area where possible.
- Field cards for summary / why it matters / key intuition.

Behavior:
- Static read-only block.
- No editing interaction in read mode.

## process-flow

Visual target:
- Flowchart, not a vertical bullet list.
- Rectangular nodes on a canvas-like area.
- Orthogonal/SVG arrows between nodes.
- Supports parallel lanes/branches.
- SSFR reference layout:
  - Application / particles source flows into two parallel branches:
    - Depth Pass
    - Thickness Pass
  - Depth Pass -> Depth Smoothing -> Normal Reconstruction -> Shading / Composition
  - Thickness Pass -> Shading / Composition
- Depth Pass and Thickness Pass must be visibly parallel, because their order can be swapped.
- Use clear arrow direction to represent data dependency / execution dependency.

Behavior:
- Clicking a flow node highlights it.
- Detail panel shows the selected node label and description.
- Non-selected nodes and lines may be muted, but still visible.

Implementation hint:
- SVG overlay for arrows is acceptable.
- Nodes can be absolutely positioned in the flow canvas for first version.
- Use structured block syntax with `nodes`, `edges`, and `parallel`; fallback `steps` syntax may render as linear flow.

## compare-table

Visual target:
- Hard-edged comparison table.
- Header row with compared concepts.
- Muted grid lines.
- Optional highlighted rows when values differ.

Behavior:
- A small toggle may enable/disable row difference highlight.
- Static table is acceptable if time is limited.

## code-explain

Visual target:
- Two-column layout:
  - left: code block with line numbers
  - right: explanation panel
- Mono font for code.
- Selected line highlighted with accent border/background.

Behavior:
- Clicking a code line updates the explanation panel.
- If structured per-line explanations are not available, show the general explanation.

## quiz

Visual target:
- Question card with `Q` marker.
- Answer card with `A` marker.
- Answer hidden by default.

Behavior:
- Button toggles `Show Answer` / `Hide Answer`.
- No scoring or spaced repetition in first version.

## expression-visualizer

Visual target:
- Header label: `expression-visualizer`.
- Formula shown before controls.
- Two tabs/buttons: `2D Curve` and `3D Surface`.
- Parameter sliders below formula.
- Canvas visualization area with a grid/HUD label.
- Reset parameters button.

Supported formulas only. Do not eval arbitrary JavaScript.

2D supported formula:

```txt
y = a · sin(bx + c) + d
```

3D supported formula:

```txt
z = a · sin(bx + c) · cos(e y) + d
```

2D requirements:
- Draw x-axis and y-axis clearly.
- Label axes as `x axis` and `y axis`.
- Draw curve as a crisp technical line.
- Sliders update the curve immediately.

3D requirements:
- Draw surface as a wireframe or mesh-like surface.
- Label axes as `x axis`, `y axis`, and `z axis`.
- z axis must point upward on screen.
- Dragging canvas rotates the 3D view.
- Draw axes after surface so they appear above the mesh.
- Canvas coordinate system must invert screen y for mathematical upward direction:

```js
screenY = h / 2 - y2 * scale;
```

Do not use:
- arbitrary expression eval
- external WebGL dependency
- gradient/glow effects

## Parser / integration notes

Read mode:
- Parse `:::block-name ... :::` custom blocks.
- Render known blocks with Vue components.
- Unknown/invalid block should fall back to plain markdown rendering.

Edit mode:
- Keep raw Markdown textarea.
- Do not implement rich text editing.
- Do not save a block AST.

