/* ハレバ hare-bar.com — ページの動き。ライブラリなし。
   1. メニューと計測  2. 現れる動き  3. 三つの顔(行に触れると右に写真が開く)
   4. 沈むカード(bencho の Tilt を移植)  5. 火の粉の名前(bencho の Particles を移植)
   bencho(https://github.com/cabralorenzo/bencho、MIT)の React 実装を、このサイト用に素の JS で書き直したもの。 */
(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var spring = function (tune) { return { k: 0.08 + (tune / 100) * 0.16, d: 0.62 + (tune / 100) * 0.2 }; };

  /* ── 1. メニューと計測 ─────────────────────────────────────── */
  var btn = document.getElementById('menuBtn'), nav = document.getElementById('nav');
  if (btn && nav) {
    btn.addEventListener('click', function () {
      var open = document.body.classList.toggle('nav-open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      btn.setAttribute('aria-label', open ? 'メニューを閉じる' : 'メニューを開く');
    });
    nav.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') { document.body.classList.remove('nav-open'); btn.setAttribute('aria-expanded', 'false'); }
    });
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a'); if (!a || typeof window.gtag !== 'function') return;
    var href = a.getAttribute('href') || '';
    var name = href.indexOf('mailto:') === 0 ? 'click_mail'
      : href.indexOf('instagram.com') > -1 ? 'click_instagram'
      : href.indexOf('tablecheck') > -1 ? 'click_reserve'
      : a.closest('#reserve') ? 'click_reserve'
      : a.closest('.vendors') ? 'click_vendor' : null;
    if (name) gtag('event', name, { link_text: (a.textContent || '').trim().slice(0, 40) });
  });

  /* ── 2. 現れる動き ───────────────────────────────────────── */
  var reveals = document.querySelectorAll('.reveal');
  if (reduce || !('IntersectionObserver' in window)) {
    reveals.forEach(function (el) { el.classList.add('is-in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px 60% 0px', threshold: 0.01 });
    reveals.forEach(function (el) { io.observe(el); });
    /* 保険: 何かの理由で発火しなくても、3 秒後には全部見える */
    setTimeout(function () { reveals.forEach(function (el) { el.classList.add('is-in'); }); }, 3000);
  }

  /* ── 3. 三つの顔: 行に触れると、その行の高さに合わせて右に写真が開く ── */
  var list = document.querySelector('.faces-list'), frame = document.getElementById('facesFrame');
  if (list && frame && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    var pic = frame.querySelector('img'), warmed = false;
    var show = function (row) {
      if (!warmed) { warmed = true; list.querySelectorAll('[data-preview]').forEach(function (a) { new Image().src = a.dataset.preview; }); }
      pic.src = row.dataset.preview;
      var y = row.offsetTop + row.offsetHeight / 2 - frame.offsetHeight / 2;
      var max = list.offsetHeight - frame.offsetHeight;
      var opening = !frame.classList.contains('is-open');
      if (opening) frame.style.transitionProperty = 'clip-path';
      frame.style.transform = 'translateY(' + Math.min(max, Math.max(0, y)) + 'px)';
      if (opening) { frame.getBoundingClientRect(); frame.style.transitionProperty = ''; }
      frame.classList.add('is-open');
    };
    list.querySelectorAll('.face').forEach(function (row) {
      row.addEventListener('pointerenter', function () { show(row); });
      row.addEventListener('focus', function () { show(row); });
    });
    list.addEventListener('pointerleave', function () { frame.classList.remove('is-open'); });
    list.addEventListener('focusout', function (e) { if (!list.contains(e.relatedTarget)) frame.classList.remove('is-open'); });
  }

  /* ── 4. 沈むカード: 指の下が引っ込み、向こう側が持ち上がる ───────── */
  if (!reduce) {
    document.querySelectorAll('.tilt').forEach(function (card) {
      var img = card.querySelector('img'), shade = card.querySelector('.tilt-shade');
      if (!img) return;
      var ax = 0, ay = 0, on = 0, sx = 0, sy = 0, lit = 0, raf = 0, sp = spring(50), vx = 0, vy = 0, vl = 0;
      var paint = function () {
        img.style.transform = 'translateZ(' + (-12 * lit).toFixed(1) + 'px) rotateX(' + (-sy * 7).toFixed(2) + 'deg) rotateY(' + (sx * 7).toFixed(2) + 'deg)';
        if (shade) shade.style.opacity = (0.16 * lit).toFixed(3);
      };
      var run = function () {
        if (raf) return;
        var prev = 0;
        var tick = function (t) {
          var dt = prev ? clamp((t - prev) / 16.67, 0, 2.5) : 1; prev = t;
          var tx = on ? ax : 0, ty = on ? ay : 0, tl = on ? 1 : 0;
          vx += (tx - sx) * sp.k * dt; vx *= Math.pow(sp.d, dt); sx += vx * dt;
          vy += (ty - sy) * sp.k * dt; vy *= Math.pow(sp.d, dt); sy += vy * dt;
          vl += (tl - lit) * sp.k * dt; vl *= Math.pow(sp.d, dt); lit += vl * dt;
          paint();
          var still = Math.abs(tx - sx) < 0.002 && Math.abs(ty - sy) < 0.002 && Math.abs(tl - lit) < 0.002 && Math.abs(vx) + Math.abs(vy) + Math.abs(vl) < 0.003;
          if (still) { sx = tx; sy = ty; lit = tl; paint(); raf = 0; } else raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      };
      card.addEventListener('pointermove', function (e) {
        var r = card.getBoundingClientRect();
        ax = clamp(((e.clientX - r.left) / r.width) * 2 - 1, -1, 1);
        ay = clamp(((e.clientY - r.top) / r.height) * 2 - 1, -1, 1);
        on = 1; run();
      });
      card.addEventListener('pointerout', function (e) { var to = e.relatedTarget; if (!to || !card.contains(to)) { on = 0; run(); } });
      card.addEventListener('pointercancel', function () { on = 0; run(); });
    });
  }

  /* ── 5. 火の粉の名前: 「ハレバ」を点で描く。指で散り、また集まる。押すと一度はじける ── */
  var mark = document.getElementById('mark'), cv = document.getElementById('markCanvas'), markText = document.getElementById('markText');
  if (mark && cv && cv.getContext) {
    var ctx = cv.getContext('2d'), dots = [], hand = null, raf4 = 0, W = 0, H = 0, dpr = 1;
    var draw = function () {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < dots.length; i++) {
        var d = dots[i], sp = Math.hypot(d.vx, d.vy);
        ctx.fillStyle = d.c; ctx.beginPath();
        if (sp < 0.3) ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        else { var s = Math.min(2.6, 1 + sp * 0.12), rot = Math.atan2(d.vy, d.vx); ctx.ellipse(d.x, d.y, d.r * s, d.r / Math.sqrt(s), rot, 0, Math.PI * 2); }
        ctx.fill();
      }
    };
    var run4 = function () {
      if (raf4 || reduce) { if (reduce) draw(); return; }
      var prev = 0;
      var tick = function (t) {
        var dt = prev ? clamp((t - prev) / 16.67, 0, 2.5) : 1; prev = t;
        var h = hand, R = 90, S = 6.6, busy = !!h;
        for (var i = 0; i < dots.length; i++) {
          var d = dots[i];
          if (h) { var dx = d.x - h.x, dy = d.y - h.y, dd = Math.hypot(dx, dy); if (dd < R && dd > 0.01) { var f = Math.pow(1 - dd / R, 2) * S; d.vx += (dx / dd) * f * dt; d.vy += (dy / dd) * f * dt; } }
          d.vx = (d.vx + (d.hx - d.x) * 0.05 * dt) * Math.pow(0.84, dt);
          d.vy = (d.vy + (d.hy - d.y) * 0.05 * dt) * Math.pow(0.84, dt);
          d.x += d.vx * dt; d.y += d.vy * dt;
          if (Math.abs(d.hx - d.x) < 0.05 && Math.abs(d.hy - d.y) < 0.05 && Math.abs(d.vx) < 0.02 && Math.abs(d.vy) < 0.02) { d.x = d.hx; d.y = d.hy; d.vx = 0; d.vy = 0; } else busy = true;
        }
        draw();
        raf4 = busy ? requestAnimationFrame(tick) : 0;
      };
      raf4 = requestAnimationFrame(tick);
    };
    var build = function () {
      var r = mark.getBoundingClientRect(); W = Math.round(r.width); H = Math.round(r.height);
      if (!W || !H) return;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      var off = document.createElement('canvas'); off.width = W; off.height = H;
      var g = off.getContext('2d'), cs = getComputedStyle(markText);
      g.font = cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
      g.textBaseline = 'top'; g.fillStyle = '#fff'; g.strokeStyle = '#fff'; g.lineJoin = 'round';
      g.lineWidth = Math.max(4, parseFloat(cs.fontSize) * 0.07);
      var tx = (W - g.measureText('ハレバ').width) / 2;
      g.strokeText('ハレバ', tx, 0); g.fillText('ハレバ', tx, 0);
      var px = g.getImageData(0, 0, W, H).data;
      var step = Math.max(4, Math.round(W / 260));
      var homes = [];
      for (var y = Math.floor(step / 2); y < H; y += step) for (var xx = Math.floor(step / 2) + ((y / step) % 2 ? Math.floor(step / 2) : 0); xx < W; xx += step) {
        if (px[(y * W + xx) * 4 + 3] > 128) homes.push([xx, y]);
      }
      var old = dots; dots = homes.map(function (h, i) {
        var o = old.length ? old[i % old.length] : null;
        return { hx: h[0], hy: h[1], x: o ? o.x : h[0] + (Math.random() - 0.5) * 60, y: o ? o.y : h[1] + (Math.random() - 0.5) * 60, vx: 0, vy: 0, c: Math.random() < 0.7 ? '#D9521F' : '#F0A15A', r: 1.3 + Math.random() * 1.2 };
      });
      if (reduce) dots.forEach(function (d) { d.x = d.hx; d.y = d.hy; });
      mark.classList.add('is-live');
      draw(); run4();
    };
    var where = function (e) { var r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    cv.addEventListener('pointermove', function (e) { if (reduce) return; hand = where(e); run4(); });
    cv.addEventListener('pointerleave', function () { hand = null; run4(); });
    cv.addEventListener('pointerdown', function (e) {
      if (reduce) return; var p = where(e);
      for (var i = 0; i < dots.length; i++) { var d = dots[i], dx = d.x - p.x, dy = d.y - p.y, dd = Math.hypot(dx, dy); if (dd > 220 || dd < 0.01) continue; var f = (1 - dd / 220) * 33; d.vx += (dx / dd) * f; d.vy += (dy / dd) * f; }
      run4();
    });
    var ready = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
    ready.then(build);
    var rt = 0; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(build, 200); });
  }
})();
