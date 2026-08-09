export function createDocumentStorageKey({
  ownerId,
  documentId,
  extension,
}: {
  ownerId: string;
  documentId: string;
  extension: string;
}) {
  const normalizedExtension = extension.replace(".", "").toLowerCase();

  return `documents/${ownerId}/${documentId}/original.${normalizedExtension}`;
}