// Remembers the language picked in the ES | EN switch, so the home page
// stops sending an English browser to /en/ once the person chose Spanish.
document.querySelectorAll('[data-lang]').forEach(function (link) {
  link.addEventListener('click', function () {
    try { localStorage.setItem('rumi-lang', link.getAttribute('data-lang')); } catch (e) {}
  });
});
