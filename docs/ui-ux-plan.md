# UI/UX Plan

## 1. Product Direction

This project is a local-first knowledge graph system.

The desktop app is the main maintenance environment. It should support browsing, editing, creating, and connecting knowledge nodes.

The mobile/web viewer is mainly for reading, reviewing, and searching. It should not try to provide the full maintenance experience in the first version.

Core principle:

```txt
Desktop = maintain and edit
Mobile/Web = read and review
Vault = source of truth
Graph = knowledge relationship index
Note = knowledge explanation page
```

## 2. Main Window Structure

The first version should use a simple two-column layout:

```txt
┌─────────────────────────────────────────────────────────┐
│ Top Menu                                                │
├────────────────┬────────────────────────────────────────┤
│ File Tree      │ Breadcrumb                             │
│                ├────────────────────────────────────────┤
│ vault/         │ Main Workspace                         │
│ ├ graphics     │                                        │
│ ├ ml           │ Graph View / Recent View / Note View   │
│ ├ web-dev      │                                        │
│ └ career       │                                        │
└────────────────┴────────────────────────────────────────┘
```

The right-side panel should not be fixed in the first version.

Optional right-side panels can be added later as drawers or floating inspectors:

- Node Inspector
- Metadata Inspector
- Related Notes
- Git Diff
- AI Suggestions

## 3. Top Menu

The top menu is for application-level actions.

Recommended first-version menu items:

```txt
Vault Setup
New Note
New Link
Search
Git
Settings
```

### Top Menu Responsibilities

| Item | Purpose |
|---|---|
| Vault Setup | Configure or replace the active vault |
| New Note | Create a new knowledge node |
| New Link | Create a graph relation between two nodes |
| Search | Open global search |
| Git | Open Git status view |
| Settings | App settings, theme, graph behavior |

The top menu should remain compact. It should not become the main navigation system.

## 4. Left File Tree

The left file tree shows the physical structure of the vault.

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
├─ web-dev
│  ├─ nuxt
│  └─ cloudflare-pages
└─ career
   └─ technical-interview
```

The file tree represents where knowledge is stored.

The graph view represents how knowledge is related.

These two structures should remain separate:

```txt
File Tree = physical organization
Graph View = conceptual relationship
Note View = content explanation
```

### File Tree Behaviors

| Action | Behavior |
|---|---|
| Click domain folder | Show the domain-level graph in the main workspace |
| Click concept folder | Open the concept note |
| Click graph.yaml | Later: open graph relation editor |
| Click domains.yaml | Later: open domain settings |
| Click assets folder | Later: open asset manager |

## 5. Main Workspace

The main workspace is the center of the app.

It has three main states:

1. Graph View
2. Recent View
3. Note View

## 6. Startup Behavior

When the app opens:

```txt
Open app
↓
Check whether a recent vault exists
↓
If no vault exists:
  show Vault Setup screen
If vault exists:
  load vault
↓
Check last session state
↓
If last session was a graph:
  restore that graph view
If last session was a note:
  restore that note view
If no session state exists:
  show global graph
