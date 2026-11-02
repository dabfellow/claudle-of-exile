(function () {
  // ---------- search ----------
  var q = document.getElementById('q'), box = document.getElementById('results'), idx = null, picked = -1;
  function load(cb) {
    if (idx) return cb();
    fetch('/path-of-idle/wiki/search-index.json').then(function (r) { return r.json(); }).then(function (d) {
      idx = d;
      idx.forEach(function (e) { e.tl = e.t.toLowerCase(); e.hay = (e.t + ' ' + e.k + ' ' + (e.s || '')).toLowerCase(); });
      cb();
    });
  }
  function esc(s) { return s.replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function typos(a, b) {
    var prev = [], i, j;
    for (j = 0; j <= b.length; j++) prev[j] = j;
    for (i = 1; i <= a.length; i++) {
      var row = [i];
      for (j = 1; j <= b.length; j++) row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = row;
    }
    return prev[b.length];
  }
  // lower is better, -1 is no match: exact name, start of the name, a word in the name, anywhere in the name, the description, then a near miss
  function score(e, v, terms) {
    if (e.tl === v) return 0;
    if (e.tl.indexOf(v) === 0) return 1;
    if ((' ' + e.tl).indexOf(' ' + v) >= 0) return 2;
    if (e.tl.indexOf(v) >= 0) return 3;
    if (terms.every(function (t) { return e.hay.indexOf(t) >= 0; })) return 4;
    if (v.length < 4) return -1;
    var allowed = v.length >= 7 ? 2 : 1;
    return e.tl.split(/\s+/).some(function (w) { return Math.abs(w.length - v.length) <= allowed && typos(w, v) <= allowed; }) ? 5 : -1;
  }
  function pick(i) {
    var links = box.querySelectorAll('a.hit');
    if (!links.length) return;
    picked = (i + links.length) % links.length;
    Array.prototype.forEach.call(links, function (a, n) { a.classList.toggle('sel', n === picked); });
    links[picked].scrollIntoView({ block: 'nearest' });
  }
  function closeResults() { box.hidden = true; picked = -1; }
  q.addEventListener('input', function () {
    var v = q.value.trim().toLowerCase(), terms = v.split(/\s+/);
    if (v.length < 2) return closeResults();
    load(function () {
      var hits = [];
      idx.forEach(function (e, i) { var n = score(e, v, terms); if (n >= 0) hits.push({ e: e, n: n, i: i }); });
      hits.sort(function (a, b) { return a.n - b.n || a.i - b.i; });
      box.innerHTML = hits.length
        ? hits.slice(0, 25).map(function (h) {
          var e = h.e;
          return '<a class="hit" href="' + e.u + '">' + (e.i ? '<img class="pic" src="' + e.i + '" alt="">' : '<span class="pic"></span>') +
            '<span class="label"><b>' + esc(e.t) + '</b><span class="kind">' + esc(e.c) + '</span></span>' + (e.s ? '<span class="snip">' + esc(e.s.slice(0, 90)) + '</span>' : '') + '</a>';
        }).join('')
        : '<p>Nothing found for "' + esc(q.value.trim()) + '". Try a skill, item, boss or ailment name, or browse <a href="/path-of-idle/wiki/skills/">Skill gems</a> and <a href="/path-of-idle/wiki/uniques/">Unique items</a>.</p>';
      picked = -1;
      box.hidden = false;
    });
  });
  q.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); pick(picked + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); pick(picked - 1); }
    else if (e.key === 'Enter') {
      var links = box.querySelectorAll('a.hit');
      if (!box.hidden && links.length) location.href = links[Math.max(0, picked)].href;
    } else if (e.key === 'Escape') { closeResults(); q.blur(); }
  });
  document.addEventListener('keydown', function (e) {
    var typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);
    if (e.key === '/' && !typing) { e.preventDefault(); q.focus(); q.select(); }
    if (e.key === 'Escape') closeMenu();
  });

  // ---------- menu ----------
  var menu = document.getElementById('menu'), sidebar = document.getElementById('sidebar');
  function closeMenu() {
    document.body.classList.remove('nav-open');
    menu.setAttribute('aria-expanded', 'false');
  }
  menu.addEventListener('click', function () {
    menu.setAttribute('aria-expanded', String(document.body.classList.toggle('nav-open')));
  });
  // sidebar groups stay as the player left them, but the page you're on always shows
  var closedKey = 'wikiNavClosed', closed = [];
  try { closed = JSON.parse(localStorage.getItem(closedKey)) || []; } catch (e) { closed = []; }
  Array.prototype.forEach.call(document.querySelectorAll('.navgroup'), function (g) {
    if (closed.indexOf(g.dataset.group) >= 0 && !g.querySelector('.active')) g.open = false;
    g.addEventListener('toggle', function () {
      closed = closed.filter(function (n) { return n !== g.dataset.group; });
      if (!g.open) closed.push(g.dataset.group);
      try { localStorage.setItem(closedKey, JSON.stringify(closed)); } catch (e) { /* the menu still works, it just won't remember */ }
    });
  });

  // ---------- contents and section links ----------
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
  Array.prototype.forEach.call(document.querySelectorAll('article h2[id], article h3[id], section.card[id] > h3'), function (h) {
    var id = h.id || h.parentNode.id, a = document.createElement('a');
    a.className = 'anchor'; a.href = '#' + id; a.textContent = '#'; a.setAttribute('aria-label', 'Link to this section');
    h.appendChild(a);
  });

  // ---------- table tools ----------
  // click a column heading to sort by it; click again to flip. Numbers sort as numbers, "instant" counts as 0, blanks stay last
  function sortValue(cell) {
    var s = cell.textContent.trim();
    if (!s) return null;
    if (s.toLowerCase() === 'instant') return 0;
    var n = /^[(+~]?(-?\d+(?:\.\d+)?)/.exec(s);
    return n ? parseFloat(n[1]) : s.toLowerCase();
  }
  function compare(a, b) {
    if (typeof a === typeof b) return typeof a === 'number' ? a - b : a.localeCompare(b, undefined, { numeric: true });
    return typeof a === 'number' ? -1 : 1;
  }
  function sortBy(table, cols, col) {
    var dir = cols[col].getAttribute('aria-sort') === 'ascending' ? -1 : 1, body = table.tBodies[0];
    var rows = Array.prototype.map.call(body.rows, function (r, i) { return { r: r, i: i, v: sortValue(r.cells[col]) }; });
    rows.sort(function (x, y) {
      if (x.v === null || y.v === null) return x.v === y.v ? x.i - y.i : x.v === null ? 1 : -1;
      return dir * compare(x.v, y.v) || x.i - y.i;
    });
    rows.forEach(function (x) { body.appendChild(x.r); });
    cols.forEach(function (h, i) { h.setAttribute('aria-sort', i === col ? (dir > 0 ? 'ascending' : 'descending') : 'none'); });
  }
  /** A filter bar: a text box, any dropdowns, a count and Clear. `apply` gets the box's words and returns how many entries show. */
  function filterBar(before, label, total, selects, apply) {
    var bar = document.createElement('div'), text = document.createElement('input');
    var count = document.createElement('span'), clear = document.createElement('button');
    bar.className = 'tools';
    text.type = 'search'; text.placeholder = label; text.setAttribute('aria-label', label);
    count.className = 'count'; count.setAttribute('aria-live', 'polite');
    clear.type = 'button'; clear.textContent = 'Clear all'; clear.hidden = true;
    function run() {
      var words = text.value.trim().toLowerCase().split(/\s+/).filter(Boolean), shown = apply(words);
      count.textContent = 'Showing ' + shown + ' of ' + total;
      clear.hidden = !words.length && !selects.some(function (s) { return s.value; });
    }
    text.addEventListener('input', run);
    selects.forEach(function (s) { s.addEventListener('change', run); });
    clear.addEventListener('click', function () {
      text.value = '';
      selects.forEach(function (s) { s.value = ''; });
      run();
    });
    bar.appendChild(text);
    selects.forEach(function (s) { bar.appendChild(s); });
    bar.appendChild(count); bar.appendChild(clear);
    before.parentNode.insertBefore(bar, before);
    run();
  }
  function tokens(cell) { return cell.textContent.split(/,\s*/).map(function (t) { return t.trim(); }).filter(Boolean); }
  /** Columns of short repeating values (attribute, act, tags) earn a dropdown; numbers only when there are just a few. */
  function columnSelect(rows, name, col) {
    var seen = {};
    rows.forEach(function (r) { tokens(r.cells[col]).forEach(function (t) { seen[t] = true; }); });
    var vals = Object.keys(seen).sort(function (a, b) { return a.localeCompare(b, undefined, { numeric: true }); });
    var numeric = vals.some(function (v) { return /^[\d(]/.test(v); });
    if (vals.length < 2 || vals.length > rows.length / 2 || vals.length > (numeric ? 8 : 40) || vals.some(function (v) { return v.length > 24; })) return null;
    var s = document.createElement('select');
    s.setAttribute('aria-label', 'Filter by ' + name);
    s.dataset.col = col;
    s.innerHTML = '<option value="">Any ' + esc(name.toLowerCase()) + '</option>' + vals.map(function (v) { return '<option>' + esc(v) + '</option>'; }).join('');
    return s;
  }
  function skillSelect(rows) {
    var seen = {};
    rows.forEach(function (r) { r.querySelector('[data-skills]').dataset.skills.split('|').forEach(function (n) { if (n) seen[n] = true; }); });
    var s = document.createElement('select');
    s.setAttribute('aria-label', 'Show supports that fit a skill');
    s.innerHTML = '<option value="">Fits any skill</option>' + Object.keys(seen).sort().map(function (n) { return '<option>' + esc(n) + '</option>'; }).join('');
    return s;
  }
  Array.prototype.forEach.call(document.querySelectorAll('article table'), function (table) {
    var cols = Array.prototype.slice.call(table.tHead.rows[0].cells);
    cols.forEach(function (h, col) {
      h.setAttribute('aria-sort', 'none');
      h.tabIndex = 0;
      h.addEventListener('click', function () { sortBy(table, cols, col); });
      h.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); sortBy(table, cols, col); }
      });
    });
    var rows = Array.prototype.slice.call(table.tBodies[0].rows);
    if (rows.length <= 10) return;
    var selects = cols.slice(1).map(function (h, i) { return columnSelect(rows, h.textContent, i + 1); }).filter(Boolean);
    // supports carry the skills the game says they fit, so a skill can be picked to see what fits it
    var fitSkills = table.querySelector('[data-skills]') && skillSelect(rows);
    function fits(r, name) { return r.querySelector('[data-skills]').dataset.skills.split('|').indexOf(name) >= 0; }
    if (fitSkills) selects.unshift(fitSkills);
    filterBar(table.parentNode, 'Filter this table', rows.length, selects, function (words) {
      var shown = 0;
      rows.forEach(function (r) {
        var line = r.textContent.toLowerCase();
        var show = words.every(function (w) { return line.indexOf(w) >= 0; }) && selects.every(function (s) {
          if (!s.value) return true;
          return s === fitSkills ? fits(r, s.value) : tokens(r.cells[+s.dataset.col]).indexOf(s.value) >= 0;
        });
        r.hidden = !show;
        if (show) shown++;
      });
      return shown;
    });
  });

  // pages of cards (areas, uniques) filter the same way, and a heading goes when nothing under it is left
  var article = document.querySelector('article');
  var cards = article ? Array.prototype.filter.call(article.children, function (el) { return el.matches('section.card'); }) : [];
  if (cards.length >= 10) {
    var groups = Array.prototype.filter.call(article.children, function (el) { return el.tagName === 'H2'; });
    filterBar(groups[0] || cards[0], 'Filter this page', cards.length, [], function (words) {
      var shown = 0;
      cards.forEach(function (c) {
        var line = c.textContent.toLowerCase();
        c.hidden = !words.every(function (w) { return line.indexOf(w) >= 0; });
        if (!c.hidden) shown++;
      });
      groups.forEach(function (h) {
        var any = false, el = h.nextElementSibling, rest = [];
        for (; el && el.tagName !== 'H2'; el = el.nextElementSibling) {
          if (el.matches('section.card')) any = any || !el.hidden;
          else rest.push(el);
        }
        h.hidden = !any;
        rest.forEach(function (x) { x.hidden = !any || words.length > 0; });
      });
      return shown;
    });
  }

  // a link to something inside a spoiler box opens the box, or it would go nowhere
  function openTarget() {
    var el = location.hash && document.getElementById(location.hash.slice(1)), box_ = el && el.closest('details');
    if (box_) { box_.open = true; el.scrollIntoView(); }
  }
  addEventListener('hashchange', openTarget);
  openTarget();

  var jump = document.querySelector('[data-jump]');
  if (jump) jump.addEventListener('change', function () { if (jump.value) location.href = jump.value; });

  // ---------- hover cards ----------
  // a mouse sees the card on hover; a tap opens it first, with a link to the full page
  var cards_ = null, tip = document.createElement('div'), tipFor = null, hideTimer = 0;
  tip.id = 'tip'; tip.hidden = true; tip.setAttribute('role', 'tooltip');
  document.body.appendChild(tip);
  function tipData(cb) {
    if (cards_) return cb();
    fetch('/path-of-idle/wiki/hover-cards.json').then(function (r) { return r.json(); }).then(function (d) { cards_ = d; cb(); });
  }
  function hideTip() { tip.hidden = true; tipFor = null; }
  function showTip(a, withLink) {
    tipData(function () {
      var c = cards_[a.getAttribute('href')];
      if (!c) return;
      tipFor = a;
      tip.innerHTML = '<div class="tip-head">' + (c.a ? '<img src="' + c.a + '" alt=""' + (c.p ? ' class="pixel"' : '') + '>' : '') + '<div><b>' + esc(c.n) + '</b><small>' + esc(c.k) + '</small></div></div>' +
        (c.t ? '<p>' + esc(c.t) + '</p>' : '') + (withLink ? '<a href="' + a.getAttribute('href') + '">Open full page</a>' : '');
      tip.hidden = false;
      var r = a.getBoundingClientRect(), h = tip.offsetHeight, w = tip.offsetWidth;
      tip.style.left = Math.max(12, Math.min(r.left, innerWidth - w - 12)) + 'px';
      tip.style.top = (r.bottom + 8 + h < innerHeight ? r.bottom + 8 : Math.max(12, r.top - h - 8)) + 'px';
    });
  }
  function entLink(el) { return el.closest && el.closest('a.ent'); }
  var touching = false;
  document.addEventListener('touchstart', function () { touching = true; }, { passive: true });
  document.addEventListener('mouseover', function (e) {
    var a = entLink(e.target);
    if (a && !touching) { clearTimeout(hideTimer); showTip(a, false); }
  });
  document.addEventListener('mouseout', function (e) {
    if (entLink(e.target) && !touching) hideTimer = setTimeout(hideTip, 80);
  });
  document.addEventListener('focusin', function (e) { var a = entLink(e.target); if (a && !touching) showTip(a, false); });
  document.addEventListener('focusout', function (e) { if (entLink(e.target) && !touching) hideTip(); });
  document.addEventListener('scroll', function () { if (!touching) hideTip(); }, true);

  document.addEventListener('click', function (e) {
    var a = entLink(e.target);
    if (a && touching && tipFor !== a) { e.preventDefault(); showTip(a, true); return; }
    if (touching && !tip.contains(e.target)) hideTip();
    if (e.target !== q && !box.contains(e.target)) closeResults();
    if (document.body.classList.contains('nav-open') && !sidebar.contains(e.target) && e.target !== menu) closeMenu();
  });
})();
