export function idFromContentPath(filePath) {
  const normalizedPath = filePath.replaceAll("\\", "/");
  const match = normalizedPath.match(/content\/[^/]+\/([^/]+)\/(?:meta\.yaml|note\.md|note\.html)$/);
  return match?.[1] || "";
}

function noteFormatFromPath(filePath = "") {
  return filePath.replaceAll("\\", "/").endsWith("/note.html") ? "html" : "markdown";
}

function putNote(notes, filePath, contents) {
  const id = idFromContentPath(filePath);
  if (!id) return;

  const format = noteFormatFromPath(filePath);
  const existing = notes[id] || { id, markdown: "", html: "", format: "none", filePath: "" };

  if (format === "html") {
    notes[id] = {
      ...existing,
      id,
      html: contents || "",
      format: "html",
      filePath,
    };
    return;
  }

  if (existing.format !== "html") {
    notes[id] = {
      ...existing,
      id,
      markdown: contents || "",
      format: "markdown",
      filePath,
    };
  } else {
    notes[id] = {
      ...existing,
      markdown: contents || "",
      markdownFilePath: filePath,
    };
  }
}

export function buildNoteIndex(noteFiles = {}, htmlNoteFiles = {}) {
  const notes = {};

  Object.entries(noteFiles || {}).forEach(([filePath, markdown]) => putNote(notes, filePath, markdown));
  Object.entries(htmlNoteFiles || {}).forEach(([filePath, html]) => putNote(notes, filePath, html));

  return notes;
}
