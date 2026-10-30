// Mobile nav menu: toggles #nav.menu-open (CSS decides what that reveals)
(() => {
  const nav = document.getElementById('nav');
  const btn = document.getElementById('nav-more');
  if (!nav || !btn) return;

  const set = open => {
    nav.classList.toggle('menu-open', open);
    btn.setAttribute('aria-expanded', String(open));
  };

  btn.addEventListener('click', () => set(!nav.classList.contains('menu-open')));
  nav.addEventListener('click', e => { if (e.target.closest('ul a')) set(false); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') set(false); });
  document.addEventListener('click', e => { if (!nav.contains(e.target)) set(false); });
  matchMedia('(min-width: 981px)').addEventListener('change', e => { if (e.matches) set(false); });
})();
