# Codex Task: Build Static UI Prototype

## Goal

Implement a static first-version UI prototype for the desktop app.

Do not implement real file system access yet.

Do not implement real Cytoscape graph data loading yet.

The goal is to establish layout, visual style, and component structure.

## Source Documents

Read these files first:

- `docs/ui-ux-plan.md`
- `docs/visual-style-guide.md`
- `docs/interaction-spec.md`
- `design/theme-tokens.json`
- `AGENTS.md`

## Tech Policy

Use JavaScript, not TypeScript.

Use Vue.

Do not introduce TypeScript files.

## Implement in

```txt
apps/desktop/
```

## Required Components

Create or organize components like this:

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

## Static UI Requirements

The prototype should show:

1. Top menu
2. Left file tree
3. Breadcrumb bar
4. Graph workspace placeholder
5. Note view placeholder
6. New note dialog placeholder
7. New link dialog placeholder

## Visual Style

Use the visual direction from `visual-style-guide.md`:

- black-and-white technical monitor UI
- thin white borders
- subtle grid background
- sparse domain accent colors
- sharp panels
- no heavy rounded SaaS style

## Interaction Simulation

The static prototype should support fake state switching:

- click a file tree domain -> show graph view
- click a fake graph node -> select node
- double-click a fake graph node -> show note view
- click Edit -> show edit mode
- click Show in Graph -> return to graph view
- click New Note -> show dialog
- click New Link -> show dialog

No real file writing is required in this task.

## Do Not Implement Yet

- real Tauri file system access
- real graph.yaml parsing
- real note.md editing and saving
- real Git panel
- AI panel
- mobile viewer
- drag-to-connect
