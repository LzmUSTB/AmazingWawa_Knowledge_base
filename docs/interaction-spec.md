# Interaction Specification

## 1. Purpose

This document defines the current and next-stage interaction rules for the local-first knowledge graph desktop app.

```txt
Top Menu
+ Left Vault Sidebar / File Tree
+ Main Workspace
  + Breadcrumb
  + Graph View
  + Note View
+ Right Relation Sidebar   (Step 7)
```

The desktop app is the primary maintenance environment. The mobile/web viewer is read-first.

## 1.1 Current Desktop Stage

Current implemented behavior:

```txt
desktop-vault-adapter.js = desktop file access boundary
Open Vault = real Tauri folder open
startup = last opened vault -> repository ./vault -> No Vault Loaded
note.md Save = real disk write
New Note = creates meta.yaml, note.md, assets/, and one contains edge
Layout Edit Mode = real graph-layout.yaml board.nodes write
mock/static sample = removed
```

`./vault` is treated as a real vault, loaded through Tauri filesystem APIs. Frontend code must not raw-import `vault/**`.

`Reset View` was removed because it duplicated `Fit`.

## 1.2 Scope-Based Graph Model

| Scope | What It Shows | Breadcrumb |
|---|---|---|
| Root scope | Top-level domains only | `Global Graph` |
| Domain scope | One center domain plus direct children | `Global Graph / <Domain>` |
| Focus scope | Current node and one-hop relations | `Global Graph / <Domain> / <Concept>` |

Rules:

```txt
Root scope: top-level domain nodes only
Domain scope: current domain + direct contains children only
Focus scope: focused node + directly connected one-hop neighbors
```

If `graphics contains rendering-pipeline` and `rendering-pipeline contains test-note`, the Graphics Domain Graph shows `graphics` and `rendering-pipeline`, not `test-note`.

## 1.3 Node Drilldown Rules

Double-click behavior:

```txt
domain node -> open domain graph
non-domain node with contains children -> open local / focus graph
non-domain leaf node -> open note
center node in its own local graph -> open note
```

## 1.4 New Note Parent Rules

New Note creates hierarchy through one `contains` edge.

```txt
Parent must belong to the selected domain.
Cross-domain relationships should use Add Link, not Parent.
```

## 2. Core Interaction Model

| Surface | Role |
|---|---|
| Left File Tree | Physical storage structure |
| Graph View | Conceptual relationship structure |
| Note View | Knowledge explanation and editing surface |
| Right Relation Sidebar | Current node actions, hierarchy, direct relations, Add Link |

## 3. Top Menu Interactions

Current pre-Step-7 visible items:

```txt
Open Vault
New Note
New Link     (legacy prototype button; remove in Step 7)
Git disabled
FONT indicator
```

Step 7 target:

```txt
Open Vault
New Note
Git disabled
FONT indicator
```

`New Link` must be removed from the global top menu in Step 7. Link creation becomes context-bound `Add Link` inside the right relation sidebar.

Hidden until implemented:

```txt
Search
Settings
```

## 4. Left File Tree Interactions

The left file tree displays vault domain folders and knowledge item folders. It does not show raw static file buttons such as `graph.yaml`, `domains.yaml`, or `assets/`.

Display rule:

```txt
show title as main text
show id as secondary text or tooltip
```

Click behavior:

| Target | Behavior |
|---|---|
| Domain folder | Show domain graph |
| Concept/topic folder | Open note |
| Empty area | No action |

## 5. Graph View Interactions

### 5.1 Node Mouse Interactions

| Action | Behavior |
|---|---|
| Single-click any node | Select node only |
| Double-click domain node | Enter that domain scope |
| Double-click non-domain node with children | Open local / focus graph |
| Double-click non-domain leaf node | Open Note View |
| Double-click center node in own focus graph | Open Note View |
| Hover node | Highlight one-hop neighbors |
| Right-click node | Select node; floating menu is replaced by right sidebar in Step 7 |
| Drag empty canvas | Pan viewport |
| Mouse wheel | Graph zoom |
| Click empty area | No navigation |

### 5.2 Graph Toolbar

Current pre-Step-7 toolbar:

```txt
New Node
New Link     (legacy prototype button; remove in Step 7)
Global
Local
Fit
Edit Layout / Save Layout / Cancel Layout
```

Step 7 target toolbar:

```txt
New Node
Global
Local
Fit
Edit Layout / Save Layout / Cancel Layout
```

`Search` and `Reset View` are not shown.

