/* ── the presentation script ───────────────────────────────────────────────
   Five jobs, no dependencies, no network:
     1. theme toggle, remembered across pages via localStorage
     2. a reading-progress hairline
     3. scrollspy — the nav highlights the section you are actually reading
     4. math — $…$ and $$…$$ through the KaTeX vendored at tools/vendor/
     5. replay — the animations play once, so each figure gets its own control
   Keyboard: t toggles theme; ← / → walk the prev/next pager where one exists.  */
(function () {
  'use strict';

  // ── 1. theme ──────────────────────────────────────────────────────────
  var root = document.documentElement;
  var KEY = 'blueprint-deck-theme';

  function stored() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }
  function remember(v) {
    try { localStorage.setItem(KEY, v); } catch (e) { /* private mode */ }
  }
  function systemDark() {
    return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  }
  function current() {
    return root.getAttribute('data-theme') || (systemDark() ? 'dark' : 'light');
  }
  function apply(v) { root.setAttribute('data-theme', v); remember(v); }

  var saved = stored();
  if (saved === 'dark' || saved === 'light') root.setAttribute('data-theme', saved);

  var themeBtn = document.getElementById('theme');
  if (themeBtn) {
    themeBtn.onclick = function () { apply(current() === 'dark' ? 'light' : 'dark'); };
  }

  // ── 2. reading progress ───────────────────────────────────────────────
  var prog = document.getElementById('prog');
  function scrollable() {
    return Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  }
  function paint() {
    if (!prog) return;
    var pct = Math.min(1, Math.max(0, window.pageYOffset / scrollable()));
    prog.style.width = (pct * 100) + '%';
  }

  // ── 3. scrollspy ──────────────────────────────────────────────────────
  var links = [].slice.call(document.querySelectorAll('#nav ol > li > a[href^="#"]'));
  var targets = links.map(function (a) {
    return document.getElementById(a.getAttribute('href').slice(1));
  });

  function spy() {
    if (!links.length) return;
    // the section whose top is nearest above the reading line wins; the last
    // section wins outright at the bottom, where no top is ever above it.
    var line = window.pageYOffset + window.innerHeight * 0.28;
    var best = 0;
    for (var i = 0; i < targets.length; i++) {
      if (targets[i] && targets[i].offsetTop <= line) best = i;
    }
    if (window.pageYOffset >= scrollable() - 2) best = links.length - 1;
    for (var j = 0; j < links.length; j++) {
      links[j].classList.toggle('on', j === best);
    }
  }

  var queued = false;
  function onScroll() {
    if (queued) return;
    queued = true;
    window.requestAnimationFrame(function () { queued = false; paint(); spy(); });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  paint(); spy();

  // ── keyboard ──────────────────────────────────────────────────────────
  function href(rel) {
    var a = document.querySelector('.pager a[data-rel="' + rel + '"]');
    return a && a.getAttribute('href');
  }
  document.addEventListener('keydown', function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var t = e.target || {};
    if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable) return;

    if (e.key === 't' || e.key === 'T') {
      apply(current() === 'dark' ? 'light' : 'dark');
      e.preventDefault();
      return;
    }
    var go = null;
    if (e.key === 'ArrowRight') go = href('next');
    if (e.key === 'ArrowLeft') go = href('prev');
    if (go) { window.location.href = go; e.preventDefault(); }
  });

  // ── 4. math ───────────────────────────────────────────────────────────
  // A tiny auto-render: KaTeX ships one, in a contrib file we do not vendor,
  // and the whole of what we need is thirty lines. Text nodes only — never
  // touching an element means a `$` inside <code> or <pre> is left alone,
  // which matters here because half the figures are shell and file paths.
  var MATH = /\$\$([^$]+?)\$\$|\$([^$\n]+?)\$/g;
  var SKIP = { CODE: 1, PRE: 1, SCRIPT: 1, STYLE: 1, TEXTAREA: 1, KBD: 1 };

  function typeset(root) {
    if (typeof katex === 'undefined') return;
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        if (n.parentNode && SKIP[n.parentNode.nodeName]) return NodeFilter.FILTER_REJECT;
        if (n.parentNode && n.parentNode.classList &&
            n.parentNode.classList.contains('katex')) return NodeFilter.FILTER_REJECT;
        return n.nodeValue.indexOf('$') === -1
          ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
      }
    });
    var todo = [], n;
    while ((n = walker.nextNode())) todo.push(n);

    todo.forEach(function (node) {
      var text = node.nodeValue, out = document.createDocumentFragment();
      var at = 0, m;
      MATH.lastIndex = 0;
      while ((m = MATH.exec(text))) {
        if (m.index > at) out.appendChild(document.createTextNode(text.slice(at, m.index)));
        var span = document.createElement('span');
        try {
          katex.render(m[1] || m[2], span, { displayMode: !!m[1], throwOnError: false });
        } catch (e) { span.textContent = m[0]; }
        out.appendChild(span);
        at = m.index + m[0].length;
      }
      if (!at) return;
      if (at < text.length) out.appendChild(document.createTextNode(text.slice(at)));
      node.parentNode.replaceChild(out, node);
    });
  }
  typeset(document.querySelector('main') || document.body);

  // ── 5. replay ─────────────────────────────────────────────────────────
  // The animated figures are single-play GIFs. Restarting one means re-fetching
  // it, and a cache-busting query is the only way to make a browser do that.
  [].slice.call(document.querySelectorAll('figure img[data-replay]')).forEach(function (img) {
    var src = img.getAttribute('src');
    var btn = document.createElement('button');
    btn.className = 'replay';
    btn.type = 'button';
    btn.innerHTML = '\u21bb replay';
    btn.title = 'play the animation again';
    btn.onclick = function () { img.src = src + '?t=' + (+new Date()); };
    img.parentNode.insertBefore(btn, img);
  });

  // exposed for the smoke test, which has no browser to click in
  window.__deck = { apply: apply, current: current, spy: spy, paint: paint,
                    links: links, typeset: typeset };
})();
