const fallbackNav = `
  <nav class="site-nav" aria-label="Main navigation">
    <div class="brand">
      <a href="index.html" class="brand-mark" aria-label="Run Tianjin home">
        <img src="run-tianjin-logo-96.png" alt="" width="38" height="38" decoding="async" />
        <span>Run Tianjin</span>
      </a>
    </div>
    <div class="nav-links">
      <a href="index.html">Home</a>
      <a href="routes.html">Routes</a>
      <a href="map.html">Map</a>
      <a href="tips.html">Tips</a>
      <a href="about.html">About</a>
    </div>
  </nav>
`;

const target = document.getElementById('site-header');

/* Mark the link that points at the page we are on. detail.html is reached from
   the Routes listing, so it highlights Routes instead of nothing. */
function markCurrentPage(scope) {
  const here = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
  const alias = { 'detail.html': 'routes.html' };
  const wanted = alias[here] || here;

  scope.querySelectorAll('.nav-links a').forEach(link => {
    const href = (link.getAttribute('href') || '').toLowerCase();
    if (href === wanted) {
      link.setAttribute('aria-current', 'page');
      link.classList.add('is-current');
    } else {
      link.removeAttribute('aria-current');
      link.classList.remove('is-current');
    }
  });
}

function enhance(scope) {
  markCurrentPage(scope);
}

if (target) {
  target.innerHTML = fallbackNav;
  enhance(target);
}

fetch('nav.html?v=' + Date.now(), { cache: 'no-store' })
  .then(response => {
    if (!response.ok) throw new Error('Navigation failed to load');
    return response.text();
  })
  .then(html => {
    if (target && html.includes('Map') && html.includes('Routes')) {
      target.innerHTML = html;
      enhance(target);
    }
  })
  .catch(error => {
    console.error('Failed to load navigation:', error);
  });