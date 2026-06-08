# Interaction Specification

## 1. Purpose

This document defines the first-version interaction rules for the local-first knowledge graph system.

The goal is to make the product behavior clear before implementing UI components, graph rendering, file editing, or AI-assisted workflows.

This specification is based on the current product direction:

```txt
Top Menu
+ Left File Tree
+ Main Workspace
  + Breadcrumb
  + Graph View
  + Note View
```

## 1.1 Desktop Maintenance MVP Update

The desktop app now uses a desktop vault adapter at:

```txt
apps/desktop/src/data/desktop-vault-adapter.js
```

Vue components do not call Tauri filesystem APIs directly.

Startup behavior:

```txt
try last opened vault path from localStorage
-> if it loads, use that local vault
-> if it fails, load the static sample vault
```

Open Vault validates `vault.yaml`, `domains.yaml`, `graph.yaml`, and `content/`, then normalizes the vault and resets to the root graph.

Note editing is real in the Desktop Maintenance MVP. Edit mode shows raw `note.md`, Save writes it to disk, and the app reloads the vault from disk after saving.

Dirty-state navigation guard applies before opening another note, switching to graph, changing graph scope, clicking another file tree item, or opening another vault.

Responsive layout rules:

- no horizontal app overflow
- Vault sidebar can collapse and restore
- graph and note workspaces can shrink to half-screen width
- toolbars may wrap or scroll horizontally
- Note View fills available workspace width

The sidebar preference uses:

```txt
amazingwawa.sidebarCollapsed
```

Graph viewport resize uses debounced camera fitting. This does not mutate node positions, route points, or `graph-layout.yaml`.

`Reset View` was removed because it duplicated `Fit`. `Fit` means fitting the current scope into the visible graph viewport.

The desktop app is the main maintenance environment.

The mobile/web viewer is read-first and should not provide the full editing workflow in the first version.

## 2. Core Interaction Model

The app has three primary conceptual surfaces:

| Surface | Role |
|---|---|
| File Tree | Physical storage structure |
| Graph View | Conceptual relationship structure |
| Note View | Knowledge explanation and editing surface |

The file tree and the graph should not be treated as the same thing.

```txt
File Tree = where the knowledge is stored
Graph View = how the knowledge is connected
Note View = what the knowledge means
```

## 3. App Startup Flow

Current static-loader prototype:

```txt
Vite imports vault/*.yaml and vault/content/*/* files as raw text
-> knowledge-core normalizes them into one vault object
-> desktop UI reads scopes, nodes, notes, file tree, and layouts from that object
-> if loading fails, the UI falls back to mock demo data and logs a warning
```

The Tauri Open Vault folder picker is not implemented in this phase.

When the desktop app launches:

```txt
Open app
↓
Check recent vault path
↓
If no recent vault exists:
  show Open Vault screen
If recent vault exists:
  load vault
↓
Check last session state
↓
If last session was Graph View:
  restore graph context
If last session was Note View:
  restore opened note
If no session state exists:
  show Global Graph
```

### 3.1 Open Vault Screen

Shown when no vault is selected.

Required actions:

- Open Vault
- Create New Vault later
- Open Recent Vault later

First version only requires:

```txt
Open Vault
```

### 3.2 Session Restoration

The app should remember:

- last opened vault path
- last active view type
- last graph context
- last opened note ID
- graph pan and zoom later
- selected node later

First version minimum:

```txt
last opened vault
last active view
last opened note or graph context
```

## 4. Top Menu Interactions

The top menu provides app-level commands.

Recommended first-version items:

```txt
Open Vault
New Note
New Link
Search
Git
Settings
```

### 4.1 Open Vault

Action:

```txt
Click Open Vault
↓
Open system folder picker
↓
User selects vault folder
↓
Validate vault structure
↓
Load domains.yaml, graph.yaml, and content metadata
↓
Show Global Graph
```

Validation minimum:

- selected folder exists
- `graph.yaml` exists
- `domains.yaml` exists
- `content/` exists

If invalid:

```txt
Show error message
Do not load vault
```

### 4.2 New Note

Action:

```txt
Click New Note
↓
Open New Note dialog
↓
User enters title
↓
User selects domain
↓
System generates concept ID
↓
User confirms
↓
Create:
  vault/content/<domain>/<concept-id>/meta.yaml
  vault/content/<domain>/<concept-id>/note.md
  vault/content/<domain>/<concept-id>/assets/
↓
Open new Note View in Edit mode
```

Required fields:

- title
- domain
- type
- status

Default values:

```yaml
type: concept
status: seed
summary: ""
prerequisites: []
related: []
```

### 4.3 New Link

Action:

```txt
Click New Link
↓
Open New Link dialog
↓
Select source node
↓
Select target node
↓
Select relation type
↓
Confirm
↓
Append edge to graph.yaml
↓
Refresh Graph View
```

Allowed relation types:

- contains
- depends-on
- used-in
- compares-with

Duplicate links should be blocked.

A duplicate means:

```txt
same source
same target
same relation
```

### 4.4 Search

Action:

```txt
Click Search
↓
Open global search overlay or search page
↓
Type query
↓
Show matching notes and domains
↓
Click result
↓
Open Note View or Graph View
```

First-version search target:

- title
- summary
- domain
- note ID

Later:

- full note.md body
- tags
- related nodes
- graph relations

### 4.5 Git

First version may show a placeholder.

Later behavior:

```txt
Click Git
↓
Open Git panel
↓
Show changed files
↓
Input commit message
↓
Commit
↓
Push
```

### 4.6 Settings

First version may show a placeholder.

Later settings:

- theme
- graph behavior
- editor behavior
- vault path
- autosave policy

## 5. Left File Tree Interactions

The left file tree displays the vault's physical structure.

Example:

```txt
vault
├─ graphics
│  ├─ rendering-pipeline
│  ├─ shader
│  └─ pbr
├─ machine-learning
│  ├─ gradient-descent
│  ├─ reinforcement-learning
│  └─ sac
└─ web-dev
   └─ nuxt
```

### 5.1 Click Behavior

| Target | Behavior |
|---|---|
| Domain folder | Show domain graph |
| Concept folder | Open note |
| `graph.yaml` | Later: open graph relation editor |
| `domains.yaml` | Later: open domain settings |
| `assets/` | Later: open asset manager |
| Empty area | No action |

### 5.2 Domain Folder Click

```txt
Click domain folder
↓
Main Workspace switches to Graph View
↓
Graph shows:
  domain node
  child nodes
  important related nodes
↓
Breadcrumb updates:
  Global Graph / <Domain>
```

### 5.3 Concept Folder Click

```txt
Click concept folder
↓
Main Workspace switches to Note View
↓
Load note.md
↓
Load meta.yaml
↓
Display note in Read mode
↓
Breadcrumb updates:
  Global Graph / <Domain> / <Concept>
```

### 5.4 File Tree Selection State

The file tree should show:

- selected item
- active domain
- active concept
- unsaved state later

Recommended visual states:

| State | Visual |
|---|---|
| Hover | subtle gray background |
| Selected | white outline or left accent bar |
| Active domain | domain accent marker |
| Unsaved later | small dot marker |

## 6. Breadcrumb Interactions

The breadcrumb is fixed at the top of the main workspace.

It represents the conceptual navigation path.

Examples:

```txt
Global Graph
Global Graph / Graphics
Global Graph / Graphics / Rendering Pipeline
```

### 6.1 Breadcrumb Click Behavior

| Breadcrumb Item | Behavior |
|---|---|
| Global Graph | Show full graph |
| Domain | Show domain graph |
| Concept | Open concept note |
| Back to Graph button | Show graph and focus current node |

### 6.2 Breadcrumb in Graph View

In Graph View:

```txt
Global Graph / <Domain> / <Focused Node>
```

Clicking a parent level changes the graph context.

### 6.3 Breadcrumb in Note View

In Note View:

```txt
Global Graph / <Domain> / <Concept>
```

Clicking the domain level returns to the domain graph.

A `Show in Graph` action should also be available.

### 6.4 Unsaved Edit Guard

If the user is editing a note and clicks breadcrumb navigation:

```txt
If there are unsaved changes:
  show confirmation dialog
  options:
    Save and leave
    Discard and leave
    Cancel
If no unsaved changes:
  navigate immediately
```

## 7. Main Workspace States

The main workspace can be in one of these states:

```txt
empty
open-vault
graph
note
recent
search
git-placeholder
settings-placeholder
```

### 7.1 Empty State

Shown only if the app has no loaded vault and no action is active.

Recommended message:

```txt
No vault loaded.
Open a vault to start.
```

### 7.2 Graph State

Shows Cytoscape graph canvas.

### 7.3 Note State

Shows note reader/editor.

### 7.4 Recent State

Shows recently opened notes and graphs.

First version can keep this simple.

## 8. Graph View Interactions

Graph View is the main conceptual workspace.

It shows nodes and edges.

