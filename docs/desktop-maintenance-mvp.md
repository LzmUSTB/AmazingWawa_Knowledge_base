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

Read mode displays `note.md` from the normalized vault.

Edit mode shows raw markdown in a textarea.

Save writes:

```txt
vault/content/<domain>/<id>/note.md
```

After save, the app reloads the vault from disk and calls `setActiveVault(updatedVault)`.

## Dirty-State Guard

Dirty means:

```txt
draftMarkdown !== original note.md markdown
```

The app asks for confirmation before opening another note, switching graph scope, switching to graph, clicking another file tree item, or opening another vault.

## Static Fallback

Startup attempts to load the last opened vault path from `localStorage`.

If that fails, the app loads the repository sample vault through `static-vault-loader.js` and logs a console warning.

## Responsive Desktop Layout

The desktop shell must work at half-screen width.

Rules:

- no horizontal app overflow
- workspace uses `minmax(0, 1fr)`
- graph and note surfaces can shrink
- toolbars may wrap or scroll horizontally
- note content wraps or scrolls locally inside blocks

## Collapsible Sidebar

The Vault sidebar can be hidden and restored.

Preference key:

```txt
amazingwawa.sidebarCollapsed
```

If there is no saved preference and initial width is below `1000px`, the sidebar starts collapsed.

## Graph Fit Behavior

`Fit` fits the current scope into the visible graph viewport.

The old `Reset View` button was removed because it duplicated `Fit`.

Viewport resize uses debounced camera fitting. This changes only camera pan/zoom and never mutates node positions, route points, or `graph-layout.yaml`.

## Not Included Yet

Do not implement in this stage: real New Note creation, real New Link writing, graph editing, layout saving, node dragging, route editing, drag-to-connect, Git panel, AI panel, or mobile editing.
