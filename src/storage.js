export const storageKey = "papertrail:documents:v1";
export const maxLength = 200000;
export function validDocument(value) {
  return (
    value &&
    typeof value.id === "string" &&
    value.id.length <= 100 &&
    typeof value.title === "string" &&
    value.title.trim().length > 0 &&
    value.title.length <= 100 &&
    typeof value.content === "string" &&
    value.content.length <= maxLength &&
    Number.isFinite(value.updated)
  );
}
export function restoreLibrary(raw) {
  const value = JSON.parse(raw);
  if (
    !value ||
    value.version !== 1 ||
    !Array.isArray(value.documents) ||
    !value.documents.length ||
    value.documents.length > 20 ||
    !value.documents.every(validDocument)
  )
    throw new Error("Invalid document library.");
  if (
    new Set(value.documents.map((document) => document.id)).size !==
    value.documents.length
  )
    throw new Error("Duplicate document identifiers.");
  return {
    documents: value.documents,
    activeId: value.documents.some((document) => document.id === value.activeId)
      ? value.activeId
      : value.documents[0].id,
  };
}
export function serializeLibrary(documents, activeId) {
  return JSON.stringify({ version: 1, documents, activeId });
}
