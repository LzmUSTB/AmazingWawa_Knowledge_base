# Layout Editing

## 1. Purpose

Layout Editing lets the user manually organize graph boards so the knowledge graph becomes a stable spatial memory map.

The goal is not to introduce a complex automatic layout algorithm. The first version should let the user move nodes directly and save their positions.

## 2. Scope

First Layout Edit Mode supports:

```txt
node dragging
grid snapping
saving node positions to graph-layout.yaml
canceling unsaved layout changes
generated orthogonal routes following moved nodes
Ctrl + left drag quick node move
Ctrl + wheel UI font size
```

First Layout Edit Mode does not support manual route point editing, node resizing, route point dragging, drag-to-connect, automatic force-directed layout, or graph-layout route writing.

## 3. Data Model

Layout is stored in:

```txt
vault/graph-layout.yaml
```

Each scope has its own board:

```txt
root
<domain-id>
<focus-node-id>
```

Example:

```yaml
schemaVersion: 1

boards:
  rendering-pipeline:
    width: 2400
    height: 1600
    grid: 32

    nodes:
      rendering-pipeline:
        x: 1100
        y: 720
        w: 260
        h: 100

      test-note:
        x: 620
        y: 720
        w: 180
        h: 80
```

First version saves only board size, grid, and node x/y/w/h.

Generated routes are not saved.

## 4. Normal Mode

```txt
single click node = select node
double click node = navigate
drag empty canvas = pan
mouse wheel = graph zoom
node drag = disabled
```

## 5. Layout Edit Mode

The user enters by clicking `Edit Layout`.

In Layout Edit Mode:

```txt
drag node = move node
drag empty canvas = pan
mouse wheel = graph zoom
Save Layout = persist current board.nodes
Cancel Layout = discard draft changes
Esc = cancel layout edit if dirty confirmation passes
```

The UI should clearly indicate layout editing is active.

## 6. Ctrl + Left Drag Shortcut

Outside Layout Edit Mode:

```txt
Ctrl + left mouse drag on node = move node
```

This creates unsaved layout changes and should reveal or enable Save Layout / Cancel Layout.

Rules:

```txt
Ctrl + drag should not open notes.
Ctrl + drag should not select text.
Ctrl + drag should not pan the canvas when starting from a node.
```

## 7. Grid Snapping

Node positions should snap to the current board grid. Snap x/y only. Do not resize nodes in the first version.

## 8. Board Creation

If the current scope has no board in `graph-layout.yaml`:

```txt
create board from current deterministic generated layout
copy all visible scope node positions into board.nodes
apply the user drag change
save board on Save Layout
```

Default board:

```txt
width: 2400
height: 1600
grid: 32
```

## 9. Route Behavior

Default route strategy:

```txt
manual route in graph-layout.yaml if valid
otherwise generated orthogonal route
```

When a node moves:

```txt
related generated routes update immediately
manual routes connected to moved nodes may be bypassed if stale
generated routes are not saved
```

Generated orthogonal routes should avoid center-to-center straight lines.

Use port selection, port offset, lane offset, and relation style from `graph.yaml`.

## 10. Save Layout

Save writes the current scope board to `graph-layout.yaml`.

Rules:

```txt
write only the current scope board unless preserving file order requires full YAML rewrite
preserve other boards
preserve existing manual routes if they are still valid
do not write generated route points
do not write camera state
do not write selected node state
do not write UI font size
```

After save:

```txt
reload vault
stay in current graph scope
keep selected node if possible
mark layout dirty = false
```

## 11. Cancel Layout

Cancel discards draft node positions and restores the saved/generated layout.

If dirty, show confirmation.

## 12. Unsaved Layout Guard

Before navigation:

```txt
If layout dirty:
  ask confirmation
```

Applies to switching graph scope, opening a note, opening another vault, creating a new note, and closing layout edit mode.

## 13. UI Font Scaling

Shortcut:

```txt
Ctrl + mouse wheel = change UI font size
```

Store in localStorage:

```txt
amazingwawa.uiFontScale
```

Recommended range: `0.85 <= scale <= 1.25`. Default: `1.0`.

Font scaling must not mutate vault files, change board coordinates, change node x/y/w/h, or change camera zoom.

## 14. Git Behavior

Layout changes should produce small Git diffs.

Expected diff:

```diff
boards:
  rendering-pipeline:
    nodes:
      test-note:
-       x: 620
-       y: 720
+       x: 760
+       y: 640
```

Avoid writing generated route points because they create noisy diffs.

## 15. Future Work

Later versions may add manual route editing, route bend-point dragging, node resizing, align/distribute commands, selected route regenerate, and route locking.