### 5.3 PCB-Style Graph Rendering

Edges should render as PCB-style traces:

```txt
90-degree turns
grid-aligned route points
horizontal and vertical segments
direct source port to target port contact
no diagonal center-to-center lines
```

Relation styles:

| Relation | Trace Style |
|---|---|
| contains | solid white or muted gray line |
| depends-on | solid yellow line with arrow |
| used-in | dashed purple or blue line |
| compares-with | paired or double orange line |

## 6. Layout Editing Interactions

### 6.1 Normal Mode

```txt
click node = select
double click node = navigate
drag empty canvas = pan
mouse wheel = graph zoom
node drag disabled
```

### 6.2 Layout Edit Mode

Entered by clicking `Edit Layout`.

```txt
drag node = move node
drag empty canvas = pan
mouse wheel = graph zoom
Save Layout = write current scope board.nodes to graph-layout.yaml and exit Layout Edit Mode
Cancel Layout = discard draft positions
```

### 6.3 Ctrl + Left Drag Shortcut

Even outside Layout Edit Mode:

```txt
Ctrl + left mouse drag on node = temporarily move node
```

This creates unsaved layout changes. The user must click Save Layout to persist them.

### 6.4 Save Layout

Save writes:

```txt
graph-layout.yaml boards[scopeId].nodes
```

Generated route points are not written. Manual routes connected to moved nodes are removed so generated routes can reconnect after reload. Save Layout stays in the current graph scope and exits Layout Edit Mode.

## 7. UI Font Size Interaction

Shortcut:

```txt
Ctrl + mouse wheel = change UI font size
```

Rules:

```txt
Ctrl + wheel up = increase UI font scale
Ctrl + wheel down = decrease UI font scale
```

Store in localStorage:

```txt
amazingwawa.uiFontScale
```

Recommended range:

```txt
0.85 to 1.25
```

Font scaling must not mutate vault files, change board coordinates, change node x/y/w/h, or change camera zoom.

## 8. Step 7: Right Relation Sidebar + Add Link

Step 7 replaces global `New Link` and floating `NodeContextMenu` with a collapsible right sidebar.

Right sidebar appears in:

```txt
Graph View
Note View
```

Right sidebar responsibilities:

```txt
Selected node summary
Open Note / Show Local Graph actions
Hierarchy section
Relations section
Add Link button
```

Relation list example for current node `A`:

```txt
RELATIONS                         +
-----------------------------------
A depends-on B
A used-in B
B depends-on A
A compares-with B
```

Clicking the other node in a relation opens that node's local/focus scope.

Add Link is context-bound to the current node and writes `depends-on`, `used-in`, or `compares-with` to `graph.yaml`. It does not create `contains` edges.

## 9. Note View

Read mode shows note content. Edit mode modifies `note.md`.

Toolbar behavior:

```txt
Read mode: Edit / Show in Graph
Edit mode: Save / Cancel only
```

Save behavior:

```txt
Click Save
-> write content to note.md
-> reload vault without navigation reset
-> update dirty state
-> return to Read mode
-> stay on the same Note page
```

## 10. Unsaved Changes Policy

Dirty note state:

```txt
draftMarkdown !== original note.md markdown
```

Dirty layout state:

```txt
draft node positions differ from current saved board.nodes
```

Before navigation, show a confirmation dialog if dirty.

## 11. Keyboard / Mouse Shortcuts

| Shortcut | Action |
|---|---|
| Ctrl + O | Open Vault |
| Ctrl + N | New Note |
| Ctrl + S | Save note in Edit mode or Save Layout in Layout Edit Mode |
| Esc | Close dialog / cancel layout edit |
| Ctrl + left drag node | Move node as unsaved layout edit |
| Ctrl + mouse wheel | Change UI font size |

## 12. Current Implementation Scope

Implemented/current:

- Tauri Open Vault
- repository `./vault` as default real vault
- No Vault Loaded screen
- File Tree
- Breadcrumb
- Root Graph
- Domain Graph
- Focus Graph generated from edges
- New Note creation
- legacy New Link prototype-only dialog
- Note Read mode
- Note Edit mode
- note.md Save
- Show in Graph
- sidebar collapse
- Fit
- Layout Edit Mode
- Save graph-layout.yaml board.nodes
- Ctrl + wheel UI font scale

Next:

- Right Relation Sidebar
- Add Link writing to graph.yaml
- remove global New Link buttons
- replace floating NodeContextMenu
- content block renderer
