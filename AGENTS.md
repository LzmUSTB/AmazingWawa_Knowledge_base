# AGENTS.md

## Project Purpose

This repository is a local-first knowledge graph system.

The source of truth is the currently selected external active Vault directory.
The repository-local ignored `vault/` is only an optional development fixture.

## Core Rules

1. Do not mix graph index data and long-form content.
2. Knowledge content lives in `<active-vault>/content/`.
3. Graph relationships live in `<active-vault>/graph.yaml`.
4. Domain metadata lives in `<active-vault>/domains.yaml`.
5. Only important index-level relationships should be added to the graph.
6. Use JavaScript, not TypeScript, unless the project policy changes later.
7. Prefer plain files that are easy to inspect, edit, diff, and version through Git.

## Knowledge Item Structure

Each concept should use this structure:

```txt
<active-vault>/content/<domain>/<concept-id>/
├─ meta.yaml
├─ note.md
└─ assets/
```

## Allowed Relation Types

Use only these relation types in `vault/graph.yaml`:

- `contains`
- `depends-on`
- `used-in`
- `compares-with`

## Content Guidelines

Each knowledge page should aim to include:

1. A one-sentence definition
2. The problem it solves
3. Core intuition
4. Formal explanation
5. Minimal example
6. Common mistakes
7. Related knowledge
8. Review questions

## Privacy

Do not commit private or sensitive information.

Do not add:

- personal certificates
- transcripts
- private emails
- company-specific interview details
- contracts
- confidential work materials
- unpublished business information
- personal identification documents

## AI Maintenance Guidelines

When adding or editing knowledge content:

1. Create or update `meta.yaml`.
2. Create or update `note.md`.
3. Add graph edges only when the relation is structurally important.
4. Do not add weak or noisy relations.
5. Keep filenames and IDs stable.
6. Prefer clear, searchable names.
7. Keep generated content concise and maintainable.