```

This supports the user's expectation that the app should reopen the graph or note that was active before closing.

## 7. Breadcrumb Bar

The breadcrumb bar is fixed at the top of the main workspace.

It represents the current conceptual location, not only the file path.

Examples:

```txt
Global Graph / Graphics
Global Graph / Graphics / Rendering Pipeline
Graph / Machine Learning / Reinforcement Learning / SAC
```

### Breadcrumb Behaviors

| Click Target | Behavior |
|---|---|
| Global Graph | Return to the full graph |
| Domain name | Show the domain graph |
| Concept name | Stay on or open the concept note |
| Back to Graph | Return to graph view and focus the current node |
| Parent level | Navigate to the parent graph context |

The breadcrumb should be available in both Graph View and Note View.

## 8. Graph View

Graph View is the main conceptual navigation space.

It can show:

1. Root graph
2. Domain graph
3. Focused node graph
4. Recently opened graph
5. Last session graph

The graph must be scope-based.

Do not show all knowledge levels at the same time.

Root graph shows only same-level top domain nodes.

Domain graph shows one center domain and its direct child nodes.

Focus graph shows the current node, parent node, and direct related nodes.

Concept grandchildren are not shown in domain scope.

The graph should feel like a hierarchical PCB-style knowledge map, not a free-form network.

### Graph Scope Plan

| Scope | Primary Job | Display Rule |
|---|---|---|
| Root | Choose a domain | Domains only |
| Domain | Browse direct children | Center domain plus child modules |
| Focus | Inspect one concept locally | Current node plus parent and direct relations |

Breadcrumb examples:

```txt
Global Graph
Global Graph / Graphics
Global Graph / Graphics / Rendering Pipeline
```

Clicking `Global Graph` returns to root scope.

Clicking a domain node or domain folder enters that domain scope.

Clicking a concept folder opens Note View.

### PCB Graph Visual Plan

Graph nodes should be square or rectangular modules.

Do not use circular graph nodes.

Node labels must be inside the node.

Each node should show:

- title
- small type/domain metadata
- domain accent marker
- explicit left/right/top/bottom ports

Graph edges should be PCB-style traces:

- hard-edged SVG paths
- 90-degree turns
- grid-aligned route points
- direct port-to-port contact
- relation-specific line style

Use `graph.yaml` for semantic relations.

Later use `graph-layout.yaml` for visual positions, port choices, and trace routes.

The visual style must avoid glow, bloom, soft neon gradients, and blurred colored shadows.

Accent colors are solid signal colors only.

### Graph View Layout

```txt
┌────────────────────────────────────────┐
│ Breadcrumb                             │
├────────────────────────────────────────┤
│ Graph Toolbar                          │
│ [Search] [New Node] [New Link] [Mode]  │
├────────────────────────────────────────┤
│ Cytoscape Graph Canvas                 │
│                                        │
│ Nodes / Edges / Labels                 │
│                                        │
└────────────────────────────────────────┘
```

### Graph View First-Version Interactions

| Action | Behavior |
|---|---|
| Click domain node in root graph | Enter that domain graph |
| Single-click concept node | Select node and highlight one-hop neighbors |
| Double-click domain node | Enter that domain graph |
| Double-click concept node | Open the corresponding note page |
| Right-click node | Open node context menu |
| Right-click empty area | Create a new node |
| Drag node | Move node |
| Scroll | Zoom graph |
| Drag canvas | Pan graph |
| Click empty area | Clear selection |
| Search node | Focus and highlight node |

### Node Context Menu

Recommended actions:

```txt
Open Note
Edit Note
Add Link From This Node
Add Link To This Node
Rename Node
Delete Node
Show Local Graph
```

For the first version, prioritize:

```txt
Open Note
Add Link
Show Local Graph
```

### New Link UX

First version should avoid direct drag-to-connect because it is more complex to implement reliably.

Recommended first-version flow:

```txt
Right-click node
↓
Add Link
↓
Select target node
↓
Select relation type
↓
Save to graph.yaml
```

Drag-to-connect can be added later.

The New Link dialog should show relation line previews:

- CONTAINS: solid line
- DEPENDS-ON: arrow line
- USED-IN: dashed line
- COMPARES-WITH: paired or double line

The dialog should state that confirmed semantic relations are written to `graph.yaml`.

## 9. Note View

When the user opens a note, the main workspace switches from Graph View to Note View.

Recommended layout:

```txt
┌────────────────────────────────────────┐
│ Breadcrumb                             │
├────────────────────────────────────────┤
│ Note Toolbar                           │
│ [Read] [Edit] [Save] [Cancel] [Graph]  │
├────────────────────────────────────────┤
│ Note Content                           │
│                                        │
│ Markdown-rendered content or editor    │
│                                        │
└────────────────────────────────────────┘
```

### Note View Modes

| Mode | Purpose |
|---|---|
| Read | Default reading mode |
| Edit | Edit note.md directly |
| Preview | Later: split edit and preview |
| Meta | Later: edit meta.yaml |

First version should implement only:

```txt
Read
Edit
Save
Cancel
Show in Graph
```

### Note View Behaviors

| Action | Behavior |
|---|---|
| Open note | Display note in Read mode |
| Click Edit | Switch to Edit mode |
| Save | Write changes to note.md |
| Cancel | Discard unsaved changes |
| Show in Graph | Return to graph and focus current node |
| Click breadcrumb domain | Show the domain graph |

## 10. Recent View

Recent View appears when the app restores a previous session or no graph context is selected.

It may show:

- Recently opened notes
- Recently edited notes
- Recently opened graphs
- Inbox items
- Quick actions

First-version Recent View can be very simple:

```txt
Recent Notes
Recent Graphs
Open Global Graph
Open Inbox
```

## 11. Right Panel Policy

Do not add a fixed right panel in the first version.

Reason:

- Graph View needs visual space.
- Note View needs reading width.
- Fixed right panels easily become cluttered.
- Inspector panels can be added later without changing the main layout.

Later optional panels:

```txt
Node Inspector
Meta Inspector
Related Notes
Git Diff
AI Suggestions
```

Recommended later behavior:

```txt
Open as drawer
Open as floating panel
Close automatically when not needed
```

## 12. Desktop First-Version Scope

First version should include:

- Top menu
- Left file tree
- Main workspace
- Breadcrumb bar
- Global graph view
- Domain graph view
- Note read mode
- Note edit mode
- Basic node creation
- Basic link creation
- Session restoration

First version should not include:

- Fixed right inspector
- Drag-to-connect links
- Complex Git diff UI
- AI suggestion panel
- Multi-window editing
- Rich WYSIWYG editor
- Mobile editing

## 13. Mobile/Web Viewer Direction

The mobile/web viewer should be read-first.

Main pages:

```txt
Home
Search
Domain
Local Graph
Note Page
Review
```

Mobile viewer priorities:

- Fast search
- Clean reading
- Local graph only
- Review questions
- Responsive typography
- Offline/PWA later

Mobile should not show the full global graph by default.

Recommended mobile graph scope:

```txt
Current node
Parent node
Child nodes
Strong related nodes
```

Mobile Local Graph should use rectangular modules and port-connected PCB traces.

It should show only a small local set:

- current node
- parent node
- two or three related nodes
- one or two child nodes

Mobile remains read-first and should not expose editing in the first version.

## 14. Product Summary

The first version UI should be defined as:

```txt
Top Menu
+ Left File Tree
+ Main Workspace
  + Breadcrumb
  + Graph View
  + Note View
```

The product should feel like a knowledge IDE:

- File tree for storage structure
- Graph workspace for relationship editing
- Note page for content editing
- Git and AI support in later phases
