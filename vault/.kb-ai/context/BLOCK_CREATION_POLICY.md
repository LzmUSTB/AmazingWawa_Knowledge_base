# Block Creation Policy

Prefer existing native blocks. Create declarative visual blocks only when existing blocks are insufficient.

If a simple static diagram or image is enough, prefer a packaged local asset image.

If interaction, structured comparison, semantic highlighting, repeated geometry, labeled technical structure, or staged inspection is needed, use a declarative visual block.

Use HTML Rich Notes when the whole note needs article-like layout and visual reading flow.

Packages cannot create relation types, native renderer code, executable logic, or app components.

Do not include executable JS, Vue, CSS, full HTML documents, script, iframe, eval, inline event handlers, or remote executable resources.

## Block decision matrix

| Teaching goal | Preferred representation |
|---|---|
| Define a concept | concept-card |
| Show a process | process-flow |
| Compare alternatives | compare-table |
| Explain code | code-explain |
| Test recall | quiz |
| Show safe scalar formula behavior | expression-visualizer |
| Show vector fields / architecture | declarative visual or HTML note |
| Preserve a full tutorial reading flow | HTML Rich Note |
