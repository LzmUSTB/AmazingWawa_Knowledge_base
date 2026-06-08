# Graph Layout Schema

## 1. Purpose

This document defines the first-version schema for `vault/graph-layout.yaml`.

`graph-layout.yaml` stores visual layout data for the PCB-style knowledge graph.

It is separate from `graph.yaml`.

```txt
graph.yaml = semantic relations
graph-layout.yaml = visual board layout and PCB trace routes
```

## 2. Core Principle

`graph-layout.yaml` should answer:

```txt
Where is this node placed?
How large is this node?
Which port does a trace start from?
Which port does a trace end at?
How does this PCB trace route through the board?
```

It should not answer:

```txt
What does this relation mean?
What is the note content?
What is the current zoom or pan?
Which node is currently selected?
```

## 3. File Location

```txt
vault/graph-layout.yaml
```

## 4. Recommended Structure

```yaml
schemaVersion: 1

boards:
  root:
    width: 2400
    height: 1600
    grid: 32

    nodes:
      graphics:
        x: 360
        y: 320
        w: 180
        h: 88

      machine-learning:
        x: 840
        y: 320
        w: 220
        h: 88

    routes:
      graphics-compares-with-machine-learning:
        edge: graphics-compares-with-machine-learning
        fromPort: right
        toPort: left
        points:
          - [540, 364]
          - [640, 364]
          - [640, 364]
          - [840, 364]

  graphics:
    width: 2400
    height: 1600
    grid: 32

    nodes:
      graphics:
        x: 1100
        y: 720
        w: 220
        h: 100

      rendering-pipeline:
        x: 620
        y: 460
        w: 220
        h: 80

    routes:
      graphics-contains-rendering-pipeline:
        edge: graphics-contains-rendering-pipeline
        fromPort: left
        toPort: right
        points:
          - [1100, 770]
          - [960, 770]
          - [960, 500]
          - [840, 500]
```

In the desktop static-loader prototype, `graph-layout.yaml` is the primary layout source.

The JavaScript layout tables are fallback only. The loader normalizes `w/h` to `width/height` for UI rendering.

## 5. Top-Level Fields

| Field | Required | Description |
|---|---:|---|
| `schemaVersion` | yes | Layout schema version |
| `boards` | yes | Layout definitions by graph scope |

## 6. Board

Each board represents one graph scope.

Examples:

```txt
root
graphics
rendering-pipeline
```

A board has:

| Field | Required | Description |
|---|---:|---|
| `width` | yes | Board world width |
| `height` | yes | Board world height |
| `grid` | yes | Grid size |
| `nodes` | yes | Node layout map |
| `routes` | recommended | PCB route map |

## 7. Board Coordinate System

The board is a fixed world coordinate space.

Example:

```yaml
width: 2400
height: 1600
grid: 32
```

Rules:

```txt
Board size does not change when the app window changes.
Node coordinates are board coordinates.
Route points are board coordinates.
Window resize only changes the viewport.
```

Do not use:

```txt
percentages
viewport-relative coordinates
responsive node positions
CSS layout positions
```

Use absolute board coordinates.

## 8. Node Layout

Example:

```yaml
nodes:
  rendering-pipeline:
    x: 620
    y: 460
    w: 220
    h: 80
```

Fields:

| Field | Required | Description |
|---|---:|---|
| `x` | yes | Node left x |
| `y` | yes | Node top y |
| `w` | yes | Node width |
| `h` | yes | Node height |

Rules:

```txt
x/y represent the top-left corner.
w/h represent node module size.
All values are board-space numbers.
```

## 9. Route Layout

Example:

```yaml
routes:
  graphics-contains-rendering-pipeline:
    edge: graphics-contains-rendering-pipeline
    fromPort: left
    toPort: right
    points:
      - [1100, 770]
      - [960, 770]
      - [960, 500]
      - [840, 500]
```

Fields:

| Field | Required | Description |
|---|---:|---|
| `edge` | yes | Edge ID from `graph.yaml` |
| `fromPort` | yes | Source node port |
| `toPort` | yes | Target node port |
| `points` | yes | Orthogonal route points |

