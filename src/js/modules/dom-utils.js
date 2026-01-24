/**
 * Helpers DOM.
 * `$()` accepte soit un sélecteur CSS (#/.), soit un id nu.
 */

export function $(selector) {
  if (selector.startsWith('#') || selector.startsWith('.')) {
    return document.querySelector(selector);
  } else {
    return document.getElementById(selector);
  }
}

export function setStatus(msg) {
  const statusEl = $('status');
  if (statusEl) statusEl.textContent = msg || '';
}