The graph must show only the current scope level.

Root scope shows only domains.

Domain scope shows one center domain and its direct child nodes.

Concept grandchildren are not shown in the same domain scope unless the user enters focus scope.

Graph navigation is a drill-down interaction, not a single all-level network.

### 8.0 Scope-Based Graph Model

The graph has three first-version scopes:

| Scope | What It Shows | Breadcrumb |
|---|---|---|
| Root scope | Top-level domains only | `Global Graph` |
| Domain scope | One center domain plus direct children | `Global Graph / <Domain>` |
| Focus scope | Current node, parent, and direct related nodes | `Global Graph / <Domain> / <Concept>` |

Root scope must not show child concepts such as Shader, PBR, Rendering Pipeline, Gradient Descent, or SAC.

Domain scope must not show grandchildren or unrelated domains.

Focus scope is generated from `graph.yaml` edges.

Focus scope uses the focused node ID as the scope ID and shows:

- the focused node
- every directly connected one-hop neighbor
- only edges directly connected to the focused node

Neighbor-to-neighbor edges are not included. Cross-domain one-hop neighbors are allowed and keep their own domain color.

Clicking `Global Graph` in the breadcrumb returns to root scope.

Clicking a domain folder in the file tree opens that domain scope.

Double-clicking a domain node opens that domain scope.

Clicking a concept folder in the file tree opens Note View.

### 8.1 Graph Context Types

| Context | Description |
|---|---|
| Global Graph | Shows top-level domains only |
| Domain Graph | Shows one center domain and direct child nodes |
| Focused Node Graph | Shows current node, parent, children, and direct related nodes |

### 8.2 Default Graph Behavior

When the user opens Graph View:

```txt
If a graph context exists:
  restore it
Else:
  show Global Graph
```

### 8.3 Node Mouse Interactions

| Action | Behavior |
|---|---|
| Single-click any node | Select node only |
| Double-click domain node | Enter that domain scope |
| Double-click concept node | Open Note View |
| Hover node | Highlight one-hop neighbors |
| Right-click node | Open node context menu |
| Drag empty canvas | Pan viewport |
| Click empty area | No navigation |
| Right-click empty area | Open canvas context menu |

### 8.4 Node Selection

When a node is selected:

- selected node is highlighted
- connected one-hop nodes remain visible
- unrelated nodes may be faded
- selected node title may appear in a compact floating label
- no fixed right panel in first version
- selected style uses thicker white border, double border, or solid accent marker
- no glow, blurred shadows, or neon bloom

First-version selected state should not open a permanent inspector.

### 8.5 Node Hover

When hovering a node:

```txt
Highlight:
  hovered node
  direct edges
  one-hop neighbor nodes

Fade:
  unrelated nodes and edges
```

Hover should not change current selection.

Hover must not use glow effects. Use border weight, opacity, and solid color changes.

### 8.6 Double-click Node

```txt
Double-click node
↓
Open Note View
↓
Load note.md and meta.yaml
↓
Display Read mode
```

If node has no note yet:

```txt
Show Create Note prompt
```

### 8.7 Right-click Node Menu

Menu items:

```txt
Open Note
Edit Note
Show Local Graph
Add Link From This Node
Add Link To This Node
Rename Node later
Delete Node later
```

First-version priority:

- Open Note
- Show Local Graph
- Add Link

### 8.8 Right-click Empty Canvas Menu

Menu items:

```txt
New Note
New Domain later
Paste Node later
Reset View
```

First-version priority:

- New Note
- Reset View

### 8.9 Drag Node

Node dragging and layout editing are not implemented in the static-loader prototype.

First version:

```txt
Do not drag nodes.
Do not write graph-layout.yaml.
Use graph-layout.yaml as the primary visual source.
Use generated JavaScript fallback only when a scope layout is missing.
```

Later:

```txt
Save positions to graph-layout.json.
```

### 8.10 Pan and Zoom

| Input | Behavior |
|---|---|
| Mouse wheel | Zoom |
| Drag empty canvas | Pan |
| Reset View | Fit graph to viewport |
| Focus Node | Animate viewport to node |

### 8.11 Graph Toolbar

Graph View should have a compact toolbar.

Recommended actions:

```txt
Search
New Node
New Link
Global
Local
Reset View
Fit
```

### 8.12 Local Graph Mode

When showing local graph of a node:

```txt
Show:
  current node
  parent nodes
  child nodes
  direct relation nodes

Hide:
  unrelated nodes
```

Breadcrumb example:

