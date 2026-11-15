/* Week 7 slide widgets: turbine spacing, slope = 0, gradient descent, Newton's method.
   Loaded after slides.js by week7-slides.html. */
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
  const sci = x => (x === 0 ? '0' : Math.abs(x) >= 1e-3 && Math.abs(x) < 1e4 ? x.toFixed(4) : x.toExponential(1));

  function axes(box) {
    // box: {x0, x1, y0 (top), y1 (bottom), xmin, xmax, ymin, ymax, xticks, yticks, xlabel, ylabel, xfmt, yfmt}
    const X = v => box.x0 + (v - box.xmin) / (box.xmax - box.xmin) * (box.x1 - box.x0);
    const Y = v => box.y1 - (v - box.ymin) / (box.ymax - box.ymin) * (box.y1 - box.y0);
    const kids = [];
    (box.yticks || []).forEach(t => {
      kids.push(el('path', { class: 'grid', d: `M${box.x0} ${fmt(Y(t))} H ${box.x1}` }));
      kids.push(el('text', { x: box.x0 - 8, y: fmt(Y(t) + 5), 'font-size': 13, 'text-anchor': 'end' }, (box.yfmt || String)(t)));
    });
    (box.xticks || []).forEach(t => {
      kids.push(el('path', { class: 'line', d: `M${fmt(X(t))} ${box.y1} v6` }));
      kids.push(el('text', { x: fmt(X(t)), y: box.y1 + 22, 'font-size': 13, 'text-anchor': 'middle' }, (box.xfmt || String)(t)));
    });
    kids.push(el('path', { class: 'line', d: `M${box.x0} ${box.y0 - 6} V ${box.y1} H ${box.x1}` }));
    if (box.xlabel) kids.push(el('text', { x: (box.x0 + box.x1) / 2, y: box.y1 + 44, 'font-size': 14, 'text-anchor': 'middle', class: 'muted' }, box.xlabel));
    if (box.ylabel) kids.push(el('text', { x: box.x0 - 6, y: box.y0 - 14, 'font-size': 13, class: 'muted' }, box.ylabel));
    return { X, Y, kids };
  }
  // polyline of f on [a, b]; points outside [ylo, yhi] break the line
  const curve = (f, a, b, X, Y, n = 300, ylo = -Infinity, yhi = Infinity) => {
    let d = '', pen = false;
    for (let i = 0; i <= n; i++) {
      const x = a + (b - a) * i / n, y = f(x);
      if (!Number.isFinite(y) || y < ylo || y > yhi) { pen = false; continue; }
      d += (pen ? ' L' : ' M') + fmt(X(x)) + ' ' + fmt(Y(y));
      pen = true;
    }
    return d.trim();
  };
  const star = (cx, cy, r, cls) => {
    let d = '';
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r;
      d += (i ? 'L' : 'M') + fmt(cx + rr * Math.cos(a)) + ' ' + fmt(cy + rr * Math.sin(a));
    }
    return el('path', { d: d + 'Z', class: cls });
  };

  /* ================= 1.1 turbine spacing ================= */
  (() => {
    const svg = $('wt-svg'), sIn = $('wt-s');
    if (!svg) return;
    stopKeys(sIn);
    const Ct = 0.8, k = 0.05, cost = 0.04, a0 = 1 - Math.sqrt(1 - Ct);
    const deficit = s => a0 / Math.pow(1 + 2 * k * s, 2);
    const P2 = s => Math.pow(1 - deficit(s), 3);
    const J = s => 1 + P2(s) - cost * s;
    let sBest = 2, jBest = -1;
    for (let s = 2; s <= 15; s += 0.001) { const j = J(s); if (j > jBest) { jBest = j; sBest = s; } }

    // plan view: x = 70 + s * D
    const D = 38, X0 = 70, YC = 92;
    const B = { x0: 70, x1: 650, y0: 230, y1: 372, xmin: 2, xmax: 15, ymin: 1.10, ymax: 1.27,
      xticks: [2, 4, 6, 8, 10, 12, 14], yticks: [1.10, 1.15, 1.20, 1.25], yfmt: v => v.toFixed(2),
      xlabel: 'spacing s (rotor diameters D)', ylabel: 'objective = power − cost' };
    const ax = axes(B);

    function turbine(cx, label) {
      return [
        el('path', { d: `M${cx} ${YC - D / 2} V ${YC + D / 2}`, stroke: 'var(--ink)', 'stroke-width': 5, 'stroke-linecap': 'round' }),
        el('rect', { x: cx, y: YC - 5, width: 14, height: 10, rx: 2, class: 'fill-ink' }),
        el('text', { x: cx, y: YC - D / 2 - 10, 'font-size': 14, 'text-anchor': 'middle' }, label)
      ];
    }
    function draw() {
      const s = +sIn.value, x2 = X0 + s * D;
      $('wt-sv').textContent = s.toFixed(1) + ' D';
      const kids = [];
      // wind arrows
      for (const y of [YC - 34, YC + 34]) kids.push(el('path', { d: `M10 ${y} h36 m-8 -5 l8 5 l-8 5`, class: 'line-blue' }));
      kids.push(el('text', { x: 10, y: YC + 5, 'font-size': 13, class: 'muted' }, 'wind'));
      // wake cone (Jensen: diameter D(1 + 2k s))
      const xe = 660, se = (xe - X0) / D, re = D / 2 * (1 + 2 * k * se);
      kids.push(el('path', { class: 'wake', d: `M${X0} ${YC - D / 2} L${xe} ${fmt(YC - re)} L${xe} ${fmt(YC + re)} L${X0} ${YC + D / 2} Z` }));
      kids.push(el('text', { x: 600, y: fmt(YC - re - 6), 'font-size': 13, 'text-anchor': 'end', fill: '#1D5FA3' }, 'wake: slower wind'));
      kids.push(...turbine(X0, 'T1'), ...turbine(x2, 'T2'));
      // spacing dimension
      kids.push(el('path', { class: 'line-muted', d: `M${X0} ${YC + 44} H ${fmt(x2)}` }));
      kids.push(el('text', { x: fmt((X0 + x2) / 2), y: YC + 62, 'font-size': 14, 'text-anchor': 'middle' }, `s = ${s.toFixed(1)} D`));
      kids.push(el('text', { x: fmt(x2 > 560 ? x2 - 10 : x2 + 24), y: YC + 5, 'font-size': 13, class: 'bad', 'font-weight': 700, 'text-anchor': x2 > 560 ? 'end' : 'start' }, `${Math.round(P2(s) * 100)} % power`));
      // objective curve
      kids.push(...ax.kids);
      kids.push(el('path', { class: 'line-acc', d: curve(J, 2, 15, ax.X, ax.Y) }));
      kids.push(el('path', { class: 'line-muted', d: `M${fmt(ax.X(sBest))} ${fmt(ax.Y(jBest))} V ${B.y1}` }));
      kids.push(star(ax.X(sBest), ax.Y(jBest), 11, 'fill-good'));
      kids.push(el('text', { x: fmt(ax.X(sBest)), y: fmt(ax.Y(jBest) - 16), 'font-size': 14, 'text-anchor': 'middle', class: 'good', 'font-weight': 700 }, `best ≈ ${sBest.toFixed(1)} D`));
      kids.push(el('circle', { cx: fmt(ax.X(s)), cy: fmt(ax.Y(J(s))), r: 7, class: 'fill-bad' }));
      svg.replaceChildren(...kids);
      $('wt-out').innerHTML =
        `wind speed at T2: <b>${Math.round((1 - deficit(s)) * 100)} %</b><br>` +
        `power of T2: <b>${(P2(s) * 100).toFixed(0)} %</b> of T1<br>` +
        `power − cost = 1 + ${P2(s).toFixed(3)} − ${(cost * s).toFixed(3)}<br>` +
        `objective = <b>${J(s).toFixed(3)}</b>` +
        (Math.abs(s - sBest) < 0.15 ? ' <span class="good">≈ the optimum</span>' : '');
    }
    sIn.addEventListener('input', draw);
    draw();
  })();

  /* ================= 2.1 slope = 0 ================= */
  (() => {
    const svg = $('dv-svg'), xIn = $('dv-x');
    if (!svg) return;
    stopKeys(xIn);
    const f = x => Math.cos(2 * x) * Math.exp(-0.1 * x * x);
    const df = x => Math.exp(-0.1 * x * x) * (-2 * Math.sin(2 * x) - 0.2 * x * Math.cos(2 * x));
    const B = { x0: 60, x1: 660, y0: 30, y1: 350, xmin: -5, xmax: 5, ymin: -1, ymax: 1.15,
      xticks: [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5], yticks: [-1, -0.5, 0, 0.5, 1], xlabel: 'x', ylabel: 'f(x)' };
    const ax = axes(B);
    // stationary points by bisection on sign changes of f'
    const stat = [];
    for (let i = 0; i < 1000; i++) {
      let a = -5 + i * 0.01, b = a + 0.01;
      if (df(a) * df(b) > 0) continue;
      for (let j = 0; j < 50; j++) { const m = (a + b) / 2; if (df(a) * df(m) <= 0) b = m; else a = m; }
      const x = (a + b) / 2;
      if (!stat.some(p => Math.abs(p - x) < 1e-4)) stat.push(x);
    }
    function draw() {
      const x = +xIn.value, y = f(x), m = df(x);
      $('dv-xv').textContent = x.toFixed(2);
      const kids = [...ax.kids];
      kids.push(el('path', { class: 'line-acc', d: curve(f, -5, 5, ax.X, ax.Y) }));
      stat.forEach(p => {
        const isMax = f(p) > f(p - 0.05);
        kids.push(el('circle', { cx: fmt(ax.X(p)), cy: fmt(ax.Y(f(p))), r: 5, class: isMax ? 'fill-good' : 'fill-bad', opacity: 0.55 }));
      });
      // tangent of half-length 1.1 in x
      const h = 1.1, ylo = B.ymin, yhi = B.ymax;
      const t = u => y + m * (u - x);
      kids.push(el('path', { class: 'line-bad', 'stroke-width': 3, d: curve(t, Math.max(-5, x - h), Math.min(5, x + h), ax.X, ax.Y, 2, ylo - 0.3, yhi + 0.3) }));
      kids.push(el('circle', { cx: fmt(ax.X(x)), cy: fmt(ax.Y(y)), r: 7, class: 'fill-bad' }));
      kids.push(el('circle', { cx: 80, cy: 375, r: 5, class: 'fill-good', opacity: 0.55 }));
      kids.push(el('text', { x: 90, y: 380, 'font-size': 13, class: 'muted' }, 'maximum'));
      kids.push(el('circle', { cx: 180, cy: 375, r: 5, class: 'fill-bad', opacity: 0.55 }));
      kids.push(el('text', { x: 190, y: 380, 'font-size': 13, class: 'muted' }, 'minimum   (f′ = 0)'));
      svg.replaceChildren(...kids);
      let verdict;
      const near = stat.find(p => Math.abs(p - x) < 0.04);
      if (near !== undefined) verdict = `<span class="good">flat: stationary point (${f(near) > f(near - 0.05) ? 'a peak' : 'a valley'})</span>`;
      else verdict = m > 0 ? 'uphill to the right' : 'downhill to the right';
      $('dv-out').innerHTML = `f(${x.toFixed(2)}) = <b>${y.toFixed(3)}</b><br>slope f′(x) = <b>${m.toFixed(3)}</b><br>${verdict}`;
    }
    xIn.addEventListener('input', draw);
    draw();
  })();

  /* ================= 3.2 / 3.3 gradient descent and Newton on x cos 3x ================= */
  const F = x => x * Math.cos(3 * x);
  const DF = x => Math.cos(3 * x) - 3 * x * Math.sin(3 * x);
  const D2F = x => -6 * Math.sin(3 * x) - 9 * x * Math.cos(3 * x);
  const BOX = { x0: 60, x1: 660, y0: 30, y1: 350, xmin: -5, xmax: 2, ymin: -4.6, ymax: 4.2,
    xticks: [-5, -4, -3, -2, -1, 0, 1, 2], yticks: [-4, -2, 0, 2, 4], xlabel: 'x', ylabel: 'f(x) = x cos 3x' };
  const inBox = x => x >= BOX.xmin && x <= BOX.xmax;

  function table(tab, rows, cols) {
    const last = rows.slice(-6);
    tab.innerHTML = '<tr>' + cols.map(c => `<th>${c}</th>`).join('') + '</tr>' +
      last.map((r, i) => `<tr${i === last.length - 1 && rows.length > 1 ? ' class="new"' : ''}>` + r.map(v => `<td>${v}</td>`).join('') + '</tr>').join('');
  }
  function pathKids(ax, xs, cls) {
    const kids = [], n = xs.length;
    for (let i = 1; i < n; i++) {
      if (!inBox(xs[i - 1]) || !inBox(xs[i])) continue;
      kids.push(el('path', { d: `M${fmt(ax.X(xs[i - 1]))} ${fmt(ax.Y(F(xs[i - 1])))} L${fmt(ax.X(xs[i]))} ${fmt(ax.Y(F(xs[i])))}`,
        class: 'line-muted', style: 'stroke:var(--bad);stroke-dasharray:3 3;stroke-width:1.4' }));
    }
    xs.forEach((x, i) => {
      if (!inBox(x)) return;
      kids.push(el('circle', { cx: fmt(ax.X(x)), cy: fmt(ax.Y(F(x))), r: i === n - 1 ? 7 : 4.5, class: cls, opacity: i === n - 1 ? 1 : 0.35 + 0.5 * i / n }));
    });
    return kids;
  }

  (() => {
    const svg = $('gd-svg');
    if (!svg) return;
    const x0In = $('gd-x0'), aIn = $('gd-a');
    [x0In, aIn].forEach(stopKeys);
    const ax = axes(BOX);
    let xs, done;
    function reset() { xs = [+x0In.value]; done = ''; draw(); }
    function step(n) {
      for (let i = 0; i < n && !done; i++) {
        const x = xs[xs.length - 1], st = +aIn.value * DF(x), xn = x - st;
        xs.push(xn);
        if (!Number.isFinite(xn) || Math.abs(xn) > 1e3) done = 'diverged';
        else if (Math.abs(st) < 1e-6) done = 'converged';
        else if (xs.length > 400) done = 'stopped';
      }
      draw();
    }
    function draw() {
      $('gd-x0v').textContent = (+x0In.value).toFixed(2);
      $('gd-av').textContent = (+aIn.value).toFixed(3);
      const kids = [...ax.kids, el('path', { class: 'line-acc', d: curve(F, -5, 2, ax.X, ax.Y) })];
      kids.push(...pathKids(ax, xs, 'fill-bad'));
      svg.replaceChildren(...kids);
      const rows = xs.map((x, k) => [k, Number.isFinite(x) && Math.abs(x) < 1e3 ? x.toFixed(4) : '—',
        Math.abs(x) < 1e3 ? F(x).toFixed(4) : '—', Math.abs(x) < 1e3 ? DF(x).toFixed(4) : '—']);
      table($('gd-tab'), rows, ['k', 'x', 'f(x)', "f′(x)"]);
      const x = xs[xs.length - 1], k = xs.length - 1;
      let msg = `iterations: <b>${k}</b>`;
      const st = xs.slice(1).map((v, i) => v - xs[i]).slice(-4);
      const bouncing = st.length === 4 && st.every((d, i) => i === 0 || d * st[i - 1] < 0) && Math.abs(st[3]) > 0.5 * Math.abs(st[1]);
      if (done === 'converged') msg += `<br><span class="good">converged</span> at x = <b>${x.toFixed(4)}</b>, f = ${F(x).toFixed(4)}`;
      else if (done === 'diverged' || xs.some(v => !inBox(v))) msg += `<br><span class="bad">jumped out of the valley: α is too large</span>`;
      else if (bouncing) msg += `<br><span class="bad">bouncing across the valley: α is too large</span>`;
      else if (k > 0) msg += `<br>step = α f′(x) = ${(+aIn.value * DF(xs[k - 1])).toFixed(4)}`;
      $('gd-out').innerHTML = msg;
    }
    $('gd-step').addEventListener('click', () => step(1));
    $('gd-run').addEventListener('click', () => step(10));
    $('gd-reset').addEventListener('click', reset);
    [x0In, aIn].forEach(i => i.addEventListener('input', reset));
    reset();
  })();

  (() => {
    const svg = $('nt-svg');
    if (!svg) return;
    const x0In = $('nt-x0');
    stopKeys(x0In);
    const ax = axes(BOX);
    let xs, done;
    function reset() { xs = [+x0In.value]; done = ''; draw(); }
    function step() {
      if (done) return;
      const x = xs[xs.length - 1], h = D2F(x);
      if (Math.abs(h) < 1e-10) { done = 'flat'; draw(); return; }
      const st = DF(x) / h, xn = x - st;
      xs.push(xn);
      if (!Number.isFinite(xn) || Math.abs(xn) > 1e3) done = 'diverged';
      else if (Math.abs(st) < 1e-8) done = 'converged';
      draw();
    }
    function draw() {
      $('nt-x0v').textContent = (+x0In.value).toFixed(2);
      const kids = [...ax.kids, el('path', { class: 'line-acc', d: curve(F, -5, 2, ax.X, ax.Y) })];
      const x = xs[xs.length - 1], k = xs.length - 1, h = D2F(x), g = DF(x);
      // local parabola at the current point, and where it sends us
      if (!done && inBox(x) && Math.abs(h) > 1e-10) {
        const q = u => F(x) + g * (u - x) + 0.5 * h * (u - x) * (u - x);
        const xn = x - g / h, span = Math.max(1.0, Math.abs(xn - x) + 0.4);
        const cls = h > 0 ? 'line-good' : 'line-bad';
        kids.push(el('path', { class: cls, 'stroke-dasharray': '7 5', d: curve(q, Math.max(-5, x - span), Math.min(2, x + span), ax.X, ax.Y, 160, BOX.ymin, BOX.ymax) }));
        if (inBox(xn) && q(xn) > BOX.ymin && q(xn) < BOX.ymax) {
          const px = ax.X(xn), py = ax.Y(q(xn));
          kids.push(el('circle', { cx: fmt(px), cy: fmt(py), r: 6, fill: 'none', stroke: h > 0 ? 'var(--good)' : 'var(--bad)', 'stroke-width': 2.5 }));
          kids.push(el('path', { class: 'line-muted', d: `M${fmt(px)} ${fmt(py)} V ${fmt(ax.Y(F(xn)))}` }));
          kids.push(el('text', { x: fmt(px + 12), y: fmt(h > 0 ? py - 10 : py - 12), 'font-size': 13, 'text-anchor': 'start', class: h > 0 ? 'good' : 'bad' },
            h > 0 ? 'bottom of the parabola' : 'top of the parabola'));
        }
      }
      kids.push(...pathKids(ax, xs, 'fill-bad'));
      svg.replaceChildren(...kids);
      const rows = xs.map((v, i) => Math.abs(v) < 1e3
        ? [i, v.toFixed(5), F(v).toFixed(4), sci(DF(v)), D2F(v).toFixed(2)] : [i, '—', '—', '—', '—']);
      table($('nt-tab'), rows, ['k', 'x', 'f(x)', "f′(x)", "f″(x)"]);
      let msg = `iterations: <b>${k}</b>`;
      if (done === 'converged') msg += h > 0
        ? `<br><span class="good">converged to a minimum</span>: x = <b>${x.toFixed(5)}</b>`
        : `<br><span class="bad">converged to a maximum!</span> x = <b>${x.toFixed(5)}</b>, f″ &lt; 0`;
      else if (done === 'diverged' || !inBox(x)) msg += '<br><span class="bad">jumped out of the range</span>';
      else if (done === 'flat') msg += '<br><span class="bad">f″ = 0: cannot divide</span>';
      else msg += h > 0 ? '<br>f″ &gt; 0: parabola opens upwards' : '<br><span class="bad">f″ &lt; 0: parabola opens downwards, heading for a maximum</span>';
      $('nt-out').innerHTML = msg;
    }
    $('nt-step').addEventListener('click', step);
    $('nt-reset').addEventListener('click', reset);
    x0In.addEventListener('input', reset);
    reset();
  })();

  /* ================= formulas: KaTeX, on the slides only ================= */
  if (window.renderMathInElement) {
    renderMathInElement(document.querySelector('.reveal .slides'), {
      delimiters: [{ left: '\\(', right: '\\)', display: false }],
      ignoredClasses: ['notes', 'py'], throwOnError: false
    });
  }
})();
