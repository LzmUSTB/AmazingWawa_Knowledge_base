# Desktop Maintenance MVP

## Purpose

This stage turns the desktop prototype into a local maintenance tool while keeping the vault as plain files.

## Desktop Vault Adapter

Desktop-specific file access is isolated in:

```txt
apps/desktop/src/data/desktop-vault-adapter.js
```

Vue components should not call Tauri filesystem APIs directly.

The adapter owns opening a vault folder, reading vault files, normalizing raw text through `knowledge-core`, writing `note.md`, writing `graph-layout.yaml`, creating new note folders, and remembering the last opened vault path.

## Startup Loading

Startup attempts to load:

```txt
last opened vault path from localStorage
-> repository ./vault through Tauri filesystem APIs
-> No Vault Loaded screen if no real vault can be loaded
```

There is no mock graph fallback and no static sample vault. Repository `./vault` is the default real vault.

## Open Vault Flow

```txt
Open Vault
-> choose local folder
-> validate required files
-> load vault files
-> normalize vault
-> setActiveVault()
-> reset to root graph
-> fit graph viewport
```

Required files are `vault.yaml`, `domains.yaml`, `graph.yaml`, and `content/`.

## Note Editing Flow

Read mode displays `note.md` from the normalized vault. Edit mode shows raw markdown in a textarea. Save writes `vault/content/<domain>/<id>/note.md`.

After save, the app reloads the vault from disk, replaces the active vault without navigation reset, stays on the same Note page, clears dirty state, and returns to Read mode.

## New Note Creation Flow

New Note creation is real:

```txt
New Note form
-> create content/<domain>/<id>/
-> write meta.yaml
-> write note.md
-> create assets/
-> append one contains edge to graph.yaml
-> reload vault
-> open new note in Edit mode
```

## Layout Edit Flow

Layout editing is real:

```txt
Edit Layout mode
-> node dragging or Ctrl + left drag
-> Save Layout writes current scope board.nodes to graph-layout.yaml
-> reload vault without navigation reset
-> stay in current graph scope
-> exit Layout Edit Mode
```

Generated route points are not written. Manual routes connected to moved nodes are removed so generated fallback routes reconnect after reload.

## Responsive Desktop Layout

Rules:

- no horizontal app overflow
- workspace uses `minmax(0, 1fr)`
- graph and note surfaces can shrink
- toolbars may wrap or scroll horizontally
- note content wraps or scrolls locally inside blocks

## Collapsible Left Sidebar

Preference key:

```txt
amazingwawa.sidebarCollapsed
```

## Graph Fit Behavior

`Fit` fits the current scope into the visible graph viewport. `Reset View` was removed.

## Current UI Status

- FileTree no longer shows static `graph.yaml`, `domains.yaml`, or `assets/` buttons.
- Note View no longer shows the debug Vault structure block.
- Search and Settings are hidden until implemented.
- Git remains visible but disabled.
- TopMenu title comes from `vault.yaml`.
- FileTree displays human titles with IDs as secondary labels.
- FONT indicator displays current UI font scale.
- Legacy global New Link buttons still exist before Step 7 and are prototype-only.

## Next Stage: Right Relation Sidebar + Add Link

The next stage replaces global `New Link` and floating `NodeContextMenu` with a collapsible right sidebar.

```txt
Right Relation Sidebar
-> current node actions
-> hierarchy section
-> relations section
-> Add Link form
-> write depends-on / used-in / compares-with edges to graph.yaml
```

It should not implement relation deletion, relation editing, drag-to-connect, Git panel, AI panel, content block renderer, or manual route editing.
