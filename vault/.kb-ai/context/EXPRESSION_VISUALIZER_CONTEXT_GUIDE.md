# Expression Visualizer Context Guide

`expression-visualizer` is an educational block for visualizing a safe, explicit mathematical render specification.

It must not be used as a generic formula display block. If the package only needs to show a formula, use normal Markdown text, a concept-card, or an HTML Rich Note formula callout.

## Required model

Separate human-readable formula text from machine-rendered expression:

- `formula_display`: shown to the user only.
- `render`: the safe render specification actually used for drawing.
- `parameters`: explicit slider definitions.

Supported render modes:

- `curve2d` with `render.y`
- `surface3d` with `render.z`

Do not use expression-visualizer for vector fields, symbolic derivatives, or unsupported formulas such as `F(x,y) = (∂N/∂y, -∂N/∂x)`.
