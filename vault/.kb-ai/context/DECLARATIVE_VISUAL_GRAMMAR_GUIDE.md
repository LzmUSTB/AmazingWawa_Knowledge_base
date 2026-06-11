# Declarative Visual Grammar Guide

Custom block-types live in `block-types/*.yaml` and must use:

```yaml
kind: declarative-visual
renderer:
  engine: visual-grammar
```

Use declarative visual blocks when the note needs a structured technical visual: labeled nodes, explicit arrows, staged diagrams, formula callouts, simple geometry, or repeated visual elements based on block data.

## Supported layout types

- `split-panel`: SVG scene plus inspector
- `stack`: scene only / vertical stack
- `grid`: responsive grid panels

## Supported panel types

- `svg-scene`
- `inspector`

## Supported element types

- `node`: selectable labeled rectangle, best for concepts/states/steps
- `edge`: connector between nodes
- `arrow`: directed connector between nodes or coordinates
- `label`: text label
- `text`: text label alias
- `badge`: boxed label
- `formula-callout`: boxed formula or symbolic note
- `rect`: primitive rectangle
- `line`: primitive line
- `circle`: primitive circle

Coordinates use normalized 2D values: `x`, `y`, `x1`, `y1`, `x2`, `y2`, `width`, `height`, and `radius` are in [0, 1].

## Data binding

Elements may bind to note block data with `$.` paths.

```yaml
elements:
  - type: node
    each: $.items
    template:
      id: $.id
      label: $.label
      x: $.x
      y: $.y
```

## Example block-type

```yaml
type: vector-field-intuition
title: Vector Field Intuition
kind: declarative-visual
renderer:
  engine: visual-grammar
  layout:
    type: split-panel
    left:
      type: svg-scene
      scene: main
    right:
      type: inspector
visualGrammar:
  scenes:
    main:
      coordinateSystem: normalized-2d
      elements:
        - type: rect
          id: background-panel
          x: 0.08
          y: 0.12
          width: 0.84
          height: 0.72
        - type: node
          id: scalar-field
          label: Scalar Field
          x: 0.24
          y: 0.38
        - type: node
          id: gradient
          label: Gradient
          x: 0.5
          y: 0.38
        - type: node
          id: curl-like-field
          label: Curl-like Field
          x: 0.76
          y: 0.38
        - type: arrow
          from: scalar-field
          to: gradient
        - type: arrow
          from: gradient
          to: curl-like-field
        - type: formula-callout
          id: formula
          text: F(x,y) = (dN/dy, -dN/dx)
          x: 0.5
          y: 0.72
interactions:
  - select
```

Do not include script, eval, iframe, HTML, CSS, JS, Vue, remote URLs, arbitrary event handlers, inline SVG, or executable code.
