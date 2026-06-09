# Interaction Specification

## 1. Purpose

This document defines current interaction rules for the local-first knowledge graph desktop app.

```txt
Top Menu
+ Left Vault Sidebar / File Tree
+ Main Workspace
  + Breadcrumb
  + Graph View
  + Note View
+ Right Relation Sidebar
```

The desktop app is the primary maintenance environment. The mobile/web viewer is read-first.

## 1.1 Current Desktop Stage

Current implemented behavior:

```txt
desktop-vault-adapter.js = desktop file access boundary
Open Vault = real Tauri folder open
startup = last opened real vault -> repository ./vault -> No Vault Loaded
note.md Save = real disk write
New Note = creates meta.yaml, note.md, assets/, and one contains edge
Right Relation Sidebar = inspect hierarchy and relations
Add Link = writes depends-on / used-in / compares-with to graph.yaml
Layout Edit Mode = node drag + save graph-layout.yaml board.nodes
```

There is no mock graph fallback and no static sample vault. Repository `./vault` is the default real vault and must be loaded through Tauri filesystem APIs.

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

## 2. Core Interaction Model

| Surface | Role |
|---|---|
| File Tree | Physical storage structure |
| Graph View | Conceptual relationship structure |
| Note View | Knowledge explanation and editing surface |
| Right Relation Sidebar | Current node inspection and relation maintenance |

## 3. Top Menu Interactions

Current visible first-version items:

```txt
Open Vault
New Note
Git disabled
FONT <scale>
```

Hidden until implemented:

```txt
Search
Settings
```

`New Link` is not a global top-menu command. Link creation is context-bound through the right relation sidebar.

## 4. Left File Tree Interactions

The left file tree displays vault domain folders and knowledge item folders. It does not show raw static file buttons such as `graph.yaml`, `domains.yaml`, or `assets/`.

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
| Right-click node | May select node only; no floating context menu |
| Drag empty canvas | Pan viewport |
| Mouse wheel | Graph zoom |
| Click empty area | No navigation |

### 5.2 Graph Toolbar

Current toolbar:

```txt
New Node
Global
Local
Fit
Edit Layout / Save Layout / Cancel Layout
```

`New Link`, `Search`, and `Reset View` are not shown.

### 5.3 PCB-Style Graph Rendering

Edges render as PCB-style traces:

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
| depends-on | dashed yellow reverse arrow |
| used-in | solid purple forward arrow |
| compares-with | paired or double orange bidirectional line |

## Relation visual semantics

Visual direction is only a rendering rule. The stored direction in `graph.yaml` does not change.

```txt
contains:
  white solid line, no arrow

depends-on:
  yellow dashed reverse arrow
  A depends-on B is displayed as B -> A

used-in:
  purple solid forward arrow
  A used-in B is displayed as A -> B

compares-with:
  orange solid double line, bidirectional arrow
```

Example stored edge:

```yaml
from: A
to: B
relation: depends-on
```

This is still stored as `A depends-on B`, even though it is displayed as `B -> A`.

## 6. Right Relation Sidebar

The right relation sidebar is the primary node context panel.

It shows:

```txt
Selected Node
Actions
Add Link
Hierarchy
Relations
```

The sidebar is collapsible.

Preference key:

```txt
amazingwawa.relationSidebarCollapsed
```

### 6.1 Add Link Form

Add Link is bound to the current node. It supports only non-hierarchical relations:

```txt
depends-on
used-in
compares-with
```

It must not create `contains`.

UX requirements:

```txt
Direction:
  [current node] [→ button toggles direction] [Target]

Target:
  show nodes grouped by hierarchy, not as a flat unclear list
  domain / top-level groups must show domain color

Relations list:
  display relation text and a small arrow/trace preview
  both text and arrow use the relation color
```

## 7. Layout Editing Interactions

Layout Edit Mode supports node dragging, grid snapping, Save Layout, Cancel Layout, Ctrl + left drag shortcut, and generated orthogonal routes following moved nodes. It does not include manual route editing.

After Save Layout:

```txt
reload vault
stay in current graph scope
keep selected node if possible
exit Layout Edit Mode
```

## 8. UI Font Size Interaction

Shortcut:

```txt
Ctrl + mouse wheel = change UI font size
```

Store in localStorage:

```txt
amazingwawa.uiFontScale
```

Recommended range: `0.85 <= scale <= 1.25`.

Font scaling must not mutate vault files, change board coordinates, change node x/y/w/h, or change camera zoom.

## 9. Note View and Content Blocks

Read mode displays note content using document-style typography and supported content blocks.

Edit mode remains raw Markdown textarea editing.

First content block renderer supports:

```txt
concept-card
process-flow
compare-table
code-explain
quiz
expression-visualizer
```

The renderer follows `content_block_preview_v4.html` visual direction.

Plain Markdown sections should read like a document, not like boxed debug cards. Subheadings should be visually clear, larger than current small labels, and should not each be wrapped in individual heavy boxes.

## 10. Unsaved Changes Policy

Before navigation, show a confirmation dialog if note or layout state is dirty.

## 11. Current Implementation Scope

Implemented/current:

- real Tauri vault loading
- No Vault Loaded state
- File Tree
- Breadcrumb
- Root Graph
- Domain Graph
- Focus Graph generated from edges
- New Note creation
- Right Relation Sidebar
- Add Link graph.yaml write
- Note Read mode
- Note Edit mode
- note.md Save
- Show in Graph
- sidebar collapse
- right sidebar collapse
- Layout Edit Mode
- Save graph-layout.yaml board.nodes
- UI font scale by Ctrl + wheel

Next:

- Content Block Renderer
- Search / Quick Open
- relation edit/delete
- Git panel
- AI assist
