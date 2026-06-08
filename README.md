# Knowledge System

A local-first knowledge graph system.

## Goal

This project aims to build a knowledge system that supports:

- desktop maintenance
- mobile/web viewing
- Git-based version management
- graph-based knowledge navigation
- ChatGPT/Codex-assisted content maintenance

## Structure

```txt
vault/                 Knowledge source files
apps/desktop/          Tauri desktop maintenance app
apps/viewer/           Mobile/web static viewer
packages/              Shared parsing and rendering logic
docs/                  Architecture and design documents
```

## Development

```bash
npm install
npm run dev:desktop
npm run dev:viewer
```

## Current Stack

- npm workspaces
- Tauri
- Vue
- JavaScript
- Vite
- Cytoscape.js
- Markdown
- YAML
- Git

## Source of Truth

The source of truth is the `vault/` directory.

Applications should read from `vault/`, but the knowledge data itself should remain plain files that can be managed by Git.
