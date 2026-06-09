# Graph View Design

## Purpose

Graph View is the conceptual index for the knowledge base.

It should behave like a hierarchical PCB-style knowledge map, not a free-form network graph.

The graph must show only the current scope level.

## Graph Scopes

### Root Scope

Root scope shows only top-level domains.

Example nodes:

- Graphics
- Linear Algebra
- Machine Learning
- Web Dev
- Game Dev
- Career
- Language
- Simulation

Root scope must not show child concepts such as Shader, PBR, Rendering Pipeline, Gradient Descent, or SAC.

Breadcrumb:

```txt
Global Graph
```

Clicking or double-clicking a domain node enters that domain scope.

### Domain Scope

Domain scope shows one selected domain as the center module and only its direct child nodes around it.

Example for Graphics:

- center: Graphics
- children: Rendering Pipeline, Shader, PBR, Rasterization, Post Process, Material System

Domain scope must not show grandchildren. Grandchildren appear only after entering focus scope.

Breadcrumb:

```txt
Global Graph / Graphics
```

### Focus Scope

Focus scope is a compact local graph for one concept.

It may show:

- current node
- parent node
- direct related nodes
- direct child nodes

Focus scope should remain same-level and local. It should not expand into an unbounded network.

## Node Design

Nodes must be square or rectangular modules.

Do not use circular nodes.

Node titles must be inside nodes.

Each node should include:

- title
- small type/domain metadata
- accent port or marker

Domain colors are accents only:

- border
- side bar
- corner marker
- port marker
- selected outline

Node fills should stay black or very dark.

## Port-Based Routing

Every node has explicit ports:

- left
- right
- top
- bottom

Traces must begin at a source port and end at a target port.

Do not draw traces that stop away from nodes.

Example:

```txt
Graphics.left -> Shader.right
Graphics.right -> Rasterization.left
Graphics.bottom -> Material System.top
```

## PCB-Style Traces

Traces should look like hard-edged PCB routes.

Use:

- 90-degree turns
- horizontal and vertical segments
- grid-aligned route points
- direct port contact
- relation-specific line styles

Do not use:

- random diagonal edges
- force-directed spaghetti layout
- decorative glow
- blurred colored shadows
- soft neon gradients

Relation style:

| Relation | Style |
|---|---|
| contains | solid white or muted gray line |
| depends-on | solid yellow line with arrow |
| used-in | dashed purple or blue line |
| compares-with | paired or double orange line |

## Layout Persistence

Semantic relations belong in `vault/graph.yaml`.

Visual layout should not be mixed with semantic graph data.

Later, node positions and trace routes may be stored in:

```txt
vault/graph-layout.yaml
```

`graph-layout.yaml` may contain:

- scope ID
- node positions
- node sizes
- port choices
- trace route points

## Viewport, Board, And Camera

The graph uses a fixed world coordinate system.

Desktop graph board size:

```txt
2400 x 1600
```

Mobile graph board size:

```txt
900 x 1200
```

Layer model:

```txt
Graph Viewport
└─ Graph Board
   ├─ SVG Trace Layer
   └─ HTML Node Layer
```

The viewport is only the visible window. Window resize changes the visible area only.

The board is the fixed world. It does not resize when the app window changes.

The trace layer and node layer must share the same board coordinate system.

The SVG trace layer must use the board size for its `width`, `height`, and `viewBox`.

Do not set the trace SVG to fill the viewport while HTML nodes use board-space CSS pixels.

Camera state:

```txt
camera.x
camera.y
camera.zoom
```

Camera transform is applied to the whole board:

```txt
translate(camera.x, camera.y) scale(camera.zoom)
```

Interactions:

- dragging empty graph space pans the board
- mouse wheel zooms around the cursor
- Fit fits the current scope
- window resize does not change node positions, trace routes, pan, or zoom
- Layout Edit Mode supports node dragging with grid snapping

## Implementation Shape

Recommended code structure:

```txt
src/graph/
├─ graph-scope.js
├─ graph-layout.js
├─ graph-theme.js
└─ graph-interactions.js
```

Separate:

- graph data
- scope logic
- visual theme
- route geometry
- interaction behavior
