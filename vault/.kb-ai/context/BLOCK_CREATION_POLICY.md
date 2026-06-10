# Block Creation Policy

Prefer existing native blocks. Create declarative visual blocks only when existing blocks are insufficient.

If a simple static diagram or image is enough, prefer a packaged local asset image. If interaction, structured comparison, or semantic highlighting is needed, use a declarative visual block. Propose a native block only when declarative blocks are insufficient.

Packages cannot create relation types or native renderer code. Relation types are frozen: contains, depends-on, used-in, compares-with.

Do not include executable JS, Vue, CSS, HTML, script, iframe, eval, inline event handlers, or remote resources.
