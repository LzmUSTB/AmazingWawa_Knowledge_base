# Desktop Maintenance MVP

## Purpose

This stage turns the desktop prototype into a local maintenance tool while keeping the vault as plain files.

## Desktop Vault Adapter

Desktop-specific file access is isolated in:

```txt
apps/desktop/src/data/desktop-vault-adapter.js
```

Vue components should not call Tauri filesystem APIs directly.

The adapter owns opening a vault folder, reading vault files, normalizing raw text through `knowledge-core`, writing `note.md`, remembering the last opened vault path, and falling back to the static sample vault.

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

After save, the app reloads the vault from disk and calls `setActiveVault(updatedVault)`.

## Static Fallback

Startup attempts to load the last opened vault path from `localStorage`. If that fails, the app may load the repository sample vault through `static-vault-loader.js` as read-only fallback.

## Responsive Desktop Layout

Rules:

- no horizontal app overflow
- workspace uses `minmax(0, 1fr)`
- graph and note surfaces can shrink
- toolbars may wrap or scroll horizontally
- note content wraps or scrolls locally inside blocks

## Collapsible Sidebar

Preference key:

```txt
amazingwawa.sidebarCollapsed
```

## Graph Fit Behavior

`Fit` fits the current scope into the visible graph viewport. `Reset View` was removed.

## Step 5 Update

- FileTree no longer shows static `graph.yaml`, `domains.yaml`, or `assets/` buttons.
- Note View no longer shows the debug Vault structure block.
- Graph View no longer shows the static `PORT ROUTED / STATIC BOARD` label.
- Search and Settings are hidden until implemented.
- Git remains visible but disabled.
- New Link remains prototype-only and does not write `graph.yaml`.
- TopMenu title comes from `vault.yaml`.
- FileTree displays human titles with IDs as secondary labels.

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

`graph-layout.yaml` is not written in this phase.

## Next Stage: Layout Edit Mode

The next stage adds manual node placement:

```txt
Edit Layout mode
node dragging
Ctrl + left drag shortcut
Save Layout to graph-layout.yaml board.nodes
Cancel Layout
generated orthogonal routes from node positions
Ctrl + wheel UI font scale
```

It should not implement manual route editing, route point dragging, drag-to-connect, New Link writing, Git panel, or AI panel.
