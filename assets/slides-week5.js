/* Week 5 slide widgets: Monte Carlo simulation.
   Loaded after slides.js by week5-slides.html. */
(() => {
  const $ = id => document.getElementById(id);
  const NS = 'http://www.w3.org/2000/svg';
  const stopKeys = el => el.addEventListener('keydown', e => e.stopPropagation());
  const fmt = (x, d = 1) => x.toFixed(d);
  const thin = n => n.toLocaleString('en-GB').replace(/,/g, ' ');   // 10 000
  // small seeded generator (mulberry32) so every widget behaves like a PRNG
  function prng(seed) {
    let a = seed >>> 0;
    const u = () => {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    let spare = null;
    const normal = (mu, sd) => {        // Box-Muller
      if (spare !== null) { const z = spare; spare = null; return mu + sd * z; }
      let r, v1, v2;
      do { v1 = 2 * u() - 1; v2 = 2 * u() - 1; r = v1 * v1 + v2 * v2; } while (r >= 1 || r === 0);
      const f = Math.sqrt(-2 * Math.log(r) / r);
      spare = v2 * f;
      return mu + sd * v1 * f;
    };
    const beta25 = () => {               // Beta(2, 5): 2nd smallest of 6 uniforms
      const x = [u(), u(), u(), u(), u(), u()].sort((p, q) => p - q);
      return x[1];
    };
    return { u, normal, beta25 };
  }
  const newSeed = () => Math.floor(Math.random() * 4294967296);
  const el = (tag, attrs, text) => {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (text !== undefined) e.textContent = text;
    return e;
  };
  const niceStep = max => {             // tick step for a count axis
    const raw = max / 4, p = Math.pow(10, Math.floor(Math.log10(raw)));
    return [1, 2, 5, 10].map(m => m * p).find(s => s >= raw);
  };

  /* ---------- 1: estimate pi with random points ---------- */
  (() => {
    const svg = $('pi-svg');
    if (!svg) return;
    const out = $('pi-out');
    const X0 = 10, S = 280, MAXDRAW = 3000;
    let g, rnd, n, inside;
    function reset() {
      rnd = prng(newSeed()); n = 0; inside = 0;
      svg.replaceChildren(
        el('rect', { x: X0, y: X0, width: S, height: S, class: 'box' }),
        el('path', { d: `M${X0} ${X0} A${S} ${S} 0 0 1 ${X0 + S} ${X0 + S} L${X0} ${X0 + S} Z`, style: 'fill:#F7F2F8;stroke:var(--accent);stroke-width:2' }));
      g = el('g', {}); svg.append(g);
      show();
    }
    function add(k) {
      const frag = document.createDocumentFragment();
      for (let i = 0; i < k; i++) {
        const x = rnd.u(), y = rnd.u(), inn = x * x + y * y < 1;
        n++; if (inn) inside++;
        if (n <= MAXDRAW) frag.append(el('circle', { cx: fmt(X0 + x * S), cy: fmt(X0 + S - y * S), r: n < 200 ? 3 : 1.8, style: `fill:${inn ? 'var(--accent)' : '#8A93A3'}` }));
      }
      g.append(frag);
      show();
    }
    function show() {
      if (!n) { out.innerHTML = '<span class="muted">No points yet.<br>Click +1 or +100.</span>'; return; }
      const est = 4 * inside / n;
      out.innerHTML = `points N = <b>${thin(n)}</b><br>inside = ${thin(inside)}<br><br>π ≈ 4 × ${thin(inside)} / ${thin(n)}<br>  = <b>${est.toFixed(4)}</b><br><br><span class="muted">true π = 3.1416<br>error = ${(est - Math.PI).toFixed(4)}` +
        (n > MAXDRAW ? `<br>(first ${thin(MAXDRAW)} points drawn)` : '') + '</span>';
    }
    document.querySelectorAll('[data-pi]').forEach(b => b.addEventListener('click', () => {
      const k = Number(b.dataset.pi);
      if (k === 0) reset(); else add(k);
    }));
    reset();
  })();

  /* ---------- 5.2: linear congruential generator ---------- */
  (() => {
    const ia = $('lcg-a');
    if (!ia) return;
    const ic = $('lcg-c'), im = $('lcg-m'), ix = $('lcg-x');
    const seqEl = $('lcg-seq'), out = $('lcg-out'), svg = $('lcg-svg');
    [ia, ic, im, ix].forEach(stopKeys);
    const PRESETS = [
      ['lecture: 5, 1, 16', '5', '1', '16', '3'],
      ['poor: 1, 1, 16', '1', '1', '16', '3'],
      ['stuck: 4, 2, 16', '4', '2', '16', '3'],
      ['large: 7⁵, 102435, 2³¹−1', '16807', '102435', '2147483647', '3']
    ];
    PRESETS.forEach(([lab, a, c, m, x]) => {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = lab;
      b.addEventListener('click', () => { ia.value = a; ic.value = c; im.value = m; ix.value = x; run(); });
      $('lcg-chips').append(b);
    });
    // axes of the scatter plot
    const P0 = 50, PW = 280, PY = 6;
    function axes() {
      svg.replaceChildren(
        el('rect', { x: P0, y: PY, width: PW, height: PW, style: 'fill:#fff;stroke:var(--ink);stroke-width:1.2' }),
        el('text', { x: P0, y: PY + PW + 18, 'font-size': 13, 'text-anchor': 'middle' }, '0'),
        el('text', { x: P0 + PW, y: PY + PW + 18, 'font-size': 13, 'text-anchor': 'middle' }, '1'),
        el('text', { x: P0 + PW / 2, y: PY + PW + 20, 'font-size': 14, 'text-anchor': 'middle' }, 'uₙ'),
        el('text', { x: P0 - 8, y: PY + 12, 'font-size': 13, 'text-anchor': 'end' }, '1'),
        el('text', { x: 16, y: PY + PW / 2, 'font-size': 14, 'text-anchor': 'middle', transform: `rotate(-90 16 ${PY + PW / 2})` }, 'uₙ₊₁'));
    }
    const big = s => { s = s.trim(); return /^\d+$/.test(s) ? BigInt(s) : null; };
    function run() {
      axes();
      const a = big(ia.value), c = big(ic.value), m = big(im.value), x0 = big(ix.value);
      if ([a, c, m, x0].some(v => v === null)) { seqEl.innerHTML = ''; out.innerHTML = '<span style="color:var(--bad)">Use whole numbers ≥ 0.</span>'; return; }
      if (m < 2n || x0 >= m) { seqEl.innerHTML = ''; out.innerHTML = '<span style="color:var(--bad)">Need m ≥ 2 and 0 ≤ seed &lt; m.</span>'; return; }
      // sequence and period
      const seen = new Map(), xs = [];
      let x = x0, period = null, start = null;
      const LIMIT = 200000;
      for (let i = 0; i <= LIMIT; i++) {
        const key = x.toString();
        if (seen.has(key)) { start = seen.get(key); period = i - start; break; }
        seen.set(key, i);
        if (xs.length < 1001) xs.push(x);
        x = (a * x + c) % m;
      }
      while (xs.length < 1001) xs.push((a * xs[xs.length - 1] + c) % m);
      const first20 = xs.slice(0, 20).map(v => v.toString());
      let repIdx = -1, firstIdx = -1;
      if (period !== null && start + period < 20) { repIdx = start + period; firstIdx = start; }
      seqEl.innerHTML = first20.map((v, i) => `<span class="${i === repIdx ? 'rep' : i === firstIdx ? 'first' : ''}">${v}</span>`).join('');
      const mf = Number(m);
      const u = xs.map(v => Number(v) / mf);
      let msg;
      if (period === null) msg = `period: longer than ${thin(LIMIT)} numbers`;
      else if (start === 0) msg = `period <b>${thin(period)}</b>: after ${thin(period)} numbers the sequence is back at the seed and repeats`;
      else msg = `period <b>${thin(period)}</b>: X<sub>${start}</sub> = ${xs[start]} comes back, and the sequence repeats from there`;
      out.innerHTML = msg + `<br><span class="muted">u₀ … u₄ = ${u.slice(0, 5).map(v => v.toFixed(4)).join(', ')}</span>`;
      // scatter of (u_n, u_n+1)
      const pts = new Set(), frag = document.createDocumentFragment();
      for (let i = 0; i < 1000; i++) {
        const key = u[i] + ',' + u[i + 1];
        if (pts.has(key)) continue;
        pts.add(key);
        frag.append(el('circle', { cx: fmt(P0 + u[i] * PW), cy: fmt(PY + PW - u[i + 1] * PW), r: 2.4, class: 'dot' }));
      }
      svg.append(frag);
      svg.append(el('text', { x: P0 + PW - 6, y: PY + 18, 'font-size': 13, 'text-anchor': 'end', class: 'muted' }, `${thin(pts.size)} different points`));
    }
    [ia, ic, im, ix].forEach(i => i.addEventListener('input', run));
    run();
  })();

  /* ---------- 5.3: inverse transform, exponential distribution ---------- */
  (() => {
    const sl = $('it-u');
    if (!sl) return;
    stopKeys(sl);
    const svg = $('it-svg'), LAM = 1.5, XMAX = 3;
    const X = x => 50 + x / XMAX * 480;
    const YF = F => 200 - F * 176;           // CDF panel: 24 (F = 1) to 200 (F = 0)
    const HB = 336, HH = 84, DMAX = 1.6;      // histogram panel: base y and height
    const YD = d => HB - d / DMAX * HH;
    let sample = null;
    function draw() {
      const u = Number(sl.value), x = -Math.log(1 - u) / LAM;
      $('it-uv').textContent = u.toFixed(2);
      const kids = [];
      // CDF axes
      kids.push(el('path', { class: 'line', d: `M50 24 V 200 H 530` }));
      [0, 0.5, 1].forEach(F => { kids.push(el('path', { class: 'line', d: `M44 ${YF(F)} H 50` }), el('text', { x: 40, y: YF(F) + 5, 'font-size': 13, 'text-anchor': 'end' }, String(F))); });
      for (let t = 0; t <= XMAX; t += 0.5) kids.push(el('path', { class: 'line', d: `M${X(t)} 200 v5` }), el('text', { x: X(t), y: 220, 'font-size': 13, 'text-anchor': 'middle' }, String(t)));
      let d = '';
      for (let i = 0; i <= 120; i++) { const t = i / 120 * XMAX; d += (i ? ' L' : 'M') + fmt(X(t)) + ' ' + fmt(YF(1 - Math.exp(-LAM * t))); }
      kids.push(el('path', { d, style: 'stroke:var(--ink);stroke-width:2.4;fill:none' }));
      kids.push(el('text', { x: 520, y: 52, 'font-size': 14, 'text-anchor': 'end' }, 'F(x) = 1 − e^(−1.5x)'));
      // u -> x arrows
      const yu = YF(u), xx = X(Math.min(x, XMAX));
      kids.push(el('path', { class: 'line-acc', d: `M50 ${fmt(yu)} H ${fmt(xx)} V 194` }));
      kids.push(el('path', { class: 'fill-acc', d: `M${fmt(xx)} 200 l-6 -10 h12 z` }));
      kids.push(el('circle', { cx: 50, cy: fmt(yu), r: 5, class: 'fill-acc' }));
      kids.push(el('text', { x: fmt(Math.min(xx, 420) + 10), y: fmt(Math.min(yu + 22, 176)), 'font-size': 15, class: 'acc', 'font-weight': 700 }, `u = ${u.toFixed(2)}`));
      kids.push(el('text', { x: fmt(Math.min(xx + 8, 420)), y: 190, 'font-size': 15, class: 'acc', 'font-weight': 700 }, x > XMAX ? `x = ${x.toFixed(3)} →` : `x = ${x.toFixed(3)}`));
      // histogram panel
      kids.push(el('path', { class: 'line', d: `M50 ${HB} H 530` }));
      kids.push(el('text', { x: 50, y: HB + 18, 'font-size': 13, 'text-anchor': 'middle' }, '0'), el('text', { x: 530, y: HB + 18, 'font-size': 13, 'text-anchor': 'middle' }, '3'), el('text', { x: 290, y: HB + 20, 'font-size': 13, 'text-anchor': 'middle', class: 'muted' }, 'x'));
      if (sample) {
        const W = 0.1, nb = XMAX / W, counts = new Array(nb).fill(0);
        sample.forEach(v => { const k = Math.floor(v / W); if (k < nb) counts[k]++; });
        counts.forEach((c, k) => {
          const dens = c / (sample.length * W), y = YD(Math.min(dens, DMAX));
          kids.push(el('rect', { class: 'bar', x: fmt(X(k * W)), y: fmt(y), width: fmt(X(W) - X(0)), height: fmt(HB - y) }));
        });
      } else {
        kids.push(el('text', { x: 290, y: HB - 34, 'font-size': 14, 'text-anchor': 'middle', class: 'muted' }, 'click “sample 1 000 values”'));
      }
      let p = '';
      for (let i = 0; i <= 120; i++) { const t = i / 120 * XMAX; p += (i ? ' L' : 'M') + fmt(X(t)) + ' ' + fmt(YD(LAM * Math.exp(-LAM * t))); }
      kids.push(el('path', { d: p, class: 'line-bad' }));
      kids.push(el('text', { x: 520, y: HB - 52, 'font-size': 14, 'text-anchor': 'end', class: 'bad' }, 'pdf 1.5 e^(−1.5x)'));
      if (sample) kids.push(el('text', { x: 520, y: HB - 32, 'font-size': 14, 'text-anchor': 'end', class: 'acc' }, 'histogram of 1 000 x values'));
      svg.replaceChildren(...kids);
    }
    sl.addEventListener('input', draw);
    $('it-draw').addEventListener('click', () => {
      const r = prng(newSeed());
      sample = Array.from({ length: 1000 }, () => -Math.log(1 - r.u()) / LAM);
      draw();
    });
    draw();
  })();

  /* ---------- 6.1: the repeated experiment (two cars) ---------- */
  (() => {
    const svg = $('mc-svg');
    if (!svg) return;
    const table = $('mc-runs'), out = $('mc-out');
    const LO = 110, HI = 260, W = 5, NB = (HI - LO) / W;
    const PX0 = 56, PX1 = 604, BASE = 340, TOP = 34;
    const X = v => PX0 + (v - LO) / (HI - LO) * (PX1 - PX0);
    let rnd, rows, r, counts, sum, sum2, added, mn, mx;
    function reset() {
      rnd = prng(newSeed()); rows = []; r = []; counts = new Array(NB).fill(0); sum = 0; sum2 = 0; added = 0; mn = Infinity; mx = -Infinity;
      show();
    }
    function trial() {
      const a = 60 + 80 * rnd.beta25(), b = rnd.normal(100, 12), s = a + b;
      r.push(s); sum += s; sum2 += s * s; mn = Math.min(mn, s); mx = Math.max(mx, s);
      const k = Math.floor((s - LO) / W);
      if (k >= 0 && k < NB) counts[k]++;
      rows.push([r.length, a, b, s]); if (rows.length > 6) rows.shift();
    }
    function show() {
      const n = r.length;
      table.innerHTML = '<tr><th>trial</th><th>v_A</th><th>v_B</th><th>r = v_A + v_B</th></tr>' +
        (rows.length ? rows.map((x, i) => `<tr class="${i >= rows.length - Math.min(added, 6) ? 'new' : ''}"><td>${thin(x[0])}</td><td>${fmt(x[1])}</td><td>${fmt(x[2])}</td><td><b>${fmt(x[3])}</b></td></tr>`).join('')
          : '<tr><td colspan="4" style="text-align:left;color:var(--muted)">no trials yet</td></tr>');
      if (n) {
        const mean = sum / n, sd = n > 1 ? Math.sqrt(Math.max(sum2 / n - mean * mean, 0)) : 0;
        out.innerHTML = `N = <b>${thin(n)}</b> trials<br>mean = <b>${fmt(mean)}</b> km/h<br>std = ${n > 1 ? fmt(sd) : '–'} km/h<br>min … max = ${fmt(mn)} … ${fmt(mx)} km/h`;
      } else out.innerHTML = '<span class="muted">N = 0</span>';
      // histogram
      const kids = [];
      const cmax = Math.max(1, ...counts), step = niceStep(Math.max(cmax, 4)), ymax = Math.ceil(cmax / step) * step;
      const Y = c => BASE - c / ymax * (BASE - TOP);
      for (let t = 0; t <= ymax; t += step) {
        kids.push(el('path', { d: `M${PX0} ${fmt(Y(t))} H ${PX1}`, style: 'stroke:var(--grid);stroke-width:1' }));
        kids.push(el('text', { x: PX0 - 8, y: fmt(Y(t) + 5), 'font-size': 13, 'text-anchor': 'end' }, thin(t)));
      }
      const last = n ? Math.floor((r[n - 1] - LO) / W) : -1;
      counts.forEach((c, k) => {
        if (!c) return;
        kids.push(el('rect', { class: 'bar', x: fmt(X(LO + k * W)), y: fmt(Y(c)), width: fmt(X(LO + W) - X(LO)), height: fmt(BASE - Y(c)),
          style: added === 1 && k === last ? 'fill:var(--accent)' : '' }));
      });
      kids.push(el('path', { class: 'line', d: `M${PX0} ${BASE} H ${PX1} M${PX0} ${BASE} V ${TOP - 6}` }));
      for (let v = LO + 10; v <= HI; v += 20) kids.push(el('path', { class: 'line', d: `M${fmt(X(v))} ${BASE} v6` }), el('text', { x: fmt(X(v)), y: BASE + 22, 'font-size': 13, 'text-anchor': 'middle' }, String(v)));
      kids.push(el('text', { x: (PX0 + PX1) / 2, y: BASE + 46, 'font-size': 14, 'text-anchor': 'middle', class: 'muted' }, 'relative speed r (km/h)'));
      kids.push(el('text', { x: 14, y: TOP - 14, 'font-size': 13, class: 'muted' }, 'count'));
      if (n) {
        const mean = sum / n;
        kids.push(el('path', { class: 'line-bad', d: `M${fmt(X(mean))} ${TOP} V ${BASE}`, 'stroke-dasharray': '6 4' }));
        kids.push(el('text', { x: fmt(X(mean) + 6), y: TOP + 12, 'font-size': 14, class: 'bad' }, `mean ${fmt(mean)}`));
      }
      svg.replaceChildren(...kids);
    }
    document.querySelectorAll('[data-mc]').forEach(b => b.addEventListener('click', () => {
      const k = Number(b.dataset.mc);
      if (k === 0) { reset(); return; }
      for (let i = 0; i < k; i++) trial();
      added = k; show();
    }));
    reset();
  })();

  /* ---------- 6.2: building a histogram ---------- */
  (() => {
    const svg = $('hb-svg');
    if (!svg) return;
    const sl = $('hb-k'); stopKeys(sl);
    // 30 relative speeds from the two-cars simulation (km/h)
    const R = [181.5, 164.4, 176.0, 188.6, 194.8, 182.9, 164.6, 175.3, 164.6, 193.4, 152.3, 169.9, 187.7, 174.6, 214.2,
      187.7, 196.8, 189.2, 184.5, 163.2, 169.0, 190.9, 166.9, 154.7, 166.2, 170.2, 185.0, 167.9, 186.6, 204.3];
    const MIN = Math.min(...R), MAX = Math.max(...R);
    const LO = 148, HI = 218, PX0 = 50, PX1 = 680;
    const X = v => PX0 + (v - LO) / (HI - LO) * (PX1 - PX0);
    const BASE = 250, TOP = 30, AXIS = 362;
    // dot positions: stack dots that would overlap
    const sorted = R.map((v, i) => [v, i]).sort((p, q) => p[0] - q[0]);
    const lvl = [];
    sorted.forEach(([v], j) => {
      let L = 0;
      for (let i = 0; i < j; i++) if (Math.abs(X(sorted[i][0]) - X(v)) < 9 && lvl[i] === L) L++;
      lvl.push(L);
    });
    function draw() {
      const k = Number(sl.value);
      $('hb-kv').textContent = k;
      const w = (MAX - MIN) / k, edges = Array.from({ length: k + 1 }, (_, i) => MIN + i * w);
      const counts = new Array(k).fill(0);
      R.forEach(v => { counts[Math.min(Math.floor((v - MIN) / w), k - 1)]++; });   // last bin includes MAX, like NumPy
      const cmax = Math.max(...counts);
      const Y = c => BASE - c / Math.max(cmax, 1) * (BASE - TOP - 20);
      const kids = [];
      counts.forEach((c, i) => {
        const x0 = X(edges[i]), x1 = X(edges[i + 1]);
        if (c) kids.push(el('rect', { class: 'bar', x: fmt(x0), y: fmt(Y(c)), width: fmt(x1 - x0), height: fmt(BASE - Y(c)) }));
        kids.push(el('text', { x: fmt((x0 + x1) / 2), y: fmt(Y(c) - 6), 'font-size': k > 10 ? 13 : 15, 'text-anchor': 'middle', 'font-weight': 700, class: 'acc' }, String(c)));
      });
      kids.push(el('path', { class: 'line', d: `M${PX0} ${BASE} H ${PX1}` }));
      kids.push(el('text', { x: PX0, y: 18, 'font-size': 13, class: 'muted' }, 'count'));
      edges.forEach((e, i) => {
        kids.push(el('path', { class: 'line-muted', d: `M${fmt(X(e))} ${TOP} V ${AXIS}` }));
        if (k <= 8 || i === 0 || i === k) kids.push(el('text', { x: fmt(X(e)), y: AXIS + 20, 'font-size': 13, 'text-anchor': 'middle' }, e.toFixed(1)));
      });
      kids.push(el('path', { class: 'line', d: `M${PX0} ${AXIS} H ${PX1}` }));
      sorted.forEach(([v], j) => kids.push(el('circle', { cx: fmt(X(v)), cy: fmt(AXIS - 10 - lvl[j] * 11), r: 4.5, class: 'dot' })));
      kids.push(el('text', { x: (PX0 + PX1) / 2, y: AXIS + 46, 'font-size': 14, 'text-anchor': 'middle', class: 'muted' }, `30 relative speeds (km/h) · bin width ${w.toFixed(1)} km/h`));
      svg.replaceChildren(...kids);
      $('hb-tab').textContent = counts.map((c, i) => `[${edges[i].toFixed(1)}, ${edges[i + 1].toFixed(1)}${i === k - 1 ? ']' : ')'}  ${String(c).padStart(2)}`).join('\n') + `\n${'total'.padStart(14)}  ${counts.reduce((p, q) => p + q, 0)}`;
    }
    sl.addEventListener('input', draw);
    draw();
  })();
})();
