# Wawa AI Context Export

This context export is optimized for stepwise knowledge-base authoring, not one-shot package generation.

Default behavior:
1. Read `AI_CONTEXT.yaml` and `RULE_PRIORITY.yaml`.
2. Ask the user which task they want.
3. Do not generate a `.wawapkg` unless the user explicitly asks to build, export, import, or repair a package.

Task options:
- Create or revise node architecture
- Create a note for one node
- Create an ExerciseSet for one node
- Analyze source material and propose an import plan
- Build a `.wawapkg` from an approved plan
- Fix an existing `.wawapkg`

Recommended reading order:
1. `AI_CONTEXT.yaml`
2. `RULE_PRIORITY.yaml`
3. `WORKFLOW_GUIDE.md`
4. `FORMAT_CONTRACT.md`
5. Schema files as needed: `WAWAPKG_SCHEMA.md`, `NODE_SCHEMA.md`, `NOTE_SCHEMA.md`, `EXERCISE_SCHEMA.md`, `RELATION_SCHEMA.md`, `ASSET_RULES.md`
6. Dynamic indexes: `DOMAIN_INDEX.yaml`, `NODE_INDEX.yaml`, `RELATION_INDEX.yaml`, `CUSTOM_BLOCK_INDEX.yaml`, `BLOCK_REGISTRY.md`
7. `SOURCE_TO_NOTE_GUIDE.md` and `QUALITY_RUBRIC.md` for content work
