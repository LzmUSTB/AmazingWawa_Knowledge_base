# Step 9: Search Overlay + Quick Search

## Purpose

Step 9 introduces a unified search overlay that will be reused by both Quick Search and future Full-text Search.

Step 9 implements Quick Search only. Full-text Search is a placeholder in this step.

## Shortcut

```txt
Ctrl + Q:
  open / close Search Overlay

Esc:
  close Search Overlay

Tab:
  toggle Quick / Full-text mode

ArrowUp / ArrowDown:
  move result selection

Enter:
  execute primary action

Shift + Enter:
  open local graph when supported
```

## UI Layout

The overlay covers the whole app with a dark background dim.

The search panel is horizontally centered and positioned slightly above the screen center.

```txt
[input bar ----------------------][ QUICK | FULL-TEXT ]
[results ------------------------------------------------]
```

Visual rules:

```txt
hard-edged technical HUD
black panel
white/muted borders
no glassmorphism
no blur
no large rounded corners
```

## Modes

### Quick

Quick mode searches structured vault data:

```txt
node id
node title
aliases
domain
type
status
summary
tags
domain id/title/description
relation source/target/relation
```

Quick mode does not search `note.md` body.

### Full-text

Full-text mode is a placeholder in Step 9.

```txt
Full-text search is planned.
It will search note.md contents and content blocks in a later step.
```

No full-text index or note body scan should be implemented in Step 9.

## Empty Query

Step 9 empty query shows only a hint.

```txt
Type a node title, id, domain, summary, tag, or relation endpoint.
```

Recent and Pinned are Step 12, not Step 9.

## Result Groups

```txt
NODES
RELATIONS
DOMAINS
```

Recommended limits:

```txt
nodes: 8
relations: 6
domains: 4
total: about 18
```

## Actions

Node result:

```txt
Enter / click:
  open note

Shift + Enter:
  open local graph
```

Domain result:

```txt
Enter / click:
  open domain graph
```

Relation result:

```txt
Enter / click:
  open source node local graph
```

The overlay should close after a successful navigation action.
