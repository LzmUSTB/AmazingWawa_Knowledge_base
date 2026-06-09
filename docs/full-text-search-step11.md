# Step 11: Full-text Search

## Purpose

Step 11 implements Full-text Search inside the existing Search Overlay.

Search Overlay has two modes:

```txt
Quick:
  structured graph search

Full-text:
  note.md content search
```

Step 11 implements Full-text mode. It does not implement Recent, Pin, search history, AI search, or semantic search.

## Data Source

Full-text Search reads from the loaded active vault:

```txt
getActiveVault().notes
```

Each note entry contains:

```txt
node id
note.md markdown
```

Node metadata is used for display:

```txt
title
id
domain
type
summary
```

## Search Scope

Full-text Search includes:

```txt
plain Markdown headings
plain Markdown paragraphs
lists
code fences
concept-card text
process-flow labels/descriptions
compare-table columns/rows/cells
code-explain code/explain/line explanations
quiz question/answer/options
expression-visualizer title/formula
```

It excludes:

```txt
assets
images
graph-layout.yaml
node coordinates
localStorage
Git data
binary files
```

## Result Model

Full-text results are snippet-level results.

```txt
node title
node id / domain / type
section or block type
snippet around match
```

Example:

```txt
SPH
sph / simulation / concept
GPU 邻居搜索
...空间划分可以把邻居查询限制在局部 cell，避免 O(n²) 成本...
```

## Actions

```txt
Enter:
  open matching note

Shift + Enter:
  open local graph for matching node
```

No scroll-to-match inside the note is required in Step 11.

## Empty Query

Full-text empty query shows a hint only:

```txt
Type text to search note.md contents and content blocks.
```

Recent and Pin are Step 12.

## Implementation Notes

Use simple dependency-free matching:

```txt
case-insensitive includes
whitespace term split
simple Chinese/Japanese includes
no fuzzy library
no regex mode
no pinyin search
```

Use `parseNoteBlocks` where practical to extract content block text.

Do not evaluate arbitrary expressions or code.

## Acceptance

```txt
Full-text finds note body text
Full-text finds content block text
Full-text result snippets are readable
Full-text snippets never show [object Object]
Quick Search still works
No TypeScript is introduced
```