```txt
Global Graph / Graphics / Rendering Pipeline
```

Local graph is the focus scope. It should not show the full global graph.

### 8.13 PCB-Style Graph Rendering

Graph nodes must be square or rectangular technical modules.

Node titles and type/domain metadata must be inside the module.

Each module should expose connection ports:

- left
- right
- top
- bottom

Edges should render as PCB-style traces:

- 90-degree turns
- grid-aligned route points
- horizontal and vertical segments
- direct source port to target port contact

The SVG trace layer and node layer should share the same coordinate system in the static prototype.

Relation styles:

| Relation | Trace Style |
|---|---|
| contains | solid white or muted gray line |
| depends-on | solid yellow line with arrow |
| used-in | dashed purple or blue line |
| compares-with | paired or double orange line |

Semantic relations belong in `vault/graph.yaml`.

Visual node positions, port choices, board sizes, and trace routes live in `vault/graph-layout.yaml` when present.

## 9. Link Creation Interaction

First version should use a form-based link creation flow.

Do not implement drag-to-connect in the first version.

The current static-loader prototype displays the New Link form only. It does not write `graph.yaml`.

### 9.1 Add Link From Node

```txt
Right-click node
↓
Add Link From This Node
↓
Open New Link dialog
↓
Source is pre-filled
↓
User selects target
↓
User selects relation type
↓
Save
↓
Append to graph.yaml
↓
Refresh graph
```

### 9.2 Add Link To Node

```txt
Right-click node
↓
Add Link To This Node
↓
Open New Link dialog
↓
Target is pre-filled
↓
User selects source
↓
User selects relation type
↓
Save
↓
Append to graph.yaml
↓
Refresh graph
```

### 9.3 Link Validation

Before saving:

- source exists
- target exists
- source is not equal to target unless explicitly allowed later
- relation type is allowed
- duplicate edge does not exist

If invalid:

```txt
Show validation error
Do not write graph.yaml
```

## 10. Note View Interactions

Note View displays and edits one knowledge item.

### 10.1 Note View Structure

```txt
┌────────────────────────────────────────┐
│ Breadcrumb                             │
├────────────────────────────────────────┤
│ Note Toolbar                           │
│ [Read] [Edit] [Save] [Cancel] [Graph]  │
├────────────────────────────────────────┤
│ Note Content                           │
└────────────────────────────────────────┘
```

### 10.2 Read Mode

Default mode.

Shows rendered note content.

Actions:

- Edit
- Show in Graph
- Open file later
- Copy path later

### 10.3 Edit Mode

Edit mode directly modifies `note.md`.

First version:

```txt
Plain Markdown editor
No WYSIWYG
No split preview required
```

The current static-loader prototype displays `note.md` content but does not save edits.

Actions:

| Action | Behavior |
|---|---|
| Save | Write note.md |
| Cancel | Discard unsaved edits |
| Show in Graph | Guard if unsaved changes exist |

### 10.4 Save Behavior

```txt
Click Save
↓
Write content to note.md
↓
Update dirty state to false
↓
Return to Read mode or stay in Edit mode depending setting later
```

First-version decision:

```txt
After Save, return to Read mode.
```

### 10.5 Cancel Behavior

```txt
Click Cancel
↓
If content changed:
  show confirmation
If confirmed:
  discard changes
  return to Read mode
If canceled:
  stay in Edit mode
```

### 10.6 Show in Graph

```txt
Click Show in Graph
↓
If unsaved changes:
  show unsaved edit guard
Else:
  switch to Graph View
  show Focused Node Graph
  focus current node
```

### 10.7 Meta Editing

First version does not need full meta.yaml editing.

First version may display:

- title
- domain
- status
- summary

But editing meta.yaml can be added later.

## 11. New Note Interaction

New Note can be triggered from:

- top menu
- graph canvas context menu
- file tree context menu later

### 11.1 New Note Dialog

Fields:

| Field | Required | Default |
|---|---|---|
| Title | yes | empty |
| Domain | yes | current domain if available |
| ID | yes | auto-generated from title |
| Type | yes | concept |
| Status | yes | seed |
| Summary | no | empty |

### 11.2 New Note Creation

On confirm:

```txt
Create directory:
vault/content/<domain>/<id>/

Create:
meta.yaml
note.md
assets/
```

Default `note.md`:

```md
# <Title>

## 一句话定义

## 它解决什么问题？

## 核心直觉

## 正式解释

## 最小例子

## 常见误区

## 相关知识

## 复习问题
```

After creation:

