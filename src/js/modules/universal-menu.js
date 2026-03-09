/**
 * Menu universel partagé entre les pages du projet.
 */

const DEFAULT_LINKS = [
  { label: 'Accueil', href: '/' },
  { label: 'Notre méthode', href: '/#optima-section' },
  { label: 'Formulaire', href: '/form' },
  { label: 'Confidentialité', href: '/confidentialite' },
  { label: 'À propos', href: '/a-propos' }
];

export function initUniversalMenu(options = {}) {
  const header = document.querySelector('.header');
  if (!header) return;

  const inner = header.querySelector('.header-inner') || header.querySelector('.container');
  if (!inner) return;

  const links = Array.isArray(options.links) && options.links.length > 0
    ? options.links
    : DEFAULT_LINKS;

  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';

  inner.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
      <div class="brand">
        <a class="nav-link" href="/">OPTIMA MDPH</a>
      </div>
      <nav class="nav" style="display: flex; align-items: center; gap: 1.5rem;">
        ${links.map(link => `
          <a class="nav-link${currentPath === new URL(link.href, 'http://localhost').pathname ? ' is-active' : ''}" href="${link.href}">${link.label}</a>
        `).join('')}
        <span class="nav-phone">02 99 260 127</span>
      </nav>
    </div>
  `;
}
