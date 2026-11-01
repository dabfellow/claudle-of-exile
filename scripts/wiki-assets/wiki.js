(function () {
  var q = document.getElementById('q'), box = document.getElementById('results'), idx = null;
  function load(cb) {
    if (idx) return cb();
    fetch('/path-of-idle/wiki/search-index.json').then(function (r) { return r.json(); }).then(function (d) { idx = d; cb(); });
  }
  function esc(s) { return s.replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  q.addEventListener('input', function () {
    var v = q.value.trim().toLowerCase();
    if (v.length < 2) { box.hidden = true; return; }
    load(function () {
      var hits = idx.filter(function (e) { return e.t.toLowerCase().indexOf(v) >= 0; })
        .concat(idx.filter(function (e) { return e.t.toLowerCase().indexOf(v) < 0 && e.k.toLowerCase().indexOf(v) >= 0; })).slice(0, 25);
      box.innerHTML = hits.length ? hits.map(function (e) { return '<a href="' + e.u + '">' + esc(e.t) + '<span>' + esc(e.k.slice(0, 40)) + '</span></a>'; }).join('') : '<a>No results</a>';
      box.hidden = false;
    });
  });
  var toc = document.getElementById('toc');
  var heads = Array.prototype.filter.call(document.querySelectorAll('article h2'), function (h) { return !h.closest('.card'); });
  if (toc && heads.length > 1) {
    var ol = toc.querySelector('ol');
    heads.forEach(function (h, i) {
      if (!h.id) h.id = 'sec-' + i;
      var li = document.createElement('li'), a = document.createElement('a');
      a.href = '#' + h.id; a.textContent = h.textContent; li.appendChild(a); ol.appendChild(li);
    });
    toc.hidden = false;
  }
  document.addEventListener('click', function (e) { if (e.target !== q && !box.contains(e.target)) box.hidden = true; });
})();
