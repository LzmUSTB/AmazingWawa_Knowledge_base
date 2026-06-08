# Figma Design Brief

## Goal

Create a first-version desktop UI mockup for a local-first knowledge graph system.

The mockup should follow:

- `docs/ui-ux-plan.md`
- `docs/visual-style-guide.md`
- `docs/interaction-spec.md`
- `design/theme-tokens.json`

## Required Screens

Design these screens first:

1. Desktop Graph View
2. Desktop Note View
3. Desktop New Link Dialog
4. Mobile Note View
5. Mobile Local Graph View

## Desktop Graph View

Structure:

```txt
Top Menu
+ Left File Tree
+ Main Workspace
  + Breadcrumb
  + Graph Toolbar
  + Graph Canvas
```

No fixed right-side panel in the first version.

The graph should look like a black-and-white technical monitor UI with vivid accent colors.

## Desktop Note View

Structure:

```txt
Top Menu
+ Left File Tree
+ Main Workspace
  + Breadcrumb
  + Note Toolbar
  + Note Content
```

Note content must be highly readable.

## Visual Direction

Use:

- black background
- white thin line borders
- technical grid
- compact UI labels
- domain accent colors
- graph nodes with strong contrast
- line-based HUD panels

Avoid:

- bright full-color backgrounds
- glassmorphism-heavy panels
- decorative cyberpunk noise
- overly rounded SaaS UI

## Domain Colors

Use these as accent signals only:

```txt
graphics: #00B7FF
machine-learning: #C8FF00
web-dev: #FF2BD6
game-dev: #FF3B30
career: #FFD500
simulation: #7C5CFF
language: #00E5A8
dcc-tools: #FF8A00
```

## Interaction Assumptions

- single-click node selects it
- double-click node opens note
- right-click node opens context menu
- breadcrumb moves between graph levels
- note has Read and Edit modes
- editing is desktop-only in first version
