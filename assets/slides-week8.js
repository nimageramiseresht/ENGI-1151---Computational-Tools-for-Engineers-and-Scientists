/* Week 8 slide widgets: hikers trapped on local peaks, crossover animation,
   a genetic algorithm on the 3-D mountain. Loaded after slides.js by week8-slides.html. */
(() => {
  const $ = id => document.getElementById(id);
  const NS = 'http://www.w3.org/2000/svg';
  const stopKeys = e => e.addEventListener('keydown', ev => ev.stopPropagation());
  const fmt = (x, d = 1) => Number(x).toFixed(d);
  const el = (tag, attrs, text) => {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (text !== undefined) e.textContent = text;
    return e;
  };
  // seeded random numbers, so that "restart" gives a new but repeatable run
  function prng(seed) {
    let s = seed >>> 0;
    const u = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    u.normal = () => { let a = 0, b = 0; while (a === 0) a = u(); b = u(); return Math.sqrt(-2 * Math.log(a)) * Math.cos(2 * Math.PI * b); };
    return u;
  }

  /* ================= the mountain range (same as the notes) ================= */
  const PEAKS = [[6.5, 6.0, 1100, 1.3], [2.5, 7.5, 850, 0.9], [3.0, 2.5, 750, 1.0], [8.2, 2.0, 650, 0.8]];
  const H = (x, y) => PEAKS.reduce((s, [cx, cy, a, w]) => s + a * Math.exp(-((x - cx) ** 2 + (y - cy) ** 2) / (2 * w * w)), 150);
  const grad = (x, y) => {
    let gx = 0, gy = 0;
    for (const [cx, cy, a, w] of PEAKS) {
      const e = a * Math.exp(-((x - cx) ** 2 + (y - cy) ** 2) / (2 * w * w)) / (w * w);
      gx -= e * (x - cx); gy -= e * (y - cy);
    }
    return [gx, gy];
  };
  const TOP = 1250;

  /* ================= 1.1 hikers on a mountain range ================= */
  (() => {
    const svg = $('ls-svg');
    if (!svg) return;
    const rateIn = $('ls-rate');
    stopKeys(rateIn);
    const S = 38, X0 = 30, Y0 = 10;                       // 10 km -> 380 px
    const px = x => X0 + x * S, py = y => Y0 + (10 - y) * S;
    const RATES = [0.00005, 0.001, 0.003], MAXSTEPS = 150;
    const LABEL = ['0.00005 (too small)', '0.001', '0.003 (too large)'];
    let rng = prng(3), hikers = [], raf = null, starts = 0;
    function background() {
      const kids = [el('image', { href: 'assets/img/w8-map.png', x: X0, y: Y0, width: 10 * S, height: 10 * S, preserveAspectRatio: 'none' })];
      kids.push(el('rect', { x: X0, y: Y0, width: 10 * S, height: 10 * S, fill: 'none', stroke: 'var(--grid)' }));
      PEAKS.forEach(([cx, cy], i) => {
        kids.push(el('path', { d: `M${fmt(px(cx))} ${fmt(py(cy) - 7)} l6 10 h-12 z`, class: 'fill-ink' }));
        kids.push(el('text', { x: fmt(px(cx) + 9), y: fmt(py(cy) + 4), 'font-size': 13, 'font-weight': 700 }, `${Math.round(H(cx, cy))} m`));
      });
      for (let t = 0; t <= 10; t += 2) {
        kids.push(el('text', { x: px(t), y: Y0 + 10 * S + 18, 'font-size': 12, 'text-anchor': 'middle', class: 'muted' }, t));
        kids.push(el('text', { x: X0 - 6, y: py(t) + 4, 'font-size': 12, 'text-anchor': 'end', class: 'muted' }, t));
      }
      kids.push(el('text', { x: X0 + 5 * S, y: Y0 + 10 * S + 36, 'font-size': 13, 'text-anchor': 'middle', class: 'muted' }, 'x (km)'));
      return kids;
    }
    const layer = el('g', {});
    svg.replaceChildren(...background(), layer);
    function drop() {
      const alpha = RATES[+rateIn.value];
      for (let i = 0; i < 10; i++) {
        const x = 0.3 + 9.4 * rng(), y = 0.3 + 9.4 * rng();
        hikers.push({ path: [[x, y]], alpha, done: false, steps: 0 });
      }
      starts += 10;
      if (!raf) raf = requestAnimationFrame(tick);
    }
    function advance(h) {
      for (let k = 0; k < 6 && !h.done; k++) {
        const [x, y] = h.path[h.path.length - 1];
        const [gx, gy] = grad(x, y);
        let nx = Math.min(10, Math.max(0, x + h.alpha * gx)), ny = Math.min(10, Math.max(0, y + h.alpha * gy));
        h.path.push([nx, ny]); h.steps++;
        const step = Math.hypot(nx - x, ny - y);
        if (step < 2e-4 || h.steps >= MAXSTEPS) h.done = true;
      }
    }
    function tick() {
      hikers.forEach(advance);
      draw();
      raf = hikers.every(h => h.done) ? null : requestAnimationFrame(tick);
    }
    function classify(h) {
      const [x, y] = h.path[h.path.length - 1], z = H(x, y);
      if (!h.done) return 'moving';
      if (Math.abs(z - TOP) < 8) return 'top';
      // on a lower summit, or stopped short (out of steps, or bouncing around a peak)
      return PEAKS.slice(1).some(([cx, cy]) => Math.hypot(x - cx, y - cy) < 0.15) ? 'local' : 'stuck';
    }
    function draw() {
      const kids = [];
      const col = { top: 'var(--good)', local: 'var(--bad)', stuck: '#A85A00', moving: 'var(--ink)' };
      hikers.forEach(h => {
        const c = classify(h);
        kids.push(el('path', { d: 'M' + h.path.map(([x, y]) => `${fmt(px(x))} ${fmt(py(y))}`).join(' L'), fill: 'none', stroke: col[c], 'stroke-width': 1.6, opacity: 0.9 }));
        const [x0, y0] = h.path[0], [x, y] = h.path[h.path.length - 1];
        kids.push(el('circle', { cx: fmt(px(x0)), cy: fmt(py(y0)), r: 4, fill: '#fff', stroke: 'var(--ink)', 'stroke-width': 1.2 }));
        kids.push(el('circle', { cx: fmt(px(x)), cy: fmt(py(y)), r: 6, fill: col[c], stroke: '#fff', 'stroke-width': 1.5 }));
      });
      layer.replaceChildren(...kids);
      const n = { top: 0, local: 0, stuck: 0, moving: 0 };
      hikers.forEach(h => n[classify(h)]++);
      $('ls-out').innerHTML = starts
        ? `hikers: <b>${starts}</b><br><span class="good">highest peak: ${n.top}</span><br><span class="bad">lower peak: ${n.local}</span><br>` +
          `<span style="color:#A85A00;font-weight:700">stopped short: ${n.stuck}</span>` + (n.moving ? `<br><span class="muted">still climbing: ${n.moving}</span>` : '')
        : '<span class="muted">Press “drop 10 hikers”.</span>';
    }
    rateIn.addEventListener('input', () => { $('ls-ratev').textContent = LABEL[+rateIn.value]; });
    $('ls-drop').addEventListener('click', drop);
    $('ls-clear').addEventListener('click', () => { hikers = []; starts = 0; rng = prng(3); draw(); });
    $('ls-ratev').textContent = LABEL[+rateIn.value];
    draw();
  })();

  /* ================= 2.3 crossover ================= */
  (() => {
    const svg = $('co-svg');
    if (!svg) return;
    const A = [2.4, 7.1, 0.8, 5.5, 3.3, 9.0], B = [6.6, 1.9, 4.2, 8.7, 0.5, 2.8];
    const W = 74, G = 8, X0 = 120, YA = 70, YB = 210, HH = 52;
    const gx = i => X0 + i * (W + G);
    let cut = 3, state = 0;     // 0 = parents, 1 = cut shown, 2 = swapped
    const genes = [];
    function build() {
      const kids = [];
      kids.push(el('text', { x: 20, y: YA + 33, 'font-size': 16, 'font-weight': 700, id: 'co-la' }, 'Parent A'));
      kids.push(el('text', { x: 20, y: YB + 33, 'font-size': 16, 'font-weight': 700, id: 'co-lb' }, 'Parent B'));
      for (let i = 0; i < 6; i++) kids.push(el('text', { x: gx(i) + W / 2, y: YA - 12, 'font-size': 12, 'text-anchor': 'middle', class: 'muted' }, `gene ${i + 1}`));
      genes.length = 0;
      [[A, YA, 'a'], [B, YB, 'b']].forEach(([vals, y, who]) => {
        vals.forEach((v, i) => {
          const g = el('g', { class: 'co-gene', style: 'transition: transform 0.9s ease-in-out' });
          g.appendChild(el('rect', { x: gx(i), y, width: W, height: HH, rx: 5, fill: who === 'a' ? '#68246D' : '#1D5FA3', stroke: '#fff', 'stroke-width': 1.5 }));
          g.appendChild(el('text', { x: gx(i) + W / 2, y: y + 33, 'font-size': 19, 'text-anchor': 'middle', fill: '#fff', 'font-weight': 600 }, v.toFixed(1)));
          genes.push({ g, who, i });
          kids.push(g);
        });
      });
      kids.push(el('path', { id: 'co-cut', d: '', stroke: 'var(--bad)', 'stroke-width': 3, 'stroke-dasharray': '7 5', fill: 'none' }));
      kids.push(el('text', { id: 'co-cutl', x: 0, y: 0, 'font-size': 14, fill: 'var(--bad)', 'text-anchor': 'middle', 'font-weight': 700 }, ''));
      svg.replaceChildren(...kids);
    }
    function render() {
      const cx = gx(cut) - G / 2;
      $('co-cut').setAttribute('d', state ? `M${cx} ${YA - 30} V ${YB + HH + 22}` : '');
      const lab = $('co-cutl');
      lab.setAttribute('x', cx); lab.setAttribute('y', YB + HH + 40);
      lab.textContent = state ? `✂ cut after gene ${cut}` : '';
      genes.forEach(({ g, who, i }) => {
        const swap = state === 2 && i >= cut;
        g.style.transform = swap ? `translateY(${who === 'a' ? YB - YA : YA - YB}px)` : 'translateY(0px)';
      });
      $('co-la').textContent = state === 2 ? 'Child 1' : 'Parent A';
      $('co-lb').textContent = state === 2 ? 'Child 2' : 'Parent B';
      const c1 = A.slice(0, cut).concat(B.slice(cut)), c2 = B.slice(0, cut).concat(A.slice(cut));
      const show = v => '[' + v.map(x => x.toFixed(1)).join(', ') + ']';
      $('co-out').innerHTML = state === 0
        ? `Parent A = ${show(A)}<br>Parent B = ${show(B)}<br><span class="muted">Press “cut” to choose a random cut point.</span>`
        : state === 1
          ? `cut point: between gene ${cut} and gene ${cut + 1}<br><span class="muted">Press “swap tails”.</span>`
          : `Child 1 = A[:${cut}] + B[${cut}:] = <b>${show(c1)}</b><br>Child 2 = B[:${cut}] + A[${cut}:] = <b>${show(c2)}</b><br><span class="muted">No new numbers: every gene comes from a parent.</span>`;
    }
    $('co-cutb').addEventListener('click', () => { if (state === 2) { state = 0; render(); } cut = 1 + Math.floor(Math.random() * 5); state = 1; setTimeout(render, state === 1 ? 0 : 950); });
    $('co-swap').addEventListener('click', () => { if (state === 0) { cut = 1 + Math.floor(Math.random() * 5); } state = 2; render(); });
    $('co-reset').addEventListener('click', () => { state = 0; render(); });
    build(); render();
  })();

  /* ================= 4.1 a genetic algorithm on the 3-D mountain ================= */
  (() => {
    const svg = $('gam-svg');
    if (!svg) return;
    const N = 12, P = 6, E = 2, PM = 0.3, STEP = 1.0;
    // projection: rotate about the vertical axis, tilt, lift by height
    const TH = 0.98, CT = Math.cos(TH), ST = Math.sin(TH), TILT = 0.5, HZ = 0.17;
    const proj0 = (x, y, z) => {
      const xr = (x - 5) * CT - (y - 5) * ST, yr = (x - 5) * ST + (y - 5) * CT;
      return [xr, -yr * TILT, z, yr];
    };
    // fit the projected box into the view
    let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
    const scr = (x, y, z, s, ox, oy) => { const [a, b] = proj0(x, y, z); return [ox + s * a, oy + s * b - z * HZ]; };
    for (const x of [0, 10]) for (const y of [0, 10]) for (const z of [0, TOP]) {
      const [a, b] = proj0(x, y, z); minX = Math.min(minX, a); maxX = Math.max(maxX, a); minY = Math.min(minY, b); maxY = Math.max(maxY, b);
    }
    const VW = 680, VH = 440, S = Math.min((VW - 40) / (maxX - minX), (VH - 50 - TOP * HZ) / (maxY - minY));
    const OX = 20 - S * minX + ((VW - 40) - S * (maxX - minX)) / 2, OY = VH - 20 - S * maxY;
    const P3 = (x, y, z) => scr(x, y, z, S, OX, OY);
    const depth = (x, y) => proj0(x, y, 0)[3];
    // surface
    function colour(z, shade) {
      const t = Math.max(0, Math.min(1, (z - 150) / 1100));
      const c0 = [243, 236, 244], c1 = [104, 36, 109];
      const c = c0.map((v, i) => Math.round((v + (c1[i] - v) * Math.pow(t, 0.8)) * shade));
      return `rgb(${c[0]},${c[1]},${c[2]})`;
    }
    const surf = el('g', {});
    (() => {
      const n = 36, d = 10 / n, quads = [];
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
        const x = i * d, y = j * d;
        const cs = [[x, y], [x + d, y], [x + d, y + d], [x, y + d]];
        const zs = cs.map(([a, b]) => H(a, b));
        const [gx, gy] = grad(x + d / 2, y + d / 2);
        const nx = -gx / 1000, ny = -gy / 1000, nl = Math.hypot(nx, ny, 1);
        const shade = 0.78 + 0.22 * ((-0.5 * nx + 0.6 * ny + 0.8) / nl);
        quads.push({ dep: depth(x + d / 2, y + d / 2), pts: cs.map(([a, b], k) => P3(a, b, zs[k])), z: zs.reduce((s, v) => s + v) / 4, shade });
      }
      quads.sort((a, b) => a.dep - b.dep);
      const kids = quads.map(q => el('path', {
        d: 'M' + q.pts.map(([a, b]) => `${fmt(a)} ${fmt(b)}`).join(' L') + 'Z',
        fill: colour(q.z, Math.min(1.05, q.shade)), stroke: colour(q.z, Math.min(1.05, q.shade)), 'stroke-width': 0.6
      }));
      // base outline
      const base = [[0, 0], [10, 0], [10, 10], [0, 10]].map(([a, b]) => P3(a, b, 0));
      kids.unshift(el('path', { d: 'M' + base.map(([a, b]) => `${fmt(a)} ${fmt(b)}`).join(' L') + 'Z', fill: 'none', stroke: 'var(--grid)' }));
      // axis labels
      const lx = P3(5, -0.9, 0), ly = P3(10.9, 5, 0);
      kids.push(el('text', { x: fmt(lx[0]), y: fmt(lx[1] + 12), 'font-size': 13, class: 'muted', 'text-anchor': 'middle' }, 'x (km)'));
      kids.push(el('text', { x: fmt(ly[0]), y: fmt(ly[1] + 12), 'font-size': 13, class: 'muted', 'text-anchor': 'middle' }, 'y (km)'));
      surf.replaceChildren(...kids);
    })();
    const layer = el('g', {});
    svg.replaceChildren(surf, layer);

    let rng, pop, gen, phase, parents, kids, mutated, best;
    const fitOf = c => H(c[0], c[1]);
    const sortPop = () => pop.sort((a, b) => fitOf(b) - fitOf(a));
    function restart(seed) {
      rng = prng(seed); gen = 0; phase = 0;
      pop = Array.from({ length: N }, () => [10 * rng(), 10 * rng()]);
      sortPop(); best = pop[0].slice(); parents = []; kids = []; mutated = [];
      draw();
    }
    const STEPS = ['evaluate and rank', 'select the parents', 'cross over', 'mutate', 'new generation'];
    const EXPLAIN = [
      'Each chromosome (x, y) is a point on the mountain; its fitness is the height h(x, y). Rank them.',
      `Selection: the top ${P} chromosomes become parents (purple). The others are dropped.`,
      'Crossover: two parents A and B swap the second gene, giving the children (x_A, y_B) and (x_B, y_A).',
      `Mutation: each gene of a child changes with probability ${PM}, by a random amount.`,
      `New generation: the ${E} best parents are copied unchanged (elitism, gold rings) and join the ${N - E} children. Rank again.`
    ];
    let eliteSet = [];
    function step() {
      if (phase === 0 || phase === 4) { phase = 1; eliteSet = []; }
      else if (phase === 1) {
        parents = pop.slice(0, P).map(c => c.slice());
        kids = [];
        while (kids.length < N - E) {
          let i = Math.floor(rng() * P), j = Math.floor(rng() * (P - 1)); if (j >= i) j++;
          const a = parents[i], b = parents[j];
          kids.push({ c: [a[0], b[1]], from: [i, j] }, { c: [b[0], a[1]], from: [j, i] });
        }
        kids = kids.slice(0, N - E);
        phase = 2;
      } else if (phase === 2) {
        mutated = kids.map(k => {
          const c = k.c.slice(); let m = false;
          for (let g = 0; g < 2; g++) if (rng() < PM) { c[g] = Math.min(10, Math.max(0, c[g] + STEP * rng.normal())); m = true; }
          return m ? c : null;
        });
        phase = 3;
      } else if (phase === 3) {
        const elite = pop.slice(0, E).map(c => c.slice());
        pop = elite.concat(kids.map((k, i) => mutated[i] || k.c));
        eliteSet = elite;
        sortPop(); gen++;
        if (fitOf(pop[0]) > fitOf(best)) best = pop[0].slice();
        parents = []; kids = []; mutated = [];
        phase = 4;
      }
      draw();
    }
    function dot(c, opts) {
      const [a, b] = P3(c[0], c[1], H(c[0], c[1]));
      return el('circle', Object.assign({ cx: fmt(a), cy: fmt(b), r: 6.5, stroke: '#fff', 'stroke-width': 1.6 }, opts));
    }
    function draw() {
      const out = [];
      // the current population
      pop.forEach((c, r) => {
        const isPar = r < P, isElite = r < E;
        const sel = phase >= 1 && phase <= 3;
        if (phase === 2 || phase === 3) { if (!isPar) return; }
        out.push(dot(c, { fill: sel ? (isPar ? '#68246D' : '#9aa0aa') : '#B3261E', opacity: sel && !isPar ? 0.45 : 1 }));
        if (phase === 0 || phase === 1 || phase === 4) {
          const [a, b] = P3(c[0], c[1], H(c[0], c[1]));
          out.push(el('text', { x: fmt(a + 8), y: fmt(b - 6), 'font-size': 11, 'font-weight': 700, fill: 'var(--ink)' }, r + 1));
        }
        if (phase === 4 && eliteSet.includes(c)) out.push(dot(c, { fill: 'none', stroke: 'gold', 'stroke-width': 3, r: 10 }));
      });
      // children and where their genes came from
      if (phase === 2 || phase === 3) {
        kids.forEach((k, i) => {
          const [ia, ib] = k.from, A = parents[ia], B = parents[ib];
          const [cx, cy] = P3(k.c[0], k.c[1], H(k.c[0], k.c[1]));
          const hi = i < 2;
          for (const [src, colr] of [[A, '#68246D'], [B, '#1D5FA3']]) {
            const [sx, sy] = P3(src[0], src[1], H(src[0], src[1]));
            out.push(el('path', { d: `M${fmt(sx)} ${fmt(sy)} L${fmt(cx)} ${fmt(cy)}`, stroke: colr, 'stroke-width': hi ? 2.2 : 1, 'stroke-dasharray': '4 3', opacity: hi ? 0.95 : 0.4, fill: 'none' }));
          }
          out.push(dot(k.c, { fill: '#E08A1E', r: hi ? 7.5 : 6 }));
          const m = mutated[i];
          if (phase >= 3 && m) {
            const [mx, my] = P3(m[0], m[1], H(m[0], m[1]));
            out.push(el('path', { d: `M${fmt(cx)} ${fmt(cy)} L${fmt(mx)} ${fmt(my)}`, stroke: '#1F7A4D', 'stroke-width': 2, fill: 'none' }));
            out.push(dot(m, { fill: '#1F7A4D', r: 6 }));
          }
        });
        if (kids.length) {
          const [cx, cy] = P3(kids[0].c[0], kids[0].c[1], H(kids[0].c[0], kids[0].c[1]));
          out.push(el('text', { x: fmt(cx + 10), y: fmt(cy + 16), 'font-size': 12, 'font-weight': 700, fill: '#A85A00' }, 'child: x from A, y from B'));
        }
      }
      // best so far
      const [bx, by] = P3(best[0], best[1], H(best[0], best[1]));
      out.push(el('path', { d: `M${fmt(bx)} ${fmt(by - 10)} V ${fmt(by - 34)}`, stroke: 'var(--ink)', 'stroke-width': 1.5 }));
      out.push(el('path', { d: `M${fmt(bx)} ${fmt(by - 34)} l14 5 l-14 5 z`, fill: 'gold', stroke: 'var(--ink)', 'stroke-width': 0.8 }));
      layer.replaceChildren(...out);
      $('gam-step').innerHTML = `generation <b>${gen}</b> · step ${phase + 1} of 5: <b>${STEPS[phase]}</b><br><span class="muted">${EXPLAIN[phase]}</span>`;
      const rows = (phase === 2 || phase === 3 ? kids.map((k, i) => ({ c: mutated[i] && phase >= 3 ? mutated[i] : k.c, tag: phase >= 3 && mutated[i] ? 'mutated' : 'child' })) :
        pop.map((c, r) => ({ c, tag: phase === 1 ? (r < P ? 'parent' : 'dropped') : (phase === 4 && eliteSet.includes(c) ? 'elite' : '') })));
      $('gam-tab').innerHTML = '<tr><th>#</th><th>x</th><th>y</th><th>h (m)</th><th></th></tr>' +
        rows.slice(0, 12).map((r, i) => `<tr${r.tag === 'dropped' ? ' style="opacity:.45"' : ''}><td>${i + 1}</td><td>${r.c[0].toFixed(2)}</td><td>${r.c[1].toFixed(2)}</td><td>${Math.round(H(r.c[0], r.c[1]))}</td><td>${r.tag}</td></tr>`).join('');
      $('gam-best').innerHTML = `best so far: (${best[0].toFixed(2)}, ${best[1].toFixed(2)}), <b>${Math.round(H(best[0], best[1]))} m</b>` +
        (Math.abs(H(best[0], best[1]) - TOP) < 3 ? ' <span class="good">the highest peak</span>' : '');
    }
    let seed = 11;
    $('gam-next').addEventListener('click', step);
    $('gam-gen').addEventListener('click', () => { do step(); while (phase !== 4); });
    $('gam-five').addEventListener('click', () => { for (let k = 0; k < 5; k++) { do step(); while (phase !== 4); } });
    $('gam-reset').addEventListener('click', () => restart(++seed));
    restart(seed);
  })();

  /* ================= formulas: KaTeX, on the slides only ================= */
  if (window.renderMathInElement) {
    renderMathInElement(document.querySelector('.reveal .slides'), {
      delimiters: [{ left: '\\(', right: '\\)', display: false }],
      ignoredClasses: ['notes', 'py'], throwOnError: false
    });
  }
})();