## 10. Ports

First-version ports:

```txt
top
right
bottom
left
```

Meaning:

| Port | Position |
|---|---|
| `top` | center of top edge |
| `right` | center of right edge |
| `bottom` | center of bottom edge |
| `left` | center of left edge |

Future ports may include:

```txt
top-1
top-2
right-1
right-2
bottom-1
bottom-2
left-1
left-2
```

Do not add these in the first version unless needed.

## 11. Route Points

Route points define PCB-style trace lines.

Rules:

```txt
Each segment must be horizontal or vertical.
No diagonal segments.
No Bezier curves.
No random point-to-point lines.
No force-directed spaghetti lines.
```

Valid:

```yaml
points:
  - [1100, 770]
  - [960, 770]
  - [960, 500]
  - [840, 500]
```

Invalid:

```yaml
points:
  - [1100, 770]
  - [840, 500]
```

Reason:

```txt
This creates a diagonal line.
```

## 12. Route Endpoint Rule

The first point should match the source port position.

The last point should match the target port position.

Example:

```txt
source node left port -> first point
target node right port -> last point
```

During validation, the app may warn if route endpoints do not touch the declared ports.

## 13. Relation Style Is Not Stored Here

Do not store relation colors or line styles in `graph-layout.yaml`.

Line style should be derived from relation type in `graph.yaml`.

Example:

```txt
contains -> solid line
depends-on -> arrow line
used-in -> dashed line
compares-with -> paired / double line
```

## 14. Camera State Is Not Stored Here

Do not store:

```txt
zoom
pan
viewport width
viewport height
current selected node
current hover node
```

These are session state.

If needed later, store them in app-specific local settings, not in the vault layout schema.

## 15. Board Types

Recommended first-version board IDs:

```txt
root
<domain-id>
<focus-node-id>
```

Examples:

```txt
root
graphics
machine-learning
rendering-pipeline
shader
```

Board meaning:

| Board ID | Meaning |
|---|---|
| `root` | top-level domain board |
| `graphics` | graphics domain board |
| `rendering-pipeline` | focused node board |

## 16. Generated Layout Fallback

If `graph-layout.yaml` is missing or incomplete, the app may generate a temporary default layout.

Rules:

```txt
Generated layout is a fallback.
Generated layout should not overwrite graph-layout.yaml automatically.
User must explicitly save layout.
```

Fallback generation is deterministic per scope. It may be used for generated focus scopes whose node ID does not yet have a board in `graph-layout.yaml`.

Route lookup order:

```txt
layouts.boards[scopeId].routes[edge.id].points
-> legacy/static fallback route if available
-> no rendered route
```

Node lookup order:

```txt
layouts.boards[scopeId].nodes[node.id]
-> legacy/static fallback node layout if available
-> deterministic generated layout
```

## 17. Graph Camera Relationship

The app should render layout using:

```txt
viewport
board
camera
```

Structure:

```txt
Graph Viewport
└─ Graph Board
   ├─ SVG Trace Layer
   └─ HTML Node Layer
```

The board has fixed width and height.

The camera transforms the board:

```txt
translate(camera.x, camera.y) scale(camera.zoom)
```

Window resize changes viewport only.

It does not change:

```txt
board width
board height
node x/y/w/h
route points
camera zoom
camera pan
```

Unless the user clicks `Fit` or `Reset View`.

## 18. Validation Rules

Validate:

```txt
schemaVersion exists
boards exists
each board has width/height/grid
each node layout has x/y/w/h
each route references an edge from graph.yaml
each fromPort/toPort is allowed
each route has at least two points
each route segment is horizontal or vertical
route endpoints touch declared ports or are close enough
```

## 19. Summary

`graph-layout.yaml` is the visual graph board layer.

It stores:

```txt
board size
grid size
node position
node size
edge route points
source/target ports
```

It does not store:

```txt
semantic relation meaning
note content
current interaction state
zoom/pan
visual colors
temporary selection
```