```txt
Open Note View
Switch to Edit mode
```

## 12. Search Interaction

First version search can be simple.

### 12.1 Search Entry Points

- top menu Search
- graph toolbar search
- keyboard shortcut later

### 12.2 Search Scope

First version:

- note title
- note summary
- note ID
- domain

Later:

- note.md body
- custom blocks
- graph relations
- assets

### 12.3 Search Result Behavior

| Result Type | Click Behavior |
|---|---|
| Domain | Open domain graph |
| Concept | Open note |
| Graph node | Focus node in graph |

Search result item should show:

- title
- domain
- summary
- status

## 13. Keyboard Interaction

First version suggested shortcuts:

| Shortcut | Action |
|---|---|
| Ctrl + O | Open Vault |
| Ctrl + N | New Note |
| Ctrl + F | Search |
| Ctrl + S | Save note in Edit mode |
| Esc | Close menu / cancel selection |
| Enter | Open selected search result |

Shortcuts can be implemented after the basic UI is stable.

## 14. Unsaved Changes Policy

Dirty state should be tracked only for the currently edited note in the first version.

Dirty state is true when:

```txt
Edit mode content differs from original note.md
```

Before navigating away:

```txt
If dirty:
  show confirmation dialog
Else:
  navigate immediately
```

Confirmation options:

```txt
Save and leave
Discard and leave
Cancel
```

## 15. Error Handling

### 15.1 Vault Loading Error

If required files are missing:

```txt
Show:
  Invalid vault structure
  Missing file or directory name
```

### 15.2 File Save Error

If note.md cannot be saved:

```txt
Show error message
Keep editor content
Do not exit Edit mode
```

### 15.3 Graph Save Error

If graph.yaml cannot be updated:

```txt
Show error message
Do not update visual graph as saved
```

### 15.4 Parse Error

If YAML cannot be parsed:

```txt
Show parse error
Show file path
Disable graph editing until fixed
```

## 16. Mobile/Web Viewer Interactions

The mobile/web viewer is read-first.

### 16.1 Mobile Home

Shows:

- search
- domain cards
- recent notes
- review questions
- graph entry

### 16.2 Mobile Graph

Mobile should show only local graph.

Default scope:

```txt
current node
parent nodes
child nodes
strong related nodes
```

### 16.3 Mobile Note Page

Actions:

- read content
- open related notes
- open local graph
- search
- review questions

No editing in the first version.

## 17. First-Version Interaction Scope

Implement:

- Static vault loading from repository `vault/`
- File Tree
- Breadcrumb
- Global Graph
- Domain Graph
- Focused Node Graph generated from edges
- Single-click node
- Double-click node
- Right-click node menu
- New Note
- New Link form
- Note Read mode
- Note Edit mode
- Show in Graph

Do not implement yet:

- Tauri Open Vault picker
- note save
- graph write
- graph-layout write
- fixed right inspector
- drag-to-connect link creation
- node dragging / layout editing
- rich WYSIWYG editor
- meta.yaml visual editor
- full Git UI
- AI suggestion panel
- mobile editing
- advanced graph layout persistence
- multi-vault management

## 18. Implementation Notes

Recommended UI component structure:

```txt
src/
├─ components/
│  ├─ layout/
│  │  ├─ TopMenu.vue
│  │  ├─ FileTree.vue
│  │  └─ WorkspaceLayout.vue
│  ├─ navigation/
│  │  └─ BreadcrumbBar.vue
│  ├─ graph/
│  │  ├─ GraphView.vue
│  │  ├─ GraphToolbar.vue
│  │  └─ NodeContextMenu.vue
│  ├─ note/
│  │  ├─ NoteView.vue
│  │  ├─ NoteToolbar.vue
│  │  └─ NoteEditor.vue
│  └─ dialogs/
│     ├─ NewNoteDialog.vue
│     └─ NewLinkDialog.vue
```

Recommended graph logic files:

```txt
src/graph/
├─ graph-data.js
├─ graph-theme.js
├─ graph-layout.js
├─ graph-interactions.js
└─ graph-filter.js
```

Recommended app state:

```txt
currentVaultPath
currentView
currentGraphContext
currentNoteId
selectedNodeId
dirtyNoteState
recentItems
```

## 19. Summary

The first version interaction design is:

```txt
Open or restore vault
↓
Use file tree to browse physical structure
↓
Use graph view to understand and edit relationships
↓
Use note view to read and edit knowledge content
↓
Use breadcrumb to move between graph levels
↓
Use Git and AI workflows later for maintenance support
```
