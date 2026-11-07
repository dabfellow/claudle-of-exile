// The wiki's calculators. Game numbers arrive in #tool-data, worked out by the game's own code at build time; this only does the sums.
(function () {
  var host = document.querySelector('[data-tool]');
  if (!host) return;
  var data = JSON.parse(document.getElementById('tool-data').textContent);

  function h(tag, attrs, kids) {
    var el = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) { if (k === 'text') el.textContent = attrs[k]; else el.setAttribute(k, attrs[k]); });
    (kids || []).forEach(function (c) { if (c != null) el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return el;
  }
  function field(label, control) { return h('label', { class: 'tool-field' }, [h('span', { text: label }), control]); }
  function fill(sel, opts) {
    sel.textContent = '';
    opts.forEach(function (o) {
      if (o.group) sel.appendChild(h('optgroup', { label: o.group }, o.items.map(function (i) { return h('option', { value: i[0], text: i[1] }); })));
      else sel.appendChild(h('option', { value: o[0], text: o[1] }));
    });
    return sel;
  }
  function select(opts) { return fill(h('select'), opts); }
  function number(value, min, max) { var n = h('input', { type: 'number', value: value, min: min }); if (max != null) n.max = max; return n; }
  function val(n) { var v = parseFloat(n.value); return isNaN(v) ? 0 : Math.max(+n.min || 0, n.max ? Math.min(+n.max, v) : v); }
  function count(n, digits) { return (+n).toLocaleString('en', { maximumFractionDigits: digits || 0 }); }
  function pct(p) { var v = p * 100; return (v >= 1 ? +v.toFixed(2) : +v.toPrecision(3)) + '%'; }
  function span(ms) {
    var m = ms / 60000;
    if (m < 1) return Math.max(1, Math.round(ms / 1000)) + ' sec';
    if (m < 60) return Math.round(m) + ' min';
    var hrs = m / 60;
    return hrs < 48 ? +hrs.toFixed(1) + ' hours' : +(hrs / 24).toFixed(1) + ' days';
  }
  function table(head, rows) {
    return h('div', { class: 'tw' }, [h('table', {}, [
      h('thead', {}, [h('tr', {}, head.map(function (t) { return h('th', { text: t }); }))]),
      h('tbody', {}, rows.map(function (r) { return h('tr', {}, r.map(function (c) { return h('td', {}, [c == null ? '' : typeof c === 'object' ? c : String(c)]); })); })),
    ])]);
  }
  function note(text, cls) { return h('p', { class: 'tool-note ' + (cls || ''), text: text }); }
  function shell(controls) {
    var out = h('div', { class: 'tool-out', 'aria-live': 'polite' });
    host.appendChild(h('div', { class: 'tool-form' }, controls));
    host.appendChild(out);
    return out;
  }
  function watch(els, fn) {
    els.forEach(function (e) { e.addEventListener('input', fn); e.addEventListener('change', fn); });
    fn();
  }
  function show(out, kids) { out.textContent = ''; kids.forEach(function (k) { if (k) out.appendChild(k); }); }

  var TOOLS = {
    drop: function () {
      var area = select(data.areas.map(function (a, i) { return [i, 'Act ' + a.act + ': ' + a.n]; }));
      var what = h('select'), rarity = number(0, 0), kills = number(100, 1), own = number(1, 0, 100);
      var ownField = field('Your own chance per try (%)', own);
      var list = [];
      function rebuild() {
        var a = data.areas[area.value], t = data.tiers[a.tier], b = data.bosses[a.tier], kept = what.value;
        var sum = Object.keys(a.cur).reduce(function (n, k) { return n + a.cur[k]; }, 0);
        var cur = function (r) { return t.cc * (1 + r / 300); }, uni = function (c) { return function (r) { return c * (1 + r / 100); }; };
        list = [['Any orb', cur], ['Any item', function () { return t.ic; }], ['A rare item', function (r) {
          var m = 1 + r / 100, w = t.rarity;
          return t.ic * (w.rare * m) / (w.normal + w.magic * m + w.rare * m);
        }], ['Any flask', function () { return t.fc; }]];
        Object.keys(a.cur).forEach(function (k) { if (a.cur[k]) list.push([k, function (r) { return cur(r) * a.cur[k] / sum; }]); });
        if (a.u.length) {
          list.push(['Any unique here', uni(t.uc)]);
          a.u.forEach(function (n) { list.push([n, function (r) { return uni(t.uc)(r) / a.u.length; }]); });
          list.push(['Any unique, from the boss', uni(b.uc)]);
          a.u.forEach(function (n) { list.push([n + ', from the boss', function (r) { return uni(b.uc)(r) / a.u.length; }]); });
        }
        list.push(['My own chance', null]);
        fill(what, list.map(function (x, i) { return [i, x[0]]; }));
        var again = list.findIndex(function (x) { return x[0] === kept; });
        what.value = again >= 0 ? again : 0;
      }
      area.addEventListener('change', rebuild);
      rebuild();
      var out = shell([field('Area', area), field('What you want', what), field('Item Rarity (%)', rarity), ownField, field('Kills or tries', kills)]);
      watch([area, what, rarity, kills, own], function () {
        var pick = list[what.value] || list[0], p = pick[1] ? pick[1](val(rarity)) : val(own) / 100, n = val(kills);
        ownField.hidden = !!pick[1];
        var chance = 1 - Math.pow(1 - p, n);
        var need = function (x) { return p >= 1 ? 1 : p <= 0 ? '—' : count(Math.ceil(Math.log(1 - x) / Math.log(1 - p))); };
        show(out, [
          h('p', { class: 'tool-big', text: pct(chance) + ' chance of at least one after ' + count(n) + ' tries' }),
          table(['Chance per try', 'Tries for 50%', 'Tries for 90%', 'Tries for 99%'], [[pct(p), need(0.5), need(0.9), need(0.99)]]),
          note('A try is one kill of a full-size monster, or one boss kill for boss rows. Smaller pack monsters roll orbs, items, flasks and gems less often, and events can add more rolls.'),
        ]);
      });
    },

    craft: function () {
      var skill = select(data.skills.map(function (s) { return [s, s]; })), recipe = h('select'), times = number(10, 1), speed = number(0, 0);
      var have = {}, haveBox = h('div', { class: 'tool-form' });
      function current() { return data.recipes[recipe.value]; }
      function pickSkill() {
        var opts = [];
        data.recipes.forEach(function (r, i) { if (r.skill === skill.value) opts.push([i, r.n + ' (level ' + r.lvl + ')']); });
        fill(recipe, opts);
        drawHave();
      }
      function drawHave() {
        haveBox.textContent = '';
        Object.keys(current().in).forEach(function (m) {
          var input = number(have[m] || 0, 0);
          input.addEventListener('input', function () { have[m] = val(input); draw(); });
          haveBox.appendChild(field('Have: ' + m, input));
        });
      }
      var out = shell([field('Skill', skill), field('Recipe', recipe), field('Times to make', times), field('Speed bonus (%)', speed)]);
      function draw() {
        var r = current(), n = val(times), short = 0;
        var rows = Object.keys(r.in).map(function (m) {
          var need = r.in[m] * n, got = have[m] || 0, miss = Math.max(0, need - got);
          if (miss) short++;
          return [m, count(need), count(got), miss ? h('span', { class: 'bad', text: count(miss) }) : h('span', { class: 'good', text: 'None' })];
        });
        var ms = r.ms * n / (1 + val(speed) / 100);
        show(out, [
          h('p', { class: 'tool-big', text: span(ms) + ' for ' + count(n) + ' × ' + r.n }),
          rows.length ? table(['Material', 'Needed', 'You have', 'Short by'], rows) : note('This recipe needs no materials.'),
          note('Makes ' + (r.out || 'an item') + ' each time. Needs ' + r.skillName + ' level ' + r.lvl + (r.where ? ' and ' + r.where : '') + '. Gives ' + count(r.xp * n) + ' XP before bonuses.'),
          note(short ? 'You are short of ' + short + (short === 1 ? ' material.' : ' materials.') : 'You have everything you need.', short ? 'bad' : 'good'),
        ]);
      }
      skill.addEventListener('change', function () { pickSkill(); draw(); });
      recipe.addEventListener('change', function () { drawHave(); draw(); });
      pickSkill();
      host.lastChild.before(haveBox);
      watch([times, speed], draw);
    },

    xp: function () {
      var mode = select([['char', 'Character level'], ['skill', 'Life skill']]);
      var from = number(1, 1, 100), to = number(20, 1, 100);
      var area = select(data.areas.map(function (a, i) { return [i, 'Act ' + a.act + ': ' + a.n + ' (' + a.min + '-' + a.max + ')']; }));
      var kpm = number(20, 0), bonus = number(0, 0);
      var skill = select(data.spots.map(function (s, i) { return [i, s.n]; })), spot = h('select');
      var f = { area: field('Area', area), kpm: field('Kills per minute (from your own play)', kpm), skill: field('Skill', skill), spot: field('Spot or recipe', spot) };
      function pickSkill() { fill(spot, data.spots[skill.value].spots.map(function (s, i) { return [i, s.n + ' (level ' + s.lvl + ')']; })); }
      skill.addEventListener('change', pickSkill);
      pickSkill();
      var out = shell([field('Planning', mode), field('From level', from), field('To level', to), f.area, f.kpm, f.skill, f.spot, field('XP or speed bonus (%)', bonus)]);
      function multAt(level, a) {
        if (level > a.max) return data.over[Math.min(level - a.max, data.over.length) - 1];
        if (level < a.min) return data.under[Math.min(a.min - level, data.under.length) - 1];
        return 1;
      }
      watch([mode, from, to, area, kpm, bonus, skill, spot], function () {
        var char = mode.value === 'char', a = val(from), b = val(to);
        [f.area, f.kpm].forEach(function (e) { e.hidden = !char; });
        [f.skill, f.spot].forEach(function (e) { e.hidden = char; });
        if (b <= a) return show(out, [note('Set a target level above your current level.', 'bad')]);
        var boost = 1 + val(bonus) / 100, curve = char ? data.char : data.skill, top = char ? 100 : 99;
        if (b > top) return show(out, [note('Life skills stop at level 99.', 'bad')]);
        var total = curve[b] - curve[a];
        if (!char) {
          var s = data.spots[skill.value].spots[spot.value], ms = (total / (s.xp * boost)) * s.ms;
          return show(out, [
            h('p', { class: 'tool-big', text: span(ms) + ' to reach level ' + b }),
            table(['XP needed', 'Actions', 'XP per hour'], [[count(total), count(Math.ceil(total / (s.xp * boost))), count(s.xp * boost * 3600000 / s.ms)]]),
            note('Assumes the spot stays open and you stay on it, with no misses. Higher-level spots give more XP, so moving up as you level will be quicker.'),
          ]);
        }
        var z = data.areas[area.value], kills = 0, stuck = 0;
        for (var l = a; l < b; l++) {
          var gain = z.xp * multAt(l, z) * boost;
          if (gain <= 0) { stuck = l; break; }
          kills += (curve[l + 1] - curve[l]) / gain;
        }
        var rate = val(kpm);
        show(out, [
          stuck ? note('No XP past level ' + stuck + ' here. Pick a later area.', 'bad') : h('p', { class: 'tool-big', text: (rate ? span((kills / rate) * 60000) : '—') + ' to reach level ' + b }),
          table(['XP needed', 'Kills needed', 'XP per kill here'], [[count(total), stuck ? '—' : count(Math.ceil(kills)), count(z.xp, 1)]]),
          note('An estimate. XP per kill is this area\'s average monster at full size, without bosses. Your clear speed is the number you enter, and survival, deaths and travel aren\'t counted.'),
        ]);
      });
    },

    compare: function () {
      var opts = data.groups.map(function (g) { return { group: g.n, items: g.items.map(function (i) { return [i, data.items[i].n]; }) }; });
      var a = select(opts), b = select(opts);
      a.value = data.start[0]; b.value = data.start[1];
      var out = shell([field('First item', a), field('Second item', b)]);
      watch([a, b], function () {
        var x = data.items[a.value], y = data.items[b.value], labels = [];
        [x, y].forEach(function (i) { i.fig.forEach(function (f) { if (labels.indexOf(f[0]) < 0) labels.push(f[0]); }); });
        var cell = function (i, label) { return i.fig.filter(function (f) { return f[0] === label; })[0]; };
        var text = function (f) { return f ? count(f[1], f[2]) + (f[3] || '') : '—'; };
        var rows = labels.map(function (label) {
          var p = cell(x, label), q = cell(y, label), d = (q ? q[1] : 0) - (p ? p[1] : 0), digits = (p || q)[2];
          return [label, text(p), text(q), d ? h('span', { class: d > 0 ? 'good' : 'bad', text: (d > 0 ? '+' : '−') + count(Math.abs(d), digits) }) : 'Same'];
        });
        rows.unshift(['Required level', x.lvl, y.lvl, y.lvl === x.lvl ? 'Same' : (y.lvl > x.lvl ? '+' : '−') + Math.abs(y.lvl - x.lvl)]);
        rows.unshift(['Slot', x.slot, y.slot, x.slot === y.slot ? 'Same' : 'Different']);
        var mods = function (i) { return h('div', {}, i.mods.length ? i.mods.map(function (m) { return h('div', { text: m }); }) : ['None']); };
        rows.push(['Attributes', x.req || 'None', y.req || 'None', '']);
        rows.push(['Modifiers', mods(x), mods(y), '']);
        show(out, [table(['', x.n, y.n, 'Second vs first'], rows), note('Differences for the second item against the first. Green is higher, which isn\'t always better for your build. Normal bases show their own stats, before rolled modifiers.')]);
      });
    },

    rules: function () {
      var skill = select(data.skills.map(function (s, i) { return [i, s.n]; }));
      var table_ = select(data.levels.map(function (l) { return [l.level, 'Level ' + l.level + ': ' + l.text]; }));
      table_.value = data.levels[data.levels.length - 1].level;
      var prio = select([['high', 'High'], ['normal', 'Normal'], ['low', 'Low']]);
      prio.value = 'normal';
      var ruleOpts = [['', 'No rule']].concat(data.rules.map(function (r, i) { return [i, r.label]; }));
      var rows = [0, 1, 2].map(function (i) {
        var when = select(ruleOpts), value = number(0, 0), extra = h('select');
        var row = h('div', { class: 'tool-form' }, [field('Rule ' + (i + 1), when), field('Value', value), field('Choose', extra)]);
        row.when = when; row.value = value; row.extra = extra;
        when.addEventListener('change', function () {
          var r = data.rules[when.value];
          if (r && r.def != null) value.value = r.def;
          if (r && (r.status || r.ground)) fill(extra, (r.status ? data.statuses : data.grounds).map(function (s) { return [s, s]; }));
        });
        return row;
      });
      var out = shell([field('Skill', skill), field('War Table', table_), field('Priority', prio)]);
      rows.forEach(function (r) { out.before(r); });
      function setSuggested() {
        var s = data.skills[skill.value];
        rows.forEach(function (r) { r.when.value = ''; });
        rows[0].when.value = s.rule.i;
        if (s.rule.value != null) rows[0].value.value = s.rule.value;
        rows[0].when.dispatchEvent(new Event('change'));
        if (s.rule.value != null) rows[0].value.value = s.rule.value;
      }
      skill.addEventListener('change', setSuggested);
      setSuggested();
      var inputs = [skill, table_, prio];
      rows.forEach(function (r) { inputs.push(r.when, r.value, r.extra); });
      watch(inputs, function () {
        var s = data.skills[skill.value], lvl = +table_.value, warn = [], parts = [];
        var slots = data.levels.filter(function (l) { return l.level <= lvl; }).reduce(function (n, l) { return Math.max(n, l.slots || 0); }, 1);
        var chosen = [];
        rows.forEach(function (row, i) {
          var r = data.rules[row.when.value], needsValue = r && r.def != null, needsPick = r && (r.status || r.ground);
          row.children[1].hidden = !needsValue;
          row.children[2].hidden = !needsPick;
          if (!r) return;
          if (i >= slots) warn.push('Rule ' + (i + 1) + ' needs ' + slots + ' more rule slot' + (i + 1 - slots > 1 ? 's' : '') + '. Raise the War Table.');
          chosen.push({ r: r, v: +row.value.value, x: row.extra.value });
          var text = r.label + (needsValue ? ' ' + row.value.value + (r.unit || '') : '') + (needsPick ? ' ' + row.extra.value : '');
          parts.push(text.toLowerCase());
          if (r.level > lvl) warn.push('"' + r.label + '" needs War Table level ' + r.level + '. A locked rule never passes.');
          if (r.act) warn.push('"' + r.label + '" only matters from Act ' + r.act + '.');
        });
        var has = function (id) { return chosen.filter(function (c) { return c.r.id === id; })[0]; };
        var clash = function (lo, hi, name) { var a = has(lo), b = has(hi); if (a && b && a.v <= b.v) warn.push('These can never both pass: ' + name + ' below ' + a.v + '% and above ' + b.v + '%.'); };
        clash('lifeBelow', 'lifeAbove', 'life');
        clash('manaBelow', 'manaAbove', 'mana');
        if (has('manual') && chosen.length > 1) warn.push('Manual only stands alone. Choosing it clears your other rules.');
        if (has('targetHas') && has('targetLacks') && has('targetHas').x === has('targetLacks').x) warn.push('The target can\'t both have and lack ' + has('targetHas').x + '.');
        if (has('notActive') && !s.tracked) warn.push('This skill leaves nothing to track, so "' + has('notActive').r.label + '" always passes.');
        if (has('frostbite') && !s.cleanses) warn.push('Only a guard or movement skill shakes off Frostbite.');
        if (has('enemyChannels') && !s.breaks) warn.push('This skill can\'t interrupt or stun, so it won\'t break a channel.');
        var lines = [];
        if (!chosen.length) lines.push('With no rule set, this skill won\'t have a rule to run on. Every skill keeps at least one.');
        else if (has('manual')) lines.push(s.n + ' never fires by itself. It only fires when you press it.');
        else lines.push(s.n + ' fires ' + (has('always') && chosen.length === 1 ? 'as soon as it\'s ready.' : parts.join(', and ') + '.'));
        lines.push('It also needs ' + s.mana + ' mana' + (s.cd ? ' and its ' + s.cd + ' cooldown' : '') + (s.melee ? ', and a target it can reach.' : '.'));
        lines.push(prio.value === 'normal' ? 'At Normal priority it\'s tried after any High skills.' : prio.value === 'high' ? 'At High priority it\'s tried before everything else.' : 'At Low priority it waits until all other skills have had their turn.');
        show(out, [h('p', { class: 'tool-big', text: lines[0] }), note(lines[1]), note(lines[2])].concat(warn.map(function (w) { return note(w, 'bad'); })).concat(warn.length ? [] : [note('No problems found.', 'good')]));
      });
    },

    build: function () {
      var byId = {};
      data.skills.forEach(function (s, i) { byId[s.id] = i; });
      var cls = select(data.classes.map(function (c) { return [c.id, c.n]; })), level = number(30, 1, 100);
      var skillOpts = [['', 'Empty']].concat(data.skills.slice().sort(function (a, b) { return a.n.localeCompare(b.n); }).map(function (s) { return [s.id, s.n + ' (level ' + s.lvl + ')']; }));
      var bar = [];
      for (var i = 0; i < data.bar; i++) bar.push({ skill: select(skillOpts), gem: number(1, 1, 20), expand: h('input', { type: 'checkbox' }), box: h('div', { class: 'tool-sockets' }), sup: [] });
      var slots = bar.map(function (b, n) {
        return h('div', { class: 'tool-slot' }, [h('h3', { text: 'Skill ' + (n + 1) }), h('div', { class: 'tool-form' }, [field('Skill gem', b.skill), field('Gem level', b.gem), field('Orb of Expansion', b.expand)]), b.box]);
      });
      var out = shell([field('Class', cls), field('Character level', level)]);
      slots.forEach(function (s) { out.before(s); });
      var share = h('button', { type: 'button', class: 'tool-button', text: 'Copy a link to this build' });
      out.after(share);
      function sockets(b) { return Math.min(data.maxSockets, Math.min(4, 1 + Math.floor(val(b.gem) / 5)) + (b.expand.checked ? 1 : 0)); }
      function drawSockets(b) {
        var s = data.skills[byId[b.skill.value]], kept = b.sup.map(function (x) { return x.value; });
        b.box.textContent = '';
        b.sup = [];
        if (!s) return;
        var opts = [['', 'Empty']].concat(s.sup.map(function (i) { return [data.supports[i].id, data.supports[i].n + ' (level ' + data.supports[i].lvl + ')']; }));
        for (var n = 0; n < sockets(b); n++) {
          var sel = select(opts);
          sel.value = opts.some(function (o) { return o[0] === kept[n]; }) ? kept[n] || '' : '';
          sel.addEventListener('change', draw);
          b.sup.push(sel);
          b.box.appendChild(field('Support ' + (n + 1), sel));
        }
      }
      function encode() {
        return 'c=' + cls.value + '&l=' + val(level) + '&b=' + bar.map(function (b) {
          return b.skill.value ? [b.skill.value, val(b.gem), b.expand.checked ? 1 : 0].concat(b.sup.map(function (x) { return x.value; })).join('.') : '';
        }).join('~');
      }
      function draw() {
        var used = bar.filter(function (b) { return b.skill.value; }), warn = [], weapons = null, needLevel = 1, attrs = {};
        var c = data.classes.filter(function (x) { return x.id === cls.value; })[0], lvl = val(level), seen = {};
        used.forEach(function (b) {
          var s = data.skills[byId[b.skill.value]], g = val(b.gem);
          if (seen[s.id]) warn.push(s.n + ' is on your bar twice.');
          seen[s.id] = 1;
          needLevel = Math.max(needLevel, s.levels[g - 1]);
          attrs[s.attr] = Math.max(attrs[s.attr] || 0, s.attrs[g - 1]);
          if (s.w) weapons = weapons ? weapons.filter(function (w) { return s.w.indexOf(w) >= 0; }) : s.w.slice();
          var picked = {};
          b.sup.forEach(function (x) {
            if (!x.value) return;
            var p = data.supports.filter(function (y) { return y.id === x.value; })[0];
            if (picked[p.id]) warn.push(p.n + ' is socketed twice in ' + s.n + '.');
            picked[p.id] = 1;
            needLevel = Math.max(needLevel, p.lvl);
          });
        });
        if (needLevel > lvl) warn.push('This build needs character level ' + needLevel + '.');
        if (weapons && !weapons.length) warn.push('No single main-hand weapon can use all these skills. Gear sets can switch, but only one weapon is held at a time.');
        var rows = [
          ['Skills on the bar', used.length + ' of ' + data.bar],
          ['Character level needed', needLevel],
          ['Main-hand weapon', !used.length ? '—' : weapons === null ? 'Any' : weapons.length ? weapons.map(function (w) { return data.weapons[w]; }).join(', ') : 'None fits'],
        ];
        Object.keys(attrs).forEach(function (a) { rows.push([data.attrs[a] + ' needed', count(attrs[a]) + ' (' + c.n + ' starts with ' + c.attr[a] + ')']); });
        show(out, [table(['Your build', ''], rows)].concat(warn.map(function (w) { return note(w, 'bad'); })).concat(used.length && !warn.length ? [note('No problems found.', 'good')] : []).concat([note('Checks use the game\'s own support rules and gem requirements. It doesn\'t estimate damage or survival.')]));
        history.replaceState(null, '', '#' + encode());
      }
      bar.forEach(function (b) {
        [b.skill, b.gem, b.expand].forEach(function (e) { e.addEventListener('change', function () { drawSockets(b); draw(); }); });
      });
      [cls, level].forEach(function (e) { e.addEventListener('input', draw); });
      share.addEventListener('click', function () {
        var done = function () { share.textContent = 'Link copied'; setTimeout(function () { share.textContent = 'Copy a link to this build'; }, 1500); };
        if (navigator.clipboard) navigator.clipboard.writeText(location.href).then(done, function () { share.textContent = 'Copy the address bar instead'; });
        else share.textContent = 'Copy the address bar instead';
      });
      var saved = {};
      location.hash.slice(1).split('&').forEach(function (p) { var kv = p.split('='); saved[kv[0]] = decodeURIComponent(kv[1] || ''); });
      if (data.classes.some(function (c) { return c.id === saved.c; })) cls.value = saved.c;
      if (saved.l) level.value = saved.l;
      (saved.b || '').split('~').forEach(function (entry, n) {
        var bits = entry.split('.'), b = bar[n];
        if (!b || byId[bits[0]] == null) return;
        b.skill.value = bits[0];
        b.gem.value = bits[1] || 1;
        b.expand.checked = bits[2] === '1';
        drawSockets(b);
        b.sup.forEach(function (x, i) { var v = bits[i + 3]; if (v && [].some.call(x.options, function (o) { return o.value === v; })) x.value = v; });
      });
      draw();
    },
  };

  TOOLS[host.dataset.tool]();
})();
