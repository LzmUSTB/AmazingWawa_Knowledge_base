# Graph Layout Schema

## 1. Purpose

This document defines the current schema for `vault/graph-layout.yaml`.

```txt
graph.yaml = semantic relations
graph-layout.yaml = visual board layout
```

`graph-layout.yaml` stores visual layout data for the PCB-style knowledge graph. It is separate from `graph.yaml`.

## 2. Core Principle

`graph-layout.yaml` should answer:

```txt
Where is this node placed?
How large is this node?
Which manual PCB routes override generated routes?
```

It should not answer:

```txt
What does this relation mean?
What is the note content?
What is the current zoom or pan?
Which node is currently selected?
What is the current UI font size?
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
```

`graph-layout.yaml` is the primary manual layout source. JavaScript layout tables and generated layout are fallback only. The loader normalizes `w/h` to `width/height` for UI rendering.

## 5. Top-Level Fields

| Field | Required | Description |
|---|---:|---|
| `schemaVersion` | yes | Layout schema version |
| `boards` | yes | Layout definitions by graph scope |

## 6. Board

Each board represents one graph scope.

Recommended first-version board IDs:

```txt
root
<domain-id>
<focus-node-id>
```

A board has:

| Field | Required | Description |
|---|---:|---|
| `width` | yes | Board world width |
| `height` | yes | Board world height |
| `grid` | yes | Grid size |
| `nodes` | yes | Node layout map |
| `routes` | optional | Manual route override map |

## 7. Board Coordinate System

Rules:

```txt
Board size does not change when the app window changes.
Node coordinates are board coordinates.
Manual route points are board coordinates.
Window resize only changes the viewport.
```

Use absolute board coordinates, not percentages or CSS layout positions.

## 8. Node Layout

```yaml
nodes:
  rendering-pipeline:
    x: 620
    y: 460
    w: 220
    h: 80
```

`x/y` represent the top-left corner. `w/h` represent node module size.

## 9. Route Layout

Manual routes are optional overrides. Generated orthogonal routes are the normal fallback.

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

First Layout Edit Mode does not create or edit manual routes. It only saves node positions. Routes are generated at runtime.

## 10. Ports

First-version ports:

```txt
top
right
bottom
left
```

Generated route logic may internally use port offsets to avoid overlapping multiple traces. These offsets do not need to be stored in `graph-layout.yaml`.

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

## 12. Relation Style Is Not Stored Here

Line style should be derived from relation type in `graph.yaml`.

```txt
contains -> solid line
depends-on -> arrow line
used-in -> dashed line
compares-with -> paired / double line
```

## 13. Camera State Is Not Stored Here

Do not store zoom, pan, viewport size, selection, hover, UI font size, or sidebar state.

## 14. Generated Layout Fallback

If `graph-layout.yaml` is missing or incomplete, the app may generate a temporary default layout.

Rules:

```txt
Generated layout is a fallback.
Generated layout should not overwrite graph-layout.yaml automatically.
User must explicitly save layout.
Generated layout must be deterministic.
Do not use random layout.
Do not use force-directed layout.
```

Node lookup order:

```txt
1. layouts.boards[scopeId].nodes[node.id]
2. legacy/static fallback node layout if available
3. deterministic generated layout
```

Route lookup order:

```txt
1. manual route in graph-layout.yaml if valid
2. legacy/static route if available
3. generated orthogonal route from source/target node boxes
```

Generated orthogonal route should use port selection, port offset, lane offset, and relation-aware visual style.

Generated routes are not saved in the first Layout Edit Mode.

## 15. Layout Edit Mode

Normal Mode:

```txt
click node = select
double click node = navigate
drag empty canvas = pan
mouse wheel = graph zoom
node dragging disabled
```

Layout Edit Mode:

```txt
drag node = move node
drag empty canvas = pan
mouse wheel = graph zoom
Save Layout = write board.nodes to graph-layout.yaml
Cancel Layout = discard draft node positions
```

Also supported:

```txt
Ctrl + left mouse drag on node = temporary direct node drag
```

This shortcut should update the draft layout and require Save Layout to persist.

Save rules:

```txt
Save board.width, board.height, board.grid, board.nodes.
Do not save generated route points.
Do not write routes unless preserving valid existing manual route overrides.
```

## 16. Graph Camera Relationship

The app should render layout using viewport, board, and camera.

```txt
Graph Viewport
└─ Graph Board
   ├─ SVG Trace Layer
   └─ HTML Node Layer
```

The camera transforms the board:

```txt
translate(camera.x, camera.y) scale(camera.zoom)
```

The app may adjust camera pan/zoom when the user clicks Fit, during initial fit, or during debounced viewport fit.

## 17. Validation Rules

Validate:

```txt
schemaVersion exists
boards exists
each board has width/height/grid
each node layout has x/y/w/h
each route references an edge from graph.yaml
each route segment is horizontal or vertical
```

Layout editing validation should also warn when board nodes or routes reference non-existent graph entities.
