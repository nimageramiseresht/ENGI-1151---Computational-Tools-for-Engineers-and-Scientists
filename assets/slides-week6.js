/* Week 6 slide widgets: likelihood, distribution gallery, Kolmogorov–Smirnov test, reading the CDF.
   Loaded after slides.js by week6-slides.html. */
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
  const sci = x => {                       // 5.6 × 10⁻⁷
    if (x === 0) return '0';
    const e = Math.floor(Math.log10(Math.abs(x))), m = x / Math.pow(10, e);
    const sup = String(e).replace(/-/g, '⁻').replace(/\d/g, d => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d]);
    return `${m.toFixed(2)} × 10${sup}`;
  };

  /* ================= special functions ================= */
  function lgamma(x) {                     // Lanczos approximation
    const g = 7, c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
      -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
    if (x < 0.5) return Math.log(Math.PI / Math.abs(Math.sin(Math.PI * x))) - lgamma(1 - x);
    x -= 1;
    let a = c[0];
    const t = x + g + 0.5;
    for (let i = 1; i < g + 2; i++) a += c[i] / (x + i);
    return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
  }
  const gammaFn = x => Math.exp(lgamma(x));
  function gammaP(a, x) {                  // regularised lower incomplete gamma
    if (x <= 0) return 0;
    if (x < a + 1) {
      let sum = 1 / a, term = sum;
      for (let n = 1; n < 500; n++) { term *= x / (a + n); sum += term; if (Math.abs(term) < Math.abs(sum) * 1e-14) break; }
      return sum * Math.exp(-x + a * Math.log(x) - lgamma(a));
    }
    let b = x + 1 - a, c = 1 / 1e-300, d = 1 / b, h = d;
    for (let i = 1; i < 500; i++) {
      const an = -i * (i - a); b += 2;
      d = an * d + b; if (Math.abs(d) < 1e-300) d = 1e-300;
      c = b + an / c; if (Math.abs(c) < 1e-300) c = 1e-300;
      d = 1 / d; const del = d * c; h *= del;
      if (Math.abs(del - 1) < 1e-14) break;
    }
    return 1 - Math.exp(-x + a * Math.log(x) - lgamma(a)) * h;
  }
  function betacf(a, b, x) {
    const qab = a + b, qap = a + 1, qam = a - 1;
    let c = 1, d = 1 - qab * x / qap;
    if (Math.abs(d) < 1e-300) d = 1e-300;
    d = 1 / d; let h = d;
    for (let m = 1; m <= 300; m++) {
      const m2 = 2 * m;
      let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
      d = 1 + aa * d; if (Math.abs(d) < 1e-300) d = 1e-300;
      c = 1 + aa / c; if (Math.abs(c) < 1e-300) c = 1e-300;
      d = 1 / d; h *= d * c;
      aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
      d = 1 + aa * d; if (Math.abs(d) < 1e-300) d = 1e-300;
      c = 1 + aa / c; if (Math.abs(c) < 1e-300) c = 1e-300;
      d = 1 / d; const del = d * c; h *= del;
      if (Math.abs(del - 1) < 1e-14) break;
    }
    return h;
  }
  function betaI(a, b, x) {                // regularised incomplete beta
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    const bt = Math.exp(lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log(1 - x));
    return x < (a + 1) / (a + b + 2) ? bt * betacf(a, b, x) / a : 1 - bt * betacf(b, a, 1 - x) / b;
  }
  function erf(x) {
    const s = Math.sign(x); x = Math.abs(x);
    const t = 1 / (1 + 0.3275911 * x);
    const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
    return s * y;
  }
  const Phi = z => 0.5 * (1 + erf(z / Math.SQRT2));
  const phi = z => Math.exp(-z * z / 2) / Math.sqrt(2 * Math.PI);
  function digamma(x) {
    let r = 0;
    while (x < 6) { r -= 1 / x; x += 1; }
    const f = 1 / (x * x);
    return r + Math.log(x) - 0.5 / x - f * (1 / 12 - f * (1 / 120 - f * (1 / 252 - f * (1 / 240 - f / 132))));
  }
  function trigamma(x) {
    let r = 0;
    while (x < 6) { r += 1 / (x * x); x += 1; }
    const f = 1 / (x * x);
    return r + 1 / x + f / 2 + f / x * (1 / 6 - f * (1 / 30 - f * (1 / 42 - f / 30)));
  }
  function invert(cdf, p, lo, hi) {        // bisection for the inverse CDF
    for (let i = 0; i < 80; i++) { const m = (lo + hi) / 2; if (cdf(m) < p) lo = m; else hi = m; }
    return (lo + hi) / 2;
  }

  /* ================= random numbers ================= */
  function prng(seed) {
    let a = seed >>> 0;
    const u = () => {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const normal = () => { let x, y, r; do { x = 2 * u() - 1; y = 2 * u() - 1; r = x * x + y * y; } while (r >= 1 || r === 0); return x * Math.sqrt(-2 * Math.log(r) / r); };
    const gamma = (k, scale) => {          // Marsaglia–Tsang
      if (k < 1) return gamma(k + 1, scale) * Math.pow(u(), 1 / k);
      const d = k - 1 / 3, c = 1 / Math.sqrt(9 * d);
      for (;;) {
        let x, v;
        do { x = normal(); v = 1 + c * x; } while (v <= 0);
        v = v * v * v; const uu = u();
        if (uu < 1 - 0.0331 * x ** 4 || Math.log(uu) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v * scale;
      }
    };
    return { u, normal, gamma };
  }
  const newSeed = () => Math.floor(Math.random() * 4294967296);

  /* ================= small plotting helper ================= */
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
    if (box.xlabel) kids.push(el('text', { x: (box.x0 + box.x1) / 2, y: box.y1 + 46, 'font-size': 14, 'text-anchor': 'middle', class: 'muted' }, box.xlabel));
    if (box.ylabel) kids.push(el('text', { x: box.x0 - 6, y: box.y0 - 14, 'font-size': 13, class: 'muted' }, box.ylabel));
    return { X, Y, kids };
  }
  const curve = (f, a, b, X, Y, n = 240, ytop) => {
    let d = '';
    for (let i = 0; i <= n; i++) {
      const x = a + (b - a) * i / n; let y = f(x);
      if (!Number.isFinite(y)) continue;
      let py = Y(y); if (ytop !== undefined) py = Math.max(py, ytop);
      d += (d ? ' L' : 'M') + fmt(X(x)) + ' ' + fmt(py);
    }
    return d;
  };
  const niceMax = m => { const p = Math.pow(10, Math.floor(Math.log10(m))); return [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].map(k => k * p).find(v => v >= m); };
  const ticks = (max, n = 5) => { const st = niceMax(max / n); const out = []; for (let t = 0; t <= max + 1e-9; t += st) out.push(+t.toFixed(10)); return out; };

  /* ================= 1.1 likelihood ================= */
  (() => {
    const svg = $('lk-svg');
    if (!svg) return;
    const DATA = [4.1, 5.0, 5.6, 6.2, 6.4, 7.1, 7.8, 9.0];
    const n = DATA.length, mean = DATA.reduce((a, b) => a + b) / n;
    const sdMLE = Math.sqrt(DATA.reduce((a, b) => a + (b - mean) ** 2, 0) / n);
    const mu = $('lk-mu'), sd = $('lk-sd'); [mu, sd].forEach(stopKeys);
    const pdf = (x, m, s) => phi((x - m) / s) / s;
    const ll = (m, s) => DATA.reduce((a, x) => a + Math.log(pdf(x, m, s)), 0);
    function draw() {
      const m = Number(mu.value), s = Number(sd.value);
      $('lk-muv').textContent = fmt(m, 2); $('lk-sdv').textContent = fmt(s, 2);
      const A = axes({ x0: 50, x1: 620, y0: 30, y1: 280, xmin: 0, xmax: 12, ymin: 0, ymax: 0.85, xticks: [0, 2, 4, 6, 8, 10, 12], yticks: [0, 0.2, 0.4, 0.6, 0.8], xlabel: 'x', ylabel: 'f(x | μ, σ)', yfmt: t => t.toFixed(1) });
      const kids = A.kids;
      kids.push(el('path', { class: 'line-acc', d: curve(x => pdf(x, m, s), 0, 12, A.X, A.Y, 240, 24) }));
      DATA.forEach(x => {
        const h = pdf(x, m, s);
        kids.push(el('path', { class: 'line-bad', d: `M${fmt(A.X(x))} 280 V ${fmt(Math.max(A.Y(h), 24))}`, 'stroke-width': 2 }));
        kids.push(el('circle', { cx: fmt(A.X(x)), cy: 280, r: 5, class: 'dot' }));
      });
      // inset: log-likelihood against mu at this sigma
      const ix0 = 420, ix1 = 610, iy0 = 34, iy1 = 120;
      kids.push(el('rect', { x: ix0 - 8, y: iy0 - 22, width: ix1 - ix0 + 16, height: iy1 - iy0 + 46, rx: 4, style: 'fill:var(--paper);stroke:var(--grid)' }));
      kids.push(el('text', { x: ix0, y: iy0 - 6, 'font-size': 12, class: 'muted' }, `ℓ against μ (σ = ${fmt(s, 2)})`));
      const lo = ll(6.4, s) - 25, hi = ll(6.4, s) + 1;
      const IX = v => ix0 + (v - 2) / 8 * (ix1 - ix0), IY = v => iy1 - (Math.max(v, lo) - lo) / (hi - lo) * (iy1 - iy0);
      kids.push(el('path', { class: 'line', d: `M${ix0} ${iy1} H ${ix1}` }));
      kids.push(el('path', { class: 'line-blue', d: curve(v => ll(v, s), 2, 10, IX, IY, 120) }));
      kids.push(el('circle', { cx: fmt(IX(m)), cy: fmt(IY(ll(m, s))), r: 5, class: 'fill-bad' }));
      kids.push(el('text', { x: ix0, y: iy1 + 16, 'font-size': 11, 'text-anchor': 'middle' }, '2'), el('text', { x: ix1, y: iy1 + 16, 'font-size': 11, 'text-anchor': 'middle' }, '10'));
      svg.replaceChildren(...kids);
      const L = DATA.reduce((a, x) => a * pdf(x, m, s), 1), l = ll(m, s), Lbest = Math.exp(ll(mean, sdMLE));
      const atBest = Math.abs(m - mean) < 0.03 && Math.abs(s - sdMLE) < 0.03;
      $('lk-out').innerHTML = `L(μ, σ) = <b>${sci(L)}</b><br>ℓ = ln L = <b>${fmt(l, 2)}</b><br>` +
        (atBest ? `<span class="good">maximum: μ̂ = x̄ = ${fmt(mean, 2)}, σ̂ = ${fmt(sdMLE, 2)}</span>` : `<span class="muted">best possible: ${sci(Lbest)}</span>`);
    }
    [mu, sd].forEach(i => i.addEventListener('input', draw));
    $('lk-best').addEventListener('click', () => { mu.value = mean; sd.value = sdMLE; draw(); });
    $('lk-reset').addEventListener('click', () => { mu.value = 4; sd.value = 2.5; draw(); });
    draw();
  })();

  /* ================= 2.1 distribution gallery ================= */
  (() => {
    const svg = $('ga-svg');
    if (!svg) return;
    const sel = $('ga-dist'), cdfBox = $('ga-cdf'), slBox = $('ga-sliders'), info = $('ga-info');
    [sel, cdfBox].forEach(stopKeys);
    const D = {
      norm: { label: 'normal', range: [-10, 10], cap: 1.5,
        params: [['loc', -5, 5, 0.1, 0], ['scale', 0.3, 4, 0.05, 1.5]],
        pdf: (x, p) => phi((x - p.loc) / p.scale) / p.scale, cdf: (x, p) => Phi((x - p.loc) / p.scale),
        mom: p => [p.loc, p.scale, 0], support: '−∞ to +∞', use: 'symmetric data: measurement errors, tolerances' },
      t: { label: 'Student t', range: [-10, 10], cap: 0.5,
        params: [['df', 1, 30, 1, 3], ['loc', -5, 5, 0.1, 0]],
        pdf: (x, p) => { const z = x - p.loc, v = p.df; return Math.exp(lgamma((v + 1) / 2) - lgamma(v / 2)) / Math.sqrt(v * Math.PI) * Math.pow(1 + z * z / v, -(v + 1) / 2); },
        cdf: (x, p) => { const z = x - p.loc, v = p.df, b = betaI(v / 2, 0.5, v / (v + z * z)); return z >= 0 ? 1 - b / 2 : b / 2; },
        mom: p => [p.df > 1 ? p.loc : NaN, p.df > 2 ? Math.sqrt(p.df / (p.df - 2)) : NaN, p.df > 3 ? 0 : NaN], support: '−∞ to +∞', use: 'symmetric, with heavier tails than the normal' },
      uniform: { label: 'uniform', range: [-10, 10], cap: 2.2,
        params: [['loc', -8, 4, 0.1, -3], ['scale', 0.5, 12, 0.1, 6]],
        pdf: (x, p) => (x >= p.loc && x <= p.loc + p.scale) ? 1 / p.scale : 0,
        cdf: (x, p) => Math.min(Math.max((x - p.loc) / p.scale, 0), 1),
        mom: p => [p.loc + p.scale / 2, p.scale / Math.sqrt(12), 0], support: 'loc to loc + scale', use: 'only the minimum and maximum are known' },
      triang: { label: 'triangular', range: [0, 12], cap: 2.2,
        params: [['c', 0, 1, 0.01, 0.3], ['loc', 0, 4, 0.1, 1], ['scale', 1, 8, 0.1, 7]],
        pdf: (x, p) => { const a = p.loc, b = p.loc + p.scale, m = a + p.c * p.scale; if (x < a || x > b) return 0; return x < m ? 2 * (x - a) / ((b - a) * (m - a) || 1e-12) : 2 * (b - x) / ((b - a) * (b - m) || 1e-12); },
        cdf: (x, p) => { const a = p.loc, b = p.loc + p.scale, m = a + p.c * p.scale; if (x <= a) return 0; if (x >= b) return 1; return x < m ? (x - a) ** 2 / ((b - a) * (m - a)) : 1 - (b - x) ** 2 / ((b - a) * (b - m)); },
        mom: p => { const a = p.loc, b = p.loc + p.scale, c = a + p.c * p.scale, q = a * a + b * b + c * c - a * b - a * c - b * c; return [(a + b + c) / 3, Math.sqrt(q / 18), Math.SQRT2 * (a + b - 2 * c) * (2 * a - b - c) * (a - 2 * b + c) / (5 * Math.pow(q, 1.5))]; },
        support: 'loc to loc + scale', use: 'expert estimates: minimum, most likely, maximum' },
      expon: { label: 'exponential', range: [0, 12], cap: 3,
        params: [['scale', 0.3, 5, 0.05, 1.5]],
        pdf: (x, p) => x < 0 ? 0 : Math.exp(-x / p.scale) / p.scale, cdf: (x, p) => x < 0 ? 0 : 1 - Math.exp(-x / p.scale),
        mom: p => [p.scale, p.scale, 2], support: '0 to +∞', use: 'times between random events' },
      lognorm: { label: 'lognormal', range: [0, 12], cap: 1.5,
        params: [['s', 0.1, 1.5, 0.01, 0.5], ['scale', 0.5, 6, 0.05, 3]],
        pdf: (x, p) => x <= 0 ? 0 : phi(Math.log(x / p.scale) / p.s) / (p.s * x), cdf: (x, p) => x <= 0 ? 0 : Phi(Math.log(x / p.scale) / p.s),
        mom: p => { const w = Math.exp(p.s * p.s); return [p.scale * Math.sqrt(w), p.scale * Math.sqrt(w * (w - 1)), (w + 2) * Math.sqrt(w - 1)]; },
        support: '0 to +∞', use: 'positive, right-skewed: repair times, particle sizes' },
      gamma: { label: 'gamma', range: [0, 12], cap: 1.5,
        params: [['a', 0.5, 12, 0.1, 2], ['scale', 0.2, 3, 0.05, 1.2]],
        pdf: (x, p) => x <= 0 ? 0 : Math.exp((p.a - 1) * Math.log(x / p.scale) - x / p.scale - lgamma(p.a)) / p.scale, cdf: (x, p) => gammaP(p.a, Math.max(x, 0) / p.scale),
        mom: p => [p.a * p.scale, Math.sqrt(p.a) * p.scale, 2 / Math.sqrt(p.a)], support: '0 to +∞', use: 'positive, right-skewed: rainfall, loads, energy' },
      weibull_min: { label: 'Weibull', range: [0, 12], cap: 1.5,
        params: [['c', 0.5, 6, 0.05, 2], ['scale', 0.5, 8, 0.05, 4]],
        pdf: (x, p) => x <= 0 ? 0 : p.c / p.scale * Math.pow(x / p.scale, p.c - 1) * Math.exp(-Math.pow(x / p.scale, p.c)), cdf: (x, p) => x <= 0 ? 0 : 1 - Math.exp(-Math.pow(x / p.scale, p.c)),
        mom: p => { const k = p.c, l = p.scale, g1 = gammaFn(1 + 1 / k), g2 = gammaFn(1 + 2 / k), g3 = gammaFn(1 + 3 / k), m = l * g1, v = l * l * (g2 - g1 * g1); return [m, Math.sqrt(v), (l ** 3 * g3 - 3 * m * v - m ** 3) / v ** 1.5]; },
        support: '0 to +∞', use: 'wind speeds, failure times, strength of materials' },
      beta: { label: 'beta', range: [0, 1], cap: 6,
        params: [['a', 0.5, 10, 0.1, 5], ['b', 0.5, 10, 0.1, 2]],
        pdf: (x, p) => (x <= 0 || x >= 1) ? 0 : Math.exp((p.a - 1) * Math.log(x) + (p.b - 1) * Math.log(1 - x) + lgamma(p.a + p.b) - lgamma(p.a) - lgamma(p.b)), cdf: (x, p) => betaI(p.a, p.b, x),
        mom: p => { const a = p.a, b = p.b; return [a / (a + b), Math.sqrt(a * b / ((a + b) ** 2 * (a + b + 1))), 2 * (b - a) * Math.sqrt(a + b + 1) / ((a + b + 2) * Math.sqrt(a * b))]; },
        support: '0 to 1 (or loc to loc + scale)', use: 'bounded quantities: efficiencies, proportions' }
    };
    Object.entries(D).forEach(([k, d]) => { const o = document.createElement('option'); o.value = k; o.textContent = `${d.label} (${k})`; sel.append(o); });
    sel.value = 'gamma';
    let inputs = {};
    function build() {
      const d = D[sel.value];
      slBox.innerHTML = d.params.map(([n, lo, hi, st, v]) => `<div class="ctl sm"><label>${n} <input type="range" data-p="${n}" min="${lo}" max="${hi}" step="${st}" value="${v}"> <b data-v="${n}"></b></label></div>`).join('');
      inputs = {};
      slBox.querySelectorAll('input').forEach(i => { stopKeys(i); inputs[i.dataset.p] = i; i.addEventListener('input', draw); });
      draw();
    }
    const shapeWord = g => !Number.isFinite(g) ? 'symmetric (skewness undefined for df ≤ 3)' : Math.abs(g) < 0.05 ? 'symmetric' : g > 0 ? 'right-skewed' : 'left-skewed';
    function draw() {
      const key = sel.value, d = D[key], p = {};
      for (const k in inputs) { p[k] = Number(inputs[k].value); slBox.querySelector(`[data-v="${k}"]`).textContent = p[k]; }
      const [lo, hi] = d.range, isCdf = cdfBox.checked;
      const f = isCdf ? x => d.cdf(x, p) : x => d.pdf(x, p);
      let ymax = 1;
      if (!isCdf) {
        let m = 0;
        for (let i = 0; i <= 400; i++) { const v = f(lo + (hi - lo) * (i + 0.5) / 401); if (Number.isFinite(v)) m = Math.max(m, v); }
        ymax = niceMax(Math.min(m, d.cap) * 1.08);
      }
      const xt = []; const step = hi - lo > 5 ? (hi - lo > 15 ? 5 : 2) : 0.2;
      for (let t = lo; t <= hi + 1e-9; t += step) xt.push(+t.toFixed(2));
      const A = axes({ x0: 56, x1: 640, y0: 26, y1: 300, xmin: lo, xmax: hi, ymin: 0, ymax, xticks: xt, yticks: ticks(ymax, 4), xlabel: 'x', ylabel: isCdf ? 'F(x)' : 'f(x)', yfmt: t => +t.toFixed(3) + '' });
      const kids = A.kids, path = curve(f, lo, hi, A.X, A.Y, 400, 20);
      if (!isCdf) kids.push(el('path', { class: 'area', d: path + ` L${fmt(A.X(hi))} 300 L${fmt(A.X(lo))} 300 Z`, style: 'stroke:none' }));
      kids.push(el('path', { class: 'line-acc', d: path }));
      svg.replaceChildren(...kids);
      const [mean, sd, g] = d.mom(p);
      const call = `stats.${key}(${Object.entries(p).map(([k, v]) => `${k}=${v}`).join(', ')})`;
      info.innerHTML = `<dt>support</dt><dd>${d.support}</dd>` +
        `<dt>shape</dt><dd><b>${shapeWord(g)}</b>${Number.isFinite(g) ? `, skewness ${fmt(g, 2)}` : ''}</dd>` +
        `<dt>mean, std</dt><dd>${Number.isFinite(mean) ? fmt(mean, 2) : 'undefined'}, ${Number.isFinite(sd) ? fmt(sd, 2) : 'undefined'}</dd>` +
        `<dt>use for</dt><dd>${d.use}</dd>` +
        `<dt>SciPy</dt><dd><code>${call}</code></dd>`;
    }
    sel.addEventListener('change', build);
    cdfBox.addEventListener('change', draw);
    build();
  })();

  /* ================= 3.3 Kolmogorov–Smirnov test ================= */
  (() => {
    const svg = $('ks-svg');
    if (!svg) return;
    const sel = $('ks-dist'), nIn = $('ks-n'); [sel, nIn].forEach(stopKeys);
    let seed = 20261105, data = [];
    function sample() {
      const r = prng(seed), n = Number(nIn.value);
      data = Array.from({ length: n }, () => r.gamma(2.5, 4)).sort((a, b) => a - b);
    }
    function fit(key) {
      const n = data.length, mean = data.reduce((a, b) => a + b) / n;
      const lx = data.map(Math.log), lmean = lx.reduce((a, b) => a + b) / n;
      if (key === 'norm') { const s = Math.sqrt(data.reduce((a, x) => a + (x - mean) ** 2, 0) / n); return { label: `μ = ${fmt(mean, 2)}, σ = ${fmt(s, 2)}`, cdf: x => Phi((x - mean) / s) }; }
      if (key === 'expon') return { label: `scale = ${fmt(mean, 2)}`, cdf: x => x <= 0 ? 0 : 1 - Math.exp(-x / mean) };
      if (key === 'lognorm') { const s = Math.sqrt(lx.reduce((a, x) => a + (x - lmean) ** 2, 0) / n), sc = Math.exp(lmean); return { label: `s = ${fmt(s, 3)}, scale = ${fmt(sc, 2)}`, cdf: x => x <= 0 ? 0 : Phi(Math.log(x / sc) / s) }; }
      // gamma, loc = 0: Newton's method on ln a − ψ(a) = ln(mean) − mean(ln x)
      const s = Math.log(mean) - lmean;
      let a = (3 - s + Math.sqrt((s - 3) ** 2 + 24 * s)) / (12 * s);
      for (let i = 0; i < 20; i++) a -= (Math.log(a) - digamma(a) - s) / (1 / a - trigamma(a));
      const sc = mean / a;
      return { label: `a = ${fmt(a, 2)}, scale = ${fmt(sc, 2)}`, cdf: x => gammaP(a, Math.max(x, 0) / sc) };
    }
    function pvalue(D, n) {                // asymptotic Kolmogorov distribution (Stephens' correction)
      const sq = Math.sqrt(n), lam = (sq + 0.12 + 0.11 / sq) * D;
      let p = 0;
      for (let k = 1; k <= 100; k++) p += 2 * Math.pow(-1, k - 1) * Math.exp(-2 * k * k * lam * lam);
      return Math.min(Math.max(p, 0), 1);
    }
    function draw() {
      const n = data.length, F = fit(sel.value);
      $('ks-nv').textContent = n;
      let D = 0, loc = 0, lowY = 0, highY = 0, sign = 1;
      data.forEach((x, i) => {
        const Fx = F.cdf(x), up = (i + 1) / n - Fx, dn = Fx - i / n;
        if (up > D) { D = up; loc = x; lowY = Fx; highY = (i + 1) / n; sign = 1; }
        if (dn > D) { D = dn; loc = x; lowY = i / n; highY = Fx; sign = -1; }
      });
      const xmax = Math.ceil(data[n - 1] * 1.05 / 5) * 5;
      const xt = []; for (let t = 0; t <= xmax; t += xmax > 40 ? 10 : 5) xt.push(t);
      const A = axes({ x0: 56, x1: 640, y0: 26, y1: 320, xmin: 0, xmax, ymin: 0, ymax: 1, xticks: xt, yticks: [0, 0.25, 0.5, 0.75, 1], xlabel: 'repair time x (h)', ylabel: 'cumulative probability' });
      const kids = A.kids;
      let d = `M${fmt(A.X(0))} ${fmt(A.Y(0))}`;
      data.forEach((x, i) => { d += ` H ${fmt(A.X(x))} V ${fmt(A.Y((i + 1) / n))}`; });
      d += ` H ${fmt(A.X(xmax))}`;
      kids.push(el('path', { d, style: 'stroke:var(--accent);stroke-width:2.2;fill:none' }));
      kids.push(el('path', { class: 'line-blue', d: curve(F.cdf, 0, xmax, A.X, A.Y, 300) }));
      kids.push(el('path', { class: 'line-bad', d: `M${fmt(A.X(loc))} ${fmt(A.Y(lowY))} V ${fmt(A.Y(highY))}`, 'stroke-width': 4 }));
      kids.push(el('text', { x: fmt(A.X(loc) + 10), y: fmt(A.Y((lowY + highY) / 2) + 5), 'font-size': 16, class: 'bad', 'font-weight': 700 }, `D = ${fmt(D, 3)}`));
      kids.push(el('path', { d: 'M430 250 h26', style: 'stroke:var(--accent);stroke-width:2.2' }), el('text', { x: 462, y: 255, 'font-size': 13 }, 'empirical CDF (data)'));
      kids.push(el('path', { class: 'line-blue', d: 'M430 272 h26' }), el('text', { x: 462, y: 277, 'font-size': 13 }, `fitted ${sel.options[sel.selectedIndex].text} CDF`));
      svg.replaceChildren(...kids);
      const crit = 1.36 / Math.sqrt(n), p = pvalue(D, n), ok = D <= crit;
      $('ks-out').innerHTML = `fit: ${F.label}<br>D = <b>${fmt(D, 3)}</b> at x = ${fmt(loc, 2)} h<br>` +
        `critical (α = 0.05): 1.36/√${n} = ${fmt(crit, 3)}<br>p ≈ <b>${p < 0.0001 ? p.toExponential(1) : fmt(p, 4)}</b><br>` +
        (ok ? '<span class="good">D ≤ critical: cannot reject</span>' : '<span class="bad">D &gt; critical: reject</span>');
    }
    sel.addEventListener('change', draw);
    nIn.addEventListener('input', () => { sample(); draw(); });
    $('ks-new').addEventListener('click', () => { seed = newSeed(); sample(); draw(); });
    sample(); draw();
  })();

  /* ================= 5.1 reading the CDF ================= */
  (() => {
    const svg = $('pc-svg');
    if (!svg) return;
    const A_ = 3.152, SC = 104.19, XMAX = 900;
    const cdf = x => gammaP(A_, Math.max(x, 0) / SC);
    const ppf = p => invert(cdf, p, 0, 3000);
    const pIn = $('pc-p'), xIn = $('pc-x'); [pIn, xIn].forEach(stopKeys);
    const modeOf = () => document.querySelector('input[name="pc-mode"]:checked').value;
    function draw() {
      const mode = modeOf();
      $('pc-prow').style.display = mode === 'p' ? '' : 'none'; $('pc-xrow').style.display = mode === 'x' ? '' : 'none';
      const A = axes({ x0: 60, x1: 640, y0: 26, y1: 320, xmin: 0, xmax: XMAX, ymin: 0, ymax: 1, xticks: [0, 150, 300, 450, 600, 750, 900], yticks: [0, 0.2, 0.4, 0.6, 0.8, 1], xlabel: 'energy generated in one day, x (MWh)', ylabel: 'F(x) = P(E ≤ x)', yfmt: t => t.toFixed(1) });
      const kids = A.kids;
      kids.push(el('path', { class: 'line-acc', d: curve(cdf, 0, XMAX, A.X, A.Y, 300) }));
      let p, x;
      if (mode === 'p') { p = Number(pIn.value); x = ppf(p); $('pc-pv').textContent = p.toFixed(2); }
      else { x = Number(xIn.value); p = cdf(x); $('pc-xv').textContent = x; }
      const px = A.X(x), py = A.Y(p);
      const arrow = (x1, y1, x2, y2) => {
        kids.push(el('path', { class: 'line-bad', d: `M${fmt(x1)} ${fmt(y1)} L ${fmt(x2)} ${fmt(y2)}`, 'stroke-dasharray': '7 4' }));
        const ang = Math.atan2(y2 - y1, x2 - x1), s = 10;
        kids.push(el('path', { class: 'fill-bad', d: `M${fmt(x2)} ${fmt(y2)} L ${fmt(x2 - s * Math.cos(ang - 0.4))} ${fmt(y2 - s * Math.sin(ang - 0.4))} L ${fmt(x2 - s * Math.cos(ang + 0.4))} ${fmt(y2 - s * Math.sin(ang + 0.4))} Z` }));
      };
      if (mode === 'p') { arrow(60, py, px, py); arrow(px, py, px, 320); }
      else { arrow(px, 320, px, py); arrow(px, py, 60, py); }
      kids.push(el('circle', { cx: fmt(px), cy: fmt(py), r: 6, class: 'fill-bad' }));
      kids.push(el('text', { x: 66, y: fmt(py - 8), 'font-size': 15, class: 'bad', 'font-weight': 700 }, `p = ${p.toFixed(mode === 'p' ? 2 : 3)}`));
      kids.push(el('text', { x: fmt(px + 8), y: 312, 'font-size': 15, class: 'bad', 'font-weight': 700 }, `x = ${fmt(x, mode === 'p' ? 1 : 0)} MWh`));
      kids.push(el('text', { x: 630, y: 290, 'font-size': 14, 'text-anchor': 'end', class: 'muted' }, `gamma fit: a = ${A_}, scale = ${SC} MWh`));
      svg.replaceChildren(...kids);
      $('pc-out').innerHTML = mode === 'p'
        ? `<code>dist.ppf(${p.toFixed(2)})</code> = <b>${fmt(x, 1)} MWh</b><br><span class="muted">on ${Math.round(p * 100)} % of days the farm generates less than ${fmt(x, 0)} MWh; on ${Math.round((1 - p) * 100)} % of days more</span>`
        : `<code>dist.cdf(${x})</code> = <b>${p.toFixed(3)}</b><br><code>dist.sf(${x})</code> = <b>${(1 - p).toFixed(3)}</b><br><span class="muted">P(E ≤ ${x} MWh) and P(E &gt; ${x} MWh)</span>`;
    }
    [pIn, xIn].forEach(i => i.addEventListener('input', draw));
    document.querySelectorAll('input[name="pc-mode"]').forEach(r => { stopKeys(r); r.addEventListener('change', draw); });
    draw();
  })();

  /* ================= formulas: KaTeX, on the slides only ================= */
  if (window.renderMathInElement) {
    renderMathInElement(document.querySelector('.reveal .slides'), {
      delimiters: [{ left: '\\(', right: '\\)', display: false }],
      ignoredClasses: ['notes', 'py'], throwOnError: false
    });
  }
})();
