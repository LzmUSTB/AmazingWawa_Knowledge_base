# Step 12: Back / Forward Navigation

## Purpose

Add browser-like navigation history for moving through notes and graph scopes.

## Shortcuts

```txt
Alt + Left:
  Back

Alt + Right:
  Forward
```

Keyboard-only is sufficient for the first version.

## Navigation Entry

A navigation entry stores:

```txt
view
graphScopeId
selectedNodeId
currentNoteId
currentDomain
noteMode: read
```

Do not store:

```txt
dialogs
SearchOverlay state
Note local find query
dirty edit state
layout edit draft
```

## Dirty Guard

Back/Forward must respect the existing dirty guard.

If the current note has unsaved edits or the layout draft is dirty, ask before navigating away.

## History Behavior

```txt
normal navigation:
  push current state to back stack
  clear forward stack

back:
  push current state to forward stack
  restore previous state

forward:
  push current state to back stack
  restore next state
```

Applying a history entry must not push another history entry.

## Non-goals

Do not implement:

```txt
browser native history integration
persistent route URL
history UI timeline
vault file changes
```
