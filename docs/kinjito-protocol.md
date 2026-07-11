# Kinjito protocol 1.0.0

`@kinjito/protocol` is the only executable source of truth for Vault,
ExerciseSet, proposal, validation, diff/apply-plan, and `.wawapkg` behavior.
Desktop and integrations consume its public ESM exports.

## `.wawapkg` 1.1 contract

- ZIP mimetype: `application/x-wawa-kb-ai-import-package`.
- `mimetype`, `manifest.yaml`, `sources.yaml`, and `patch.yaml` are required.
- `manifest.yaml` uses `packageFormat: wawapkg`, `packageKind: import`, and
  `schemaVersion: "1.1"` (numeric `1.1` remains accepted for compatibility).
- Operations: `add_domain`, `add_node`, `append_note_section`,
  `append_exercise_set`, `add_edge`, `add_block_type`, and
  `propose_native_block`.
- A node may contain either `note.md`, `note.html`, or no note. Exercise content
  is `exercises.yaml`. Custom declarative block definitions live below
  `block-types/`.
- HTML note assets below `generated/content/<domain>/<node>/assets/` may include
  CSS, JavaScript, fonts, WebAssembly, models, documents, audio, video, and
  images from the explicit allow-list. Executables and shell/script launchers
  (`.exe`, `.dll`, `.bat`, `.cmd`, `.ps1`, `.sh`, `.jar`) are forbidden.
- Absolute paths, drive paths, empty segments, `.`/`..` traversal, duplicate
  entries, and symbolic links are rejected.
- Limits: 1,000 files, 20 MiB per file, 100 MiB total uncompressed.
- Entry names and non-asset files are strict UTF-8. ZIP methods 0 (stored) and
  8 (deflate) are accepted; the shared writer emits stored entries.
- ExerciseSet imports append by problem id. Identical ids/content are idempotent;
  conflicting content is rejected. Diagnostic and all non-conceptual problem
  types use `mode: practice`.

Contract cases shared by JavaScript, Rust, and integrations are recorded in
`fixtures/wawapkg-contract/cases.json`.
