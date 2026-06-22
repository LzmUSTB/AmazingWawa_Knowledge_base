# Note Schema

One node has at most one active note format, selected by `meta.yaml.contentFormat`.

## Markdown note

Path: `content/<domain>/<nodeId>/note.md`.

Use Markdown for compact static explanations. Markdown notes support fenced code, tables, LaTeX, and registered native blocks. Prefer a precise definition, problem, intuition, formal explanation, minimal example, mistakes, related knowledge, and self-check questions with answers.

## HTML rich note

Path: `content/<domain>/<nodeId>/note.html`.

Use HTML only when visual flow, source media, substantial diagrams, or educational interaction materially improves the explanation. JavaScript may support sliders, SVG/canvas demos, and synchronized explanations, but must not be decorative. Do not evaluate arbitrary user JavaScript.

HTML notes must be readable in the application theme, respond to font scaling, avoid double scrolling, and keep controls accessible. Local asset paths follow `ASSET_RULES.md`.

## Source blocks

Source blocks are conditional. Add a nearby `<aside class="source-block">` only when the note cites, embeds, closely paraphrases, or derives a claim or demo from source/network material. Do not add source blocks to original explanation merely to satisfy a template.

## Interactive guidance

Preserve important source interactions when feasible. A supplementary demo must teach the same mechanism and be labeled as supplementary when it is not a direct port. Review questions must include answers.
