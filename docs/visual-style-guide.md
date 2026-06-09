# Visual Style Guide

## 1. Visual Direction

The visual style is a black-and-white technical monitor UI with solid accent colors.

The graph should feel like a hard-edged PCB-style system map:

- black background
- pure solid accent colors
- thin white borders
- sharp rectangular panels
- rectangular system modules
- grid-aligned functional graphics
- PCB-style traces
- terminal-like labels and metadata

The UI must avoid glow, bloom, soft neon gradients, and blurred colored shadows.

Accent colors are solid signal colors only.

The system should look like a hard-edged technical diagram, not a glowing cyberpunk interface.

## 2. Core Color Policy

The base UI should be mostly black, white, and grayscale.

| Token | Color | Usage |
|---|---|---|
| background-main | #090909 | Main app background |
| background-panel | #111111 | Panels and tool areas |
| background-elevated | #181818 | Floating UI and dialogs |
| border-primary | #EDEDED | High-emphasis white lines |
| border-muted | #555555 | Low-emphasis grid and dividers |
| text-primary | #F5F5F5 | Main text |
| text-secondary | #B8B8B8 | Secondary text |
| text-muted | #777777 | Metadata and disabled text |

Do not use:

- box-shadow glow
- text-shadow glow
- blurred colored shadows
- radial-gradient glow
- soft neon gradients
- bloom-like highlights

Use these instead:

- thicker border
- double border
- inverse color
- solid accent side bar
- corner marker
- port marker
- dashed line
- arrowhead
- high-contrast outline

## 3. Domain Accent Colors

Domain colors are accents only.

They may appear in:

- node border
- node side bar
- corner marker
- port marker
- breadcrumb indicator
- active file-tree marker
- small labels or badges

They should not fill large UI areas.

| Domain | Accent Color |
|---|---|
| graphics | #00B7FF |
| linear-algebra | #EDEDED |
| machine-learning | #C8FF00 |
| web-dev | #FF2BD6 |
| game-dev | #FF3B30 |
| career | #FFD500 |
| language | #00E5A8 |
| simulation | #7C5CFF |
| dcc-tools | #FF8A00 |

## 4. Graph Scope Visual Policy

The graph must show only the current scope level.

Root scope shows only top-level domain modules.

Domain scope shows one center domain module and its direct child modules.

Focus scope shows one current node with its parent and direct related nodes.

Do not show every level at once.

Do not show concept grandchildren in domain scope.

## 5. Node Visual Rules

Do not use circular graph nodes.

Use square or rectangular technical modules.

Node types:

| Type | Visual Treatment |
|---|---|
| root/domain | large square or wide rectangular module |
| topic | medium rectangular module |
| concept | compact rectangular module |
| project/tool/paper later | rectangular module with type-specific marker |

Node fill should stay black or very dark.

Node labels must be inside nodes. Do not place labels outside nodes as floating text.

Each node should show:

- title
- small type/domain metadata
- solid accent marker
- explicit connection ports

Long labels should wrap to one or two lines or truncate cleanly.

## 6. Ports And Trace Connections

Each node should expose ports:

- left
- right
- top
- bottom

Edges should start from the source node port and end at the target node port.

The trace endpoint must touch the node border or a visible port marker.

Do not draw decorative traces floating behind nodes.

## 7. PCB Trace Lines

Graph edges should look like PCB routes.

Use:

- 90-degree turns
- horizontal and vertical segments
- grid-aligned paths
- hard square line caps
- exact route points
- relation-specific line styles

Avoid:

- random diagonal edges
- free-form network curves
- force-directed spaghetti layout
- glow
- gradients

Relation visual rules:

| Relation | Line Style | Color Logic |
|---|---|---|
| contains | solid thin line | white or muted gray |
| depends-on | solid line with arrow | yellow |
| used-in | dashed line | purple or blue |
| compares-with | paired or double line | orange |

The relation type must remain understandable in grayscale through line style, dash pattern, arrow shape, and thickness.

## 8. Background And Grid

The graph canvas should use a subtle technical grid.

The grid supports spatial memory and PCB-style alignment.

It must not overpower nodes, traces, or note content.

## 9. Typography

Typography should be technical but readable.

| Area | Font Direction |
|---|---|
| UI label | compact system sans-serif |
| metadata | monospace |
| graph label | compact uppercase sans-serif or monospace |
| note body | readable sans-serif |

Letter spacing should remain 0.

Avoid decorative cyberpunk fonts for long text.

## 10. Note Page Style

The note page must be more readable than the graph UI.

Use:

- dark background
- readable line height
- high-contrast headings
- code blocks with clear borders
- technical panel blocks
- current domain accent as a small marker only

## 11. File Tree Style

The file tree should feel like a technical file navigator.

Use:

- black panel
- thin separators
- active domain accent line
- hover gray background
- selected white outline or accent bar

Do not overuse color.

## 12. Breadcrumb Style

Breadcrumb represents conceptual scope, not only file path.

Examples:

```txt
Global Graph
Global Graph / Graphics
Global Graph / Graphics / Rendering Pipeline
```

Use:

- uppercase compact labels
- thin dividers
- small domain accent dot
- current scope highlighted in white

## 13. Animation Policy

Animations should be subtle and functional.

Allowed:

- graph focus transition
- node selection transition
- panel open/close
- breadcrumb transition

Avoid:

- constant motion
- glitch effects
- glow pulse
- animated backgrounds

## 14. Implementation Notes

Graph visual design should be separated into:

```txt
src/graph/
├─ graph-theme.js
├─ graph-layout.js
├─ graph-interactions.js
└─ graph-scope.js
```

Semantic relations belong in `vault/graph.yaml`.

Visual positions and trace routes should later live in `vault/graph-layout.yaml`.

Do not mix graph index semantics and visual layout persistence.
