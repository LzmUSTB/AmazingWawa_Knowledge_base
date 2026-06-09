# Full-text Search Jump Addendum

## Behavior

Selecting a full-text result should not merely open the note.

It should also open local find inside the note using the full-text query.

```txt
Full-text result click / Enter:
  open note
  open local find
  set find query
  highlight matches
  scroll to first match
```

```txt
Full-text result Shift+Enter:
  open local graph
  do not open local find
```

## Result Data

SearchOverlay should pass the active query along with the selected result.

Example payload:

```txt
{
  result,
  localGraph,
  query
}
```

App-level navigation can then pass the query into NoteView through props such as:

```txt
noteFindQuery
noteFindOpenKey
```
