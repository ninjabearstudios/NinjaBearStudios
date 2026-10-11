(() => {
  'use strict';
  // Preserve shared query parameters and song/project anchors on legacy links.
  const routes = {
    '/index.html': '/',
    '/music.html': '/music/',
    '/dev.html': '/dev/',
    '/streams.html': '/streams/',
    '/anime.html': '/anime/',
    '/lore.html': '/lore/',
    '/about.html': '/about/',
    '/inquiry.html': '/inquiry/'
  };
  const destination = routes[window.location.pathname];
  if (destination) {
    window.location.replace(destination + window.location.search + window.location.hash);
  }
})();
