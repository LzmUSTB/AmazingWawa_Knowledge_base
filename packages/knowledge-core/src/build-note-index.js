export function idFromContentPath(filePath) {
  const normalizedPath = filePath.replaceAll("\\", "/");
  const match = normalizedPath.match(/content\/[^/]+\/([^/]+)\/(?:meta\.yaml|note\.md)$/);
  return match?.[1] || "";
}

export function buildNoteIndex(noteFiles = {}) {
  const notes = {};

  Object.entries(noteFiles).forEach(([filePath, markdown]) => {
    const id = idFromContentPath(filePath);
    if (!id) return;
    notes[id] = {
      id,
      markdown: markdown || "",
    };
  });

  return notes;
}
