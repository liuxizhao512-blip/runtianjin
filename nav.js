fetch('nav.html')
  .then(response => {
    if (!response.ok) throw new Error('Navigation failed to load');
    return response.text();
  })
  .then(html => {
    const target = document.getElementById('site-header');
    if (target) {
      target.innerHTML = html;
    }
  })
  .catch(error => {
    console.error('Failed to load navigation:', error);
  });