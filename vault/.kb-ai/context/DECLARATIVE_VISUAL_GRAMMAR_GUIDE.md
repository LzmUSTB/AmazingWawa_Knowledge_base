# Declarative Visual Grammar Guide

Custom block-types live in `block-types/*.yaml` and must use:

```yaml
kind: declarative-visual
renderer:
  engine: visual-grammar
```

Use declarative visual blocks when the note needs labeled nodes, explicit arrows, staged diagrams, formula callouts, simple geometry, or repeated visual elements based on block data.

For maximum creative freedom or JavaScript interaction, use `contentFormat: html` and implement the interaction inside `note.html` instead of a declarative block type.

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

Do not use declarative visual blocks to replace original source figures. Use original source asset URLs or HTML source frames when original visuals exist.
