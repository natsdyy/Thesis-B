// Lightweight sanitizer using DOMPurify for rendering and submission safety
// Falls back to a minimal no-op if DOMPurify isn't available (should be installed)

let DOMPurifyInstance = null;
try {
  // eslint-disable-next-line global-require
  const createDOMPurify = require('dompurify');
  // In browser bundlers, window is available; during SSR it may not be
  const { JSDOM } = (() => {
    try {
      // Optional: allow Node usage when needed; ignored in browser builds
      // eslint-disable-next-line global-require
      return require('jsdom');
    } catch (_) {
      return {};
    }
  })();

  if (typeof window !== 'undefined') {
    DOMPurifyInstance = createDOMPurify(window);
  } else if (JSDOM) {
    const { window: jsdomWindow } = new JSDOM('<!DOCTYPE html>');
    DOMPurifyInstance = createDOMPurify(jsdomWindow);
  }
} catch (_) {
  // DOMPurify not present at build time; we'll provide a safe fallback below
}

const defaultConfig = {
  ALLOWED_TAGS: [
    'p',
    'b',
    'i',
    'u',
    'strong',
    'em',
    'ul',
    'ol',
    'li',
    'br',
    'a',
    'img',
    'span',
    'div',
  ],
  ALLOWED_ATTR: [
    'href',
    'target',
    'rel',
    'src',
    'alt',
    'title',
    'class',
    'style',
  ],
  ALLOW_DATA_ATTR: false,
  FORBID_TAGS: ['script', 'iframe', 'object', 'embed'],
};

export function sanitizeHtml(html, config = defaultConfig) {
  if (!html) return '';
  if (DOMPurifyInstance) return DOMPurifyInstance.sanitize(html, config);
  // Fallback: strip obvious scripts; this should be replaced by DOMPurify
  return String(html)
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/on\w+="[^"]*"/g, '')
    .replace(/javascript:/gi, '');
}

export default { sanitizeHtml };
