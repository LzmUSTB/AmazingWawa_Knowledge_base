# Architecture

## Project Type

Local-first knowledge graph system.

The system is designed to support:

- desktop-based maintenance
- mobile/web-based viewing
- Git-based version management
- ChatGPT/Codex-assisted content maintenance

## Layers

### 1. Vault Layer

The vault is the source of truth.

It contains:

- Markdown knowledge pages
- YAML metadata
- graph relationship data
- images and other assets
- templates

Expected structure:

```txt
vault/
├─ content/
├─ graph.yaml
├─ domains.yaml
├─ assets/
└─ templates/
```

### 2. Desktop Maintenance Layer

The desktop app is responsible for maintaining the vault.

Stack:

- Tauri
- Vue
- JavaScript
- Vite
- Cytoscape.js

Expected responsibilities:

- select or open a vault
- read `meta.yaml`
- read `note.md`
- read `graph.yaml`
- display the knowledge graph
- open and edit knowledge pages
- search local content
- manage Git status, commits, and pushes in later phases

### 3. Mobile/Web Viewer Layer

The viewer is responsible for reading and browsing the knowledge base on mobile and web.

Stack:

- Vite
- Vue
- JavaScript
- Cytoscape.js
- PWA in a later phase

Expected responsibilities:

- display knowledge pages
- provide search
- display local graph views
- provide mobile-friendly reading experience

The mobile viewer should be read-first. Full maintenance should remain on the desktop app.

### 4. Shared Logic Layer

Shared logic lives under `packages/`.

Expected packages:

```txt
packages/
├─ knowledge-core/
├─ graph-core/
└─ content-renderer/
```

Responsibilities:

- parse knowledge metadata
- validate graph relations
- normalize content data
- provide shared constants
- provide shared rendering helpers

## Source of Truth

The source of truth is always `vault/`.

Desktop and viewer apps should read from `vault/`, not own the knowledge data.

## Data Flow

```txt
vault/
  ↓
shared packages
  ↓
desktop app / viewer app
```

## Graph Design

The graph is an index layer, not a content layer.

It should answer:

- Where is this knowledge located?
- What does it depend on?
- What is it used in?
- What should it be compared with?

Allowed relation types:

- `contains`
- `depends-on`
- `used-in`
- `compares-with`

## Content Design

The content page is the explanation layer.

Each knowledge item should use:

```txt
vault/content/<domain>/<concept-id>/
├─ meta.yaml
├─ note.md
└─ assets/
```

## Technology Policy

Use JavaScript as the default implementation language.

Avoid TypeScript unless explicitly decided later.

## Git Policy

Commit these files:

- `package-lock.json`
- `Cargo.lock`
- `vault/**/*.md`
- `vault/**/*.yaml`
- source code
- docs

Do not commit:

- `node_modules/`
- build output
- temporary files
- private data
- large raw datasets
- raw videos
- checkpoints
