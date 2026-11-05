// Theme switching: follows the OS by default, but a manual choice wins and is
// remembered in localStorage. The inline snippet in each page's <head> applies
// the stored theme before first paint so there is no flash of the wrong colour.
(function () {
  const STORAGE_KEY = 'run-tianjin-theme';
  const root = document.documentElement;

  function stored() {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch (error) {
      return null;
    }
  }

  function systemPrefersDark() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  function effective() {
    return stored() || (systemPrefersDark() ? 'dark' : 'light');
  }

  function apply(theme) {
    root.setAttribute('data-theme', theme);
    root.style.colorScheme = theme;
    document.querySelectorAll('[data-theme-toggle]').forEach(button => {
      const isDark = theme === 'dark';
      button.setAttribute('aria-pressed', String(isDark));
      button.setAttribute('aria-label', isDark ? 'Switch to light theme' : 'Switch to dark theme');
      button.title = isDark ? 'Switch to light theme' : 'Switch to dark theme';
      const icon = button.querySelector('.theme-toggle-icon');
      if (icon) icon.textContent = isDark ? '☀' : '☾';
    });
  }

  function toggle() {
    const next = effective() === 'dark' ? 'light' : 'dark';
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch (error) {
      /* storage blocked — the theme still applies for this page view */
    }
    apply(next);
  }

  // Expose a tiny API so nav.js can wire the button after injecting the nav.
  window.RunTianjinTheme = { apply, toggle, effective };

  apply(effective());

  // Follow the OS only while the user has not made an explicit choice.
  if (window.matchMedia) {
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      if (!stored()) apply(effective());
    };
    if (query.addEventListener) query.addEventListener('change', onChange);
    else if (query.addListener) query.addListener(onChange);
  }

  document.addEventListener('click', event => {
    const button = event.target.closest('[data-theme-toggle]');
    if (!button) return;
    event.preventDefault();
    toggle();
  });
})();
