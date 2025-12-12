/**
 * Strips HTML tags from a string and returns plain text
 * Useful for displaying rich text editor content as plain text
 */
export const stripHtml = (html: string): string => {
  if (!html) return "";
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent || "";
};
