const fallbackNav = `
  <nav class="site-nav" aria-label="Main navigation">
    <div class="brand">
      <a href="index.html" class="brand-mark" aria-label="Run Tianjin home">
        <img src="run-tianjin-transparent-logo.png" alt="Run Tianjin transparent logo" />
        <span>Run Tianjin</span>
      </a>
    </div>
    <div class="nav-links">
      <a href="index.html">Home</a>
      <a href="routes.html">Routes</a>
      <a href="map.html">Map</a>
      <a href="filter.html">Find route</a>
      <a href="planner.html">Plan</a>
      <a href="achievements.html">Progress</a>
      <a href="tips.html">Tips</a>
      <a href="about.html">About</a>
    </div>
  </nav>
`;

const target = document.getElementById('site-header');
if (target) {
  target.innerHTML = fallbackNav;
}

fetch('nav.html?v=' + Date.now(), { cache: 'no-store' })
  .then(response => {
    if (!response.ok) throw new Error('Navigation failed to load');
    return response.text();
  })
  .then(html => {
    if (target && html.includes('Map') && html.includes('Find route')) {
      target.innerHTML = html;
    }
  })
  .catch(error => {
    console.error('Failed to load navigation:', error);
  });