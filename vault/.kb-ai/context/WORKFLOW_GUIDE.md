# Workflow Guide

## Default behavior

Do not directly generate a `.wawapkg` after reading the context docs. Unless package generation was explicitly requested, first ask which operation the user wants:

1. Create or revise node architecture
2. Create a note for one node
3. Create an ExerciseSet for one node
4. Analyze source material and propose an import plan
5. Build a `.wawapkg` from an approved plan
6. Fix an existing `.wawapkg`

## Stepwise authoring principle

- Generate node architecture first.
- Generate notes one node at a time.
- Generate ExerciseSets one node at a time.
- Use user feedback from each artifact to improve the next one.
- Do not generate a large multi-node note package by default.

## Node architecture workflow

1. Propose domains only when required.
2. Propose nodes with ids, titles, types, summaries, and parent ids.
3. Propose semantic relations separately.
4. Use `contentFormat: none` for placeholder nodes.
5. Wait for confirmation before package generation.

## Single-node note workflow

1. Confirm the target node id.
2. Check prerequisites and related nodes.
3. Decide between `markdown` and `html`.
4. Generate only that node's note.
5. Include self-check questions with answers when relevant.
6. Wait for feedback.

## ExerciseSet workflow

1. Confirm the anchor node id.
2. Use one ExerciseSet per node.
3. Attach comprehensive exercises to the parent node.
4. Do not bind ExerciseSet to Stage.
5. Use university or graduate-level problems where appropriate.
6. Every problem must include prompt, answer, and solution.

## Source analysis workflow

1. Extract candidate knowledge.
2. Propose nodes and relations.
3. Identify rejected nodes and reasons.
4. Propose a note and exercise plan.
5. Do not create package files until the plan is approved.

## Package workflow

Only build a `.wawapkg` after the user confirms the plan or explicitly asks for package generation. When fixing a package, inspect and report validation failures before changing files.
