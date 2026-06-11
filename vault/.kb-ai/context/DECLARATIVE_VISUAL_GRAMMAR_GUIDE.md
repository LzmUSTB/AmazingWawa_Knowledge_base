# Declarative Visual Grammar Guide

Custom block-types live in `block-types/*.yaml` and must use:

```yaml
kind: declarative-visual
renderer:
  engine: visual-grammar
```

Use declarative visual blocks when the note needs labeled nodes, explicit arrows, staged diagrams, formula callouts, simple geometry, or repeated visual elements based on block data.

## Supported layout types

- split-panel
- stack
- grid

## Supported panel types

- svg-scene
- inspector

## Supported element types

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

Do not include script, eval, iframe, HTML, CSS, JS, Vue, remote URLs, arbitrary event handlers, inline SVG, or executable code.
