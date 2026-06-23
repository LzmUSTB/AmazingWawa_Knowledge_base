# Desktop Maintenance MVP

## Purpose

This stage turns the desktop prototype into a local maintenance tool while keeping the vault as plain files.

## Desktop Vault Adapter

Desktop-specific file access is isolated in:

```txt
apps/desktop/src/data/desktop-vault-adapter.js
```

Vue components should not call Tauri filesystem APIs directly.

The adapter owns opening a vault folder, reading vault files, normalizing raw text through `knowledge-core`, writing `note.md`, writing `graph.yaml` relation links, writing `graph-layout.yaml`, and remembering the last opened vault path.

## Startup Loading

Startup attempts to load the last opened vault path from `localStorage`.

If that fails, the app tries the repository `./vault` through Tauri filesystem APIs.

If no real vault can be loaded, the app shows `No Vault Loaded`.

There is no static sample vault and no mock graph fallback.

## Active Vault Setup Flow

```txt
Vault Setup
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

Read mode displays `note.md` from the normalized vault. Edit mode shows raw Markdown in a textarea.

Save writes:

```txt
vault/content/<domain>/<id>/note.md
```

After save, the app reloads the vault from disk, replaces the active vault without navigation reset, and stays on the current note page.

## New Note Flow

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

## Right Relation Sidebar + Add Link

The right relation sidebar is implemented as the node context surface.

It supports:

```txt
selected node summary
open note / show local graph
hierarchy inspection
direct relation inspection
Add Link
```

Add Link writes one of:

```txt
depends-on
used-in
compares-with
```

It must not write `contains`.

## Layout Edit Mode

Layout editing supports:

```txt
Edit Layout mode
node dragging
Ctrl + left drag shortcut
Save Layout to graph-layout.yaml board.nodes
Cancel Layout
generated orthogonal routes from node positions
Ctrl + wheel UI font scale
```

Generated routes are not written. Manual routes connected to moved nodes may be removed/bypassed if stale.

## Current Next Stage

Next stage is Content Block Renderer.

It should:

```txt
parse custom ::: blocks in note.md
render concept-card / process-flow / compare-table / code-explain / quiz / expression-visualizer
improve plain Markdown document typography
keep edit mode as raw textarea
```

It should not implement rich-text editing, AI panel, Git panel, or arbitrary JavaScript expression evaluation.
