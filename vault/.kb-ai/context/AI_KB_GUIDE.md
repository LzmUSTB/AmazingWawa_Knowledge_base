# Wawa Knowledge Base AI Guide

## Final output

Final user-facing output must be a single `.wawapkg` file.

`.wawapkg` is a ZIP-compatible archive with a custom extension. The archive root must contain:

```text
mimetype
manifest.yaml
sources.yaml
patch.yaml
generated/
block-types/
review/
```

The `mimetype` file must contain exactly:

```text
application/x-wawa-kb-ai-import-package
```

Do not output an ordinary `.zip` as the final artifact. Do not ask the user to manually place files into the vault.

## Primary goal

The package must create **learnable knowledge**, not a loose summary.

A good import package should help the user:

1. understand the mechanism,
2. recall the concept later,
3. connect the concept to existing knowledge,
4. apply the knowledge in implementation or analysis,
5. inspect source-derived claims.

## Required workflow before writing package files

Before creating files, internally perform this planning sequence and write the result into `review/import-plan.md`:

1. **Source scope**  
   What does the source actually cover? What is outside scope?

2. **Knowledge extraction**  
   Extract concepts, mechanisms, procedures, parameters, examples, limitations, and misconceptions.

3. **Node plan**  
   Decide which knowledge objects deserve nodes. Avoid one huge article node. Avoid overly tiny nodes.

4. **Relation plan**  
   Decide hierarchy and semantic relations. Use relation direction carefully.

5. **Note plan**  
   Decide what each note must teach, what blocks/assets are needed, and what evidence supports each claim.

6. **Quality self-check**  
   Evaluate each note against `NOTE_QUALITY_RUBRIC.md`. Target score: 4 or higher.

## Output language

Write explanatory note content in Chinese by default. Keep standard technical terms in English when they are more precise, for example `Curl Noise`, `Divergence`, `gradient`, `vector field`, `shader`, `pipeline`.

Use concise but complete technical Chinese. Do not mechanically translate English. Explain mechanisms.

## Domain rules

If `DOMAIN_INDEX.yaml` is empty, start with `add_domain`.

If no suitable existing domain fits, create a small, stable, broad domain with `add_domain`.

Good domain examples:

```text
computer-graphics
machine-learning
web-dev
simulation
linear-algebra
game-dev
```

Bad domain examples:

```text
curl-noise-from-linkedin-article
nicholas-seavert-illugen-post
random-vfx-tips
```

Do not create excessive narrow domains.

## Asset rules

Assets are allowed and encouraged when they improve explanation.

Put packaged assets under:

```text
generated/content/<domain>/<node-id>/assets/<lowercase-kebab-name.ext>
```

Reference local assets from `note.md`:

```markdown
![Alt text](assets/example-diagram.png)
[Attachment label](assets/source-notes.pdf)
```

Remote URLs and data URLs are not allowed for note assets. Package images locally.

Use images for:
- static diagrams,
- source figures,
- visual intuition,
- screenshots,
- comparison examples.

Use declarative visual blocks for:
- structured diagrams,
- selectable nodes,
- staged mechanisms,
- repeated visual elements,
- formula callouts with semantic labels.

## Review files

Every package should include:

```text
review/import-plan.md
review/validation-checklist.md
```

Recommended additional review files:

```text
review/source-extraction.md
review/relation-rationale.md
review/block-decision-report.md
review/unresolved-questions.md
```

Review files are not imported as notes. They are for human inspection and package quality control.
