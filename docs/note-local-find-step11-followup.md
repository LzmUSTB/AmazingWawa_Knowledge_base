# Step 11 Follow-up: Note Local Find

## Purpose

The Note local find feature provides browser/editor-like search inside the currently opened note.

It is separate from Search Overlay:

```txt
Search Overlay:
  search across the vault

Note local find:
  search inside the current note view
```

## Shortcut

```txt
Ctrl + F:
  open local find box when current view is Note read mode
```

Do not intercept Ctrl+F in note edit textarea.

## UI

The find box appears in the top-right of the note viewport.

```txt
[ query input        ] [ 1/34 ] [ ↑ ] [ ↓ ] [ × ]
```

Visual style:

```txt
hard-edged panel
black/elevated background
no glassmorphism
no blur
compact browser/editor-like control
```

## Behavior

```txt
Enter:
  next match

Shift + Enter:
  previous match

↑:
  previous match

↓:
  next match

Esc or ×:
  close find box and clear highlights
```

## Highlighting

Local find highlights all visible matches in read mode.

The current match receives stronger visual emphasis and is scrolled into view.

It searches:

```txt
Markdown headings
paragraphs
lists
code fences
concept-card
process-flow
compare-table
code-explain
quiz
expression-visualizer
```

## Full-text Search Integration

When a Full-text Search result is selected from Search Overlay:

```txt
open matching note
open Note local find
copy the full-text query into the local find input
highlight matches
select the first match
```

If the user uses Shift+Enter from the full-text result to open local graph, the note find box should not be opened.

## Interactive Blocks

If a query matches an interactive block item:

```txt
process-flow:
  select the first matching flow node if possible

code-explain:
  select the first matching code line if possible
```

This makes the displayed detail panel correspond to the searched text.
