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
    <div class="universal-menu">
      <div class="brand">
        <a class="nav-link" href="/">OPTIMA MDPH</a>
      </div>

      <button class="universal-menu__toggle" type="button" aria-label="Ouvrir le menu" aria-expanded="false" aria-controls="universalMenuPanel">☰</button>

      <nav class="nav universal-menu__desktop" aria-label="Navigation">
        ${links.map(link => `
          <a class="nav-link${currentPath === new URL(link.href, 'http://localhost').pathname ? ' is-active' : ''}" href="${link.href}">${link.label}</a>
        `).join('')}
        <span class="nav-phone">02 99 260 127</span>
      </nav>

      <div class="universal-menu__overlay" data-universal-menu-overlay="1" hidden></div>

      <div class="universal-menu__panel" id="universalMenuPanel" hidden>
        <div class="universal-menu__panel-inner">
          <div class="universal-menu__panel-header">
            <div class="universal-menu__panel-title">Menu</div>
            <button class="universal-menu__close" type="button" aria-label="Fermer le menu">✕</button>
          </div>
          <div class="universal-menu__panel-links">
            ${links.map(link => `
              <a class="nav-link${currentPath === new URL(link.href, 'http://localhost').pathname ? ' is-active' : ''}" href="${link.href}">${link.label}</a>
            `).join('')}
          </div>
          <div class="universal-menu__panel-contact">
            <span class="nav-phone">02 99 260 127</span>
          </div>
        </div>
      </div>
    </div>
  `;

  const toggleBtn = inner.querySelector('.universal-menu__toggle');
  const panel = inner.querySelector('#universalMenuPanel');
  const overlay = inner.querySelector('[data-universal-menu-overlay="1"]');
  const closeBtn = inner.querySelector('.universal-menu__close');

  if (!toggleBtn || !panel || !overlay || !closeBtn) return;

  const setOpen = (open) => {
    try {
      toggleBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      panel.hidden = !open;
      overlay.hidden = !open;
      document.body.classList.toggle('universal-menu--open', !!open);
    } catch {
    }
  };

  const openMenu = () => setOpen(true);
  const closeMenu = () => setOpen(false);
  const toggleMenu = () => setOpen(toggleBtn.getAttribute('aria-expanded') !== 'true');

  toggleBtn.addEventListener('click', toggleMenu);
  closeBtn.addEventListener('click', closeMenu);
  overlay.addEventListener('click', closeMenu);

  panel.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => closeMenu());
  });

  document.addEventListener('keydown', (e) => {
    try {
      if (e.key === 'Escape') {
        closeMenu();
      }
    } catch {
    }
  });
}
