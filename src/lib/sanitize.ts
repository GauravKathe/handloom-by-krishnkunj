import DOMPurify from 'dompurify';

/**
 * Sanitize HTML content to prevent XSS attacks
 * @param dirty - The untrusted HTML string
 * @returns Sanitized HTML string safe to render
 */
export const sanitizeHtml = (dirty: string): string => {
  if (!dirty) return '';
  
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'strike',
      'ul', 'ol', 'li', 'a', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'blockquote', 'code', 'pre', 'span', 'div', 'mark'
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'style'],
    ALLOW_DATA_ATTR: false,
    ADD_ATTR: ['target'],
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input'],
    FORBID_ATTR: ['onerror', 'onclick', 'onload', 'onmouseover'],
  });
};

/**
 * Sanitize user input for safe display (escapes HTML)
 * @param text - User input text
 * @returns Escaped text safe for display
 */
export const escapeHtml = (text: string): string => {
  if (!text) return '';
  
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

/**
 * Validate and sanitize URL to prevent javascript: and data: URLs
 * @param url - The URL to validate
 * @returns Sanitized URL or empty string if invalid
 */
export const sanitizeUrl = (url: string): string => {
  if (!url) return '';
  
  try {
    const parsed = new URL(url, window.location.origin);
    // Only allow http, https protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return '';
    }
    return url;
  } catch {
    // If URL parsing fails, check if it's a relative path
    if (url.startsWith('/') && !url.startsWith('//')) {
      return url;
    }
    return '';
  }
};
