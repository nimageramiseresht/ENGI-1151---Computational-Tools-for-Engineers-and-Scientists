/* Week 3 widgets: NumPy and Matplotlib. Each mimics what Python would print. */

/* ---------- NumPy-style printing ---------- */
function npFmt(arr) {
  // arr: number | number[] | number[][] ; ints print without a dot, floats NumPy-style
  const flat = Array.isArray(arr) ? arr.flat() : [arr];
  const isFloat = arr.__float || flat.some(v => !Number.isInteger(v));
  const fmtOne = v => {
    if (!isFloat) return String(v);
    let s = String(Number(v.toFixed(8)));
    if (s === '-0') s = '0';
    return s.includes('.') ? s : s + '.';
  };
  if (!Array.isArray(arr)) return fmtOne(arr).replace(/\.$/, isFloat ? '.0' : '');
  const strs = flat.map(fmtOne);
  let w;
  if (isFloat) {
    const ip = Math.max(...strs.map(s => s.split('.')[0].length));
    const fp = Math.max(...strs.map(s => s.split('.')[1].length));
    w = s => { const [a, b] = s.split('.'); return a.padStart(ip) + '.' + b.padEnd(fp); };
  } else {
    const ww = Math.max(...strs.map(s => s.length));
    w = s => s.padStart(ww);
  }
  let k = 0;
  if (!Array.isArray(arr[0])) return '[' + arr.map(() => w(strs[k++])).join(' ') + ']';
  return '[' + arr.map(row => '[' + row.map(() => w(strs[k++])).join(' ') + ']').join('\n ') + ']';
}
const asFloat = a => { a.__float = true; return a; };

/* ---------- Hero: rotating surface ---------- */
(() => {
  const canvas = document.getElementById('hero-surf');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const nIn = document.getElementById('surf-n'), nOut = document.getElementById('surf-nv');
  const shapeOut = document.getElementById('surf-shape'), spinBtn = document.getElementById('surf-spin');
  const VIR = [[68, 1, 84], [59, 82, 139], [33, 145, 140], [94, 201, 98], [253, 231, 37]];
  const vir = t => {
    t = Math.min(1, Math.max(0, t)) * (VIR.length - 1);
    const i = Math.min(VIR.length - 2, Math.floor(t)), f = t - i;
    const c = VIR[i].map((v, k) => Math.round(v + (VIR[i + 1][k] - v) * f));
    return `rgb(${c[0]},${c[1]},${c[2]})`;
  };
  let n, Z, xs, az = 0.7, el = 0.55, spinning = !reduceMotion, dragging = false, last = null, raf, box;

  function build() {
    n = Number(nIn.value);
    nOut.textContent = n; shapeOut.textContent = `(${n}, ${n})`;
    xs = Array.from({ length: n }, (_, i) => -5 + 10 * i / (n - 1));      // np.linspace(-5, 5, n)
    Z = xs.map(y => xs.map(x => Math.sin(Math.sqrt(x * x + y * y))));     // Z[i][j] for Y=xs[i], X=xs[j]
  }
  function size() {
    const dpr = window.devicePixelRatio || 1, r = canvas.getBoundingClientRect();
    canvas.width = Math.round(r.width * dpr); canvas.height = Math.round(r.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); box = r;
  }
  function project(x, y, z) {
    const ca = Math.cos(az), sa = Math.sin(az), ce = Math.cos(el), se = Math.sin(el);
    const X = x * ca - y * sa, Y = x * sa + y * ca;
    const depth = Y * ce + z * 1.6 * se;
    const sy = -(z * 1.6 * ce - Y * se);
    const s = Math.min(box.width, box.height * 1.25) / 17;
    return [box.width / 2 + X * s, box.height * 0.55 + sy * s, depth];
  }
  function draw() {
    const cs = getComputedStyle(document.documentElement);
    ctx.clearRect(0, 0, box.width, box.height);
    const P = Z.map((row, i) => row.map((z, j) => project(xs[j], xs[i], z)));
    const quads = [];
    for (let i = 0; i < n - 1; i++) for (let j = 0; j < n - 1; j++) {
      const z = (Z[i][j] + Z[i + 1][j] + Z[i][j + 1] + Z[i + 1][j + 1]) / 4;
      const d = (P[i][j][2] + P[i + 1][j + 1][2]) / 2;
      quads.push([d, z, P[i][j], P[i][j + 1], P[i + 1][j + 1], P[i + 1][j]]);
    }
    quads.sort((a, b) => b[0] - a[0]);
    ctx.lineWidth = n > 36 ? 0.3 : 0.6;
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    for (const q of quads) {
      ctx.beginPath(); ctx.moveTo(q[2][0], q[2][1]);
      for (let k = 3; k < 6; k++) ctx.lineTo(q[k][0], q[k][1]);
      ctx.closePath(); ctx.fillStyle = vir((q[1] + 1) / 2); ctx.fill(); ctx.stroke();
    }
    ctx.fillStyle = cs.getPropertyValue('--muted').trim();
    ctx.font = '11px "IBM Plex Mono", monospace';
    ctx.fillText('x, y ∈ [-5, 5]', 6, box.height - 8);
  }
  function loop() {
    if (spinning && !dragging) az += 0.006;
    draw();
    raf = requestAnimationFrame(loop);
  }
  canvas.addEventListener('pointerdown', e => { dragging = true; last = [e.clientX, e.clientY]; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', e => {
    if (!dragging) return;
    az -= (e.clientX - last[0]) * 0.01;
    el = Math.min(1.45, Math.max(0.05, el + (e.clientY - last[1]) * 0.008));
    last = [e.clientX, e.clientY];
    if (reduceMotion) draw();
  });
  canvas.addEventListener('pointerup', () => { dragging = false; });
  nIn.addEventListener('input', () => { build(); draw(); });
  spinBtn.addEventListener('click', () => { spinning = !spinning; spinBtn.textContent = spinning ? 'Pause' : 'Spin'; });
  window.addEventListener('resize', () => { size(); draw(); });
  size(); build(); draw();
  if (reduceMotion) { spinBtn.textContent = 'Spin'; }
  loop();
})();

/* ---------- Lists versus arrays ---------- */
(() => {
  const chips = document.getElementById('lva-chips');
  if (!chips) return;
  const L = document.getElementById('lva-list'), A = document.getElementById('lva-arr');
  const OPS = [
    ['* 2', '[1, 2, 3, 1, 2, 3]', '# the list is repeated', '[2 4 6]', '# every element is doubled'],
    ['+ 1', 'TypeError: can only concatenate list (not "int") to list', '', '[2 3 4]', '# 1 is added to every element'],
    ['+ [10, 20, 30]', '[1, 2, 3, 10, 20, 30]', '# the lists are joined end to end', '[11 22 33]', '# element by element'],
    ['* [10, 20, 30]', "TypeError: can't multiply sequence by non-int of type 'list'", '', '[10 40 90]', '# element by element'],
    ['** 2', "TypeError: unsupported operand type(s) for ** or pow(): 'list' and 'int'", '', '[1 4 9]', ''],
    ['/ 2', "TypeError: unsupported operand type(s) for /: 'list' and 'int'", '', '[0.5 1.  1.5]', '# / gives floats'],
    ['+ [10, 20]', '[1, 2, 3, 10, 20]', '# any lengths can be joined', 'ValueError: operands could not be broadcast together with shapes (3,) (2,)', '# element-wise needs matching shapes'],
  ];
  const show = (el, expr, res, note) => {
    const isErr = /Error:/.test(res);
    el.innerHTML = `<span class="k">&gt;&gt;&gt;</span> ${esc(expr)}\n` +
      (isErr ? `<span class="err">${esc(res.split(':')[0])}</span>:${esc(res.slice(res.indexOf(':') + 1))}` : `<b>${esc(res)}</b>`) +
      (note ? `\n<span class="k">${esc(note)}</span>` : '');
  };
  function pick(i) {
    const [op, lr, ln, ar, an] = OPS[i];
    show(L, `print(python_list ${op})`, lr, ln);
    show(A, `print(numpy_array ${op})`, ar, an);
    [...chips.children].forEach((c, k) => c.classList.toggle('run', k === i));
  }
  OPS.forEach((o, i) => {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = o[0];
    b.addEventListener('click', () => pick(i)); chips.append(b);
  });
  pick(0);
})();

/* ---------- 2-D indexing explorer ---------- */
(() => {
  const inp = document.getElementById('ix-in');
  if (!inp) return;
  const M = [[10, 20, 30], [40, 50, 60]];
  const R = 2, C = 3;
  const gridEl = document.getElementById('ix-grid'), out = document.getElementById('ix-out');
  gridEl.innerHTML =
    `<div style="display:grid;grid-template-columns:2rem repeat(${C}, 3.2rem);gap:4px;font-family:var(--mono);font-size:.9rem;align-items:center">` +
    `<span></span>` + [...Array(C).keys()].map(j => `<span style="text-align:center;font-size:.72rem;color:var(--muted)">${j}</span>`).join('') +
    M.map((row, i) => `<span style="font-size:.72rem;color:var(--muted);text-align:right">${i}</span>` +
      row.map((v, j) => `<span class="ixc" data-i="${i}" data-j="${j}" style="border:1.5px solid var(--ink);text-align:center;padding:.35rem 0;transition:background .2s,color .2s">${v}</span>`).join('')).join('') +
    `</div>`;
  const cells = [...gridEl.querySelectorAll('.ixc')];
  const chips = document.getElementById('ix-chips');
  ['0, 1', '1, 2', '0, :', ':, 1', '1', '-1, -1', ':, 0:2', '0:2, 1:', ':, ::2', '2, 0', '0, 1, 2'].forEach(x => {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = `matrix[${x}]`;
    b.addEventListener('click', () => { inp.value = x; run(); }); chips.append(b);
  });
  function part(p, size, axis) {
    p = p.trim();
    if (/^[+-]?\d+$/.test(p)) {
      const i = parseInt(p, 10);
      if (i >= size || i < -size) throw `IndexError: index ${i} is out of bounds for axis ${axis} with size ${size}`;
      return { int: true, idx: [i < 0 ? i + size : i] };
    }
    const m = p.match(/^([+-]?\d*):([+-]?\d*)(?::([+-]?\d*))?$/);
    if (!m) throw 'SyntaxError: use whole numbers, colons and one comma';
    const step = m[3] ? parseInt(m[3], 10) : 1;
    if (step === 0) throw 'ValueError: slice step cannot be zero';
    const norm = (v, d) => { if (v === '') return d; let n = parseInt(v, 10); if (n < 0) n += size; return Math.min(Math.max(n, step > 0 ? 0 : -1), step > 0 ? size : size - 1); };
    const a = norm(m[1], step > 0 ? 0 : size - 1), b = norm(m[2], step > 0 ? size : -1);
    const idx = []; for (let i = a; step > 0 ? i < b : i > b; i += step) idx.push(i);
    return { int: false, idx };
  }
  function run() {
    const t = inp.value;
    const head = `<span class="k">&gt;&gt;&gt;</span> print(matrix[${esc(t.trim())}])\n`;
    let sel = [];
    try {
      const parts = t.split(',');
      if (parts.length > 2) throw `IndexError: too many indices for array: array is 2-dimensional, but ${parts.length} were indexed`;
      const r = part(parts[0], R, 0);
      const c = parts.length === 2 ? part(parts[1], C, 1) : { int: false, idx: [0, 1, 2] };
      r.idx.forEach(i => c.idx.forEach(j => sel.push(i + ',' + j)));
      let res, shape;
      if (r.int && c.int) { res = String(M[r.idx[0]][c.idx[0]]); shape = 'a single number'; }
      else if (r.int) { res = npFmt(c.idx.map(j => M[r.idx[0]][j])); shape = `shape (${c.idx.length},): part of row ${r.idx[0]}`; }
      else if (c.int) { res = npFmt(r.idx.map(i => M[i][c.idx[0]])); shape = `shape (${r.idx.length},): part of column ${c.idx[0]}`; }
      else {
        const sub = r.idx.map(i => c.idx.map(j => M[i][j]));
        res = sub.length && sub[0].length ? npFmt(sub) : '[]';
        shape = `shape (${r.idx.length}, ${c.idx.length}): still 2-D`;
      }
      out.innerHTML = head + `<b>${esc(res)}</b>\n<span class="k"># ${esc(shape)}</span>`;
    } catch (e) {
      out.innerHTML = head + `<span class="err">${esc(e.split(':')[0])}</span>:${esc(e.slice(e.indexOf(':') + 1))}`;
    }
    cells.forEach(el => {
      const on = sel.includes(el.dataset.i + ',' + el.dataset.j);
      el.style.background = on ? 'var(--accent)' : '';
      el.style.color = on ? 'var(--paper)' : '';
      el.style.borderColor = on ? 'var(--accent)' : '';
    });
  }
  inp.addEventListener('input', run); run();
})();

/* ---------- arange / linspace ---------- */
(() => {
  const fn = document.getElementById('sp-fn');
  if (!fn) return;
  const a = document.getElementById('sp-a'), b = document.getElementById('sp-b'), c = document.getElementById('sp-c');
  const clabel = document.getElementById('sp-clabel'), endWrap = document.getElementById('sp-endwrap'), end = document.getElementById('sp-end');
  const line = document.getElementById('sp-line'), out = document.getElementById('sp-out');
  const chips = document.getElementById('sp-chips');
  [['arange', 0, 10, 2], ['arange', 0, 1, 0.1], ['arange', 1, 1.3, 0.1], ['arange', 5, 0, -1], ['linspace', 0, 1, 5], ['linspace', 0, 10, 5], ['linspace', 0, 10, 11], ['linspace', 0, 1, 4, false]].forEach(([f, x, y, z, e]) => {
    const bt = document.createElement('button'); bt.type = 'button';
    bt.textContent = `np.${f}(${x}, ${y}, ${z}${e === false ? ', endpoint=False' : ''})`;
    bt.addEventListener('click', () => { fn.value = f; a.value = x; b.value = y; c.value = z; end.checked = e !== false; sync(); }); chips.append(bt);
  });
  function sync() {
    const lin = fn.value === 'linspace';
    clabel.textContent = lin ? 'num' : 'step';
    endWrap.hidden = !lin;
    run();
  }
  function run() {
    const A = Number(a.value), B = Number(b.value), Cv = Number(c.value);
    const lin = fn.value === 'linspace';
    const call = lin ? `np.linspace(${a.value}, ${b.value}, ${c.value}${end.checked ? '' : ', endpoint=False'})` : `np.arange(${a.value}, ${b.value}, ${c.value})`;
    const head = `<span class="k">&gt;&gt;&gt;</span> print(${esc(call)})\n`;
    let vals = [], note = '';
    if ([a.value, b.value, c.value].some(v => v.trim() === '' || isNaN(Number(v)))) { out.innerHTML = head + '<span class="k">fill in all three numbers</span>'; line.innerHTML = ''; return; }
    if (lin) {
      if (!Number.isInteger(Cv) || Cv < 0) { out.innerHTML = head + '<span class="err">TypeError</span>: num must be a whole number, at least 0'; line.innerHTML = ''; return; }
      if (Cv > 60) { out.innerHTML = head + '<span class="k">(the widget shows up to 60 values)</span>'; line.innerHTML = ''; return; }
      const div = end.checked ? Cv - 1 : Cv;
      const step = div > 0 ? (B - A) / div : 0;
      for (let i = 0; i < Cv; i++) vals.push(A + i * step);
      if (end.checked && Cv > 1) vals[Cv - 1] = B;
      vals = asFloat(vals);
      note = `# ${Cv} samples → ${Math.max(0, end.checked ? Cv - 1 : Cv)} equal gaps of ${pyNum(step, false)}` + (end.checked ? '' : '; the stop value is left out');
    } else {
      if (Cv === 0) { out.innerHTML = head + '<span class="err">ZeroDivisionError</span>: division by zero'; line.innerHTML = ''; return; }
      const len = Math.max(0, Math.ceil((B - A) / Cv));
      if (len > 60) { out.innerHTML = head + `<span class="k">(${len} values: the widget shows up to 60)</span>`; line.innerHTML = ''; return; }
      const allInt = [a.value, b.value, c.value].every(v => /^-?\d+$/.test(v.trim()));
      for (let i = 0; i < len; i++) vals.push(A + i * Cv);
      if (!allInt) vals = asFloat(vals);
      note = `# ${len} values; start included, stop normally excluded`;
      if (!allInt && len && Math.abs(vals[len - 1] - B) < Math.abs(Cv) * 1e-9) note += `\n# careful: floating-point rounding made the stop value ${b.value} appear!`;
    }
    const flat = vals.filter(v => v !== 0).map(Math.abs);
    const sci = flat.length && (Math.max(...flat) >= 1e8 || Math.min(...flat) < 1e-4 || Math.max(...flat) / Math.min(...flat) > 1e3);
    const printed = vals.length === 0 ? '[]' : sci ? '[' + vals.map(v => v.toExponential(8)).join(' ') + ']' : npFmt(vals);
    out.innerHTML = head + `<b>${esc(printed)}</b>\n<span class="k">${esc(note)}</span>` + (sci ? '\n<span class="k"># NumPy switches to scientific notation for this range; exact layout may differ</span>' : '');
    // number line
    const lo = Math.min(A, B, ...vals), hi = Math.max(A, B, ...vals);
    const span = hi - lo || 1, X = v => 20 + (v - lo) / span * 560;
    let svg = `<path class="line" d="M20 40 H 580"/>`;
    svg += `<text x="${X(A)}" y="66" font-size="11" text-anchor="middle" class="muted">start ${a.value}</text>`;
    svg += `<path class="line-muted" d="M${X(B)} 22 V 58"/><text x="${X(B)}" y="16" font-size="11" text-anchor="middle" class="muted">stop ${b.value}</text>`;
    vals.forEach(v => { svg += `<circle cx="${X(v)}" cy="40" r="${vals.length > 30 ? 3 : 5}" class="fill-acc"/>`; });
    line.innerHTML = svg;
  }
  [a, b, c].forEach(el => el.addEventListener('input', run));
  fn.addEventListener('change', sync); end.addEventListener('change', run);
  sync();
})();

/* ---------- * versus @ ---------- */
(() => {
  const mats = document.getElementById('mm-mats');
  if (!mats) return;
  const out = document.getElementById('mm-out');
  const X = [[2, 4, 5], [3, 1, 6]], Yel = [[1, 0, 2], [4, 3, 5]], B = [[1, 4], [0, 3], [2, 5]];
  const grid = (M, name, cls = '') => `<span class="lbl">${name}</span><span class="mgrid ${cls}" data-name="${name}" style="grid-template-columns:repeat(${M[0].length}, auto)">` +
    M.map((r, i) => r.map((v, j) => `<span data-i="${i}" data-j="${j}" class="${cls ? 'res' : ''}">${v}</span>`).join('')).join('') + '</span>';
  function render() {
    const mode = document.querySelector('input[name="mm-op"]:checked').value;
    const L = X, R = mode === 'mul' ? Yel : B;
    const C = mode === 'mul' ? L.map((r, i) => r.map((v, j) => v * R[i][j])) : L.map((r, i) => R[0].map((_, j) => r.reduce((s, v, k) => s + v * R[k][j], 0)));
    const ln = mode === 'mul' ? 'x' : 'A', rn = mode === 'mul' ? 'y' : 'B';
    mats.innerHTML = grid(L, ln) + `<span>${mode === 'mul' ? '*' : '@'}</span>` + grid(R, rn) + '<span>=</span>' + grid(C, mode === 'mul' ? 'x * y' : 'A @ B', 'clickable');
    out.innerHTML = `<span class="k">&gt;&gt;&gt;</span> print(${mode === 'mul' ? 'x * y' : 'A @ B'})\n<b>${npFmt(C)}</b>\n<span class="k"># shape (${C.length}, ${C[0].length}): click a number in the result</span>`;
    mats.querySelectorAll('.mgrid.clickable span').forEach(cell => cell.addEventListener('click', () => {
      const i = +cell.dataset.i, j = +cell.dataset.j;
      mats.querySelectorAll('.mgrid span').forEach(s => s.classList.remove('sel', 'soft'));
      cell.classList.add('sel');
      const Lg = mats.querySelector(`.mgrid[data-name="${ln}"]`), Rg = mats.querySelector(`.mgrid[data-name="${rn}"]`);
      let expl;
      if (mode === 'mul') {
        Lg.querySelector(`[data-i="${i}"][data-j="${j}"]`).classList.add('soft');
        Rg.querySelector(`[data-i="${i}"][data-j="${j}"]`).classList.add('soft');
        expl = `x[${i}, ${j}] * y[${i}, ${j}] = ${L[i][j]} × ${R[i][j]} = ${C[i][j]}\n# same position in both arrays`;
      } else {
        Lg.querySelectorAll(`[data-i="${i}"]`).forEach(s => s.classList.add('soft'));
        Rg.querySelectorAll(`[data-j="${j}"]`).forEach(s => s.classList.add('soft'));
        expl = `row ${i} of A · column ${j} of B = ` + L[i].map((v, k) => `${v}×${R[k][j]}`).join(' + ') + ` = ${C[i][j]}\n# multiply pairs along the row and down the column, then add`;
      }
      out.innerHTML = `<span class="k">&gt;&gt;&gt;</span> print(${mode === 'mul' ? 'x * y' : 'A @ B'})\n<b>${npFmt(C)}</b>\n<span class="k">${esc(expl)}</span>`;
    }));
  }
  document.querySelectorAll('input[name="mm-op"]').forEach(r => r.addEventListener('change', render));
  render();
})();

/* ---------- axis explorer ---------- */
(() => {
  const view = document.getElementById('ax-view');
  if (!view) return;
  const out = document.getElementById('ax-out'), fnSel = document.getElementById('ax-fn');
  const D = [[1, 2, 3], [4, 5, 6]];
  const F = { mean: a => a.reduce((s, v) => s + v, 0) / a.length, sum: a => a.reduce((s, v) => s + v, 0), min: a => Math.min(...a), max: a => Math.max(...a) };
  function run() {
    const ax = document.querySelector('input[name="ax-ax"]:checked').value, fn = fnSel.value, f = F[fn];
    const fl = fn === 'mean';
    let res, txt;
    const cell = (v, extra = '') => `<span style="border:1.5px solid var(--ink);min-width:2.8rem;padding:.35rem .3rem;text-align:center;${extra}">${v}</span>`;
    const resCell = v => cell(v, 'border-color:var(--accent);background:var(--accent-soft);color:var(--accent);font-weight:600');
    let html = '<div style="display:grid;grid-template-columns:repeat(4, auto);gap:4px;font-family:var(--mono);font-size:.9rem;align-items:center;justify-content:start">';
    if (ax === 'none') {
      res = f(D.flat()); txt = fl ? pyNum(res, false) : String(res);
      html += D.map(r => r.map(v => cell(v)).join('') + '<span></span>').join('') + '</div>';
      html += `<div style="font-family:var(--mono);margin-top:.5rem">all six values → <b style="color:var(--accent)">${txt}</b></div>`;
    } else if (ax === '0') {
      const r = D[0].map((_, j) => f(D.map(row => row[j]))); res = fl ? asFloat(r) : r; txt = npFmt(res);
      html += D.map(r => r.map(v => cell(v)).join('') + '<span></span>').join('');
      html += D[0].map(() => '<span style="text-align:center;color:var(--accent)">↓</span>').join('') + '<span></span>';
      html += r.map(v => resCell(fl ? npFmt(asFloat([v])).slice(1, -1) : v)).join('') + '<span style="font-size:.75rem;color:var(--muted)">one per column</span></div>';
    } else {
      const r = D.map(row => f(row)); res = fl ? asFloat(r) : r; txt = npFmt(res);
      html += D.map((row, i) => row.map(v => cell(v)).join('') + `<span style="display:flex;gap:.4rem;align-items:center"><span style="color:var(--accent)">→</span>${resCell(fl ? npFmt(asFloat([r[i]])).slice(1, -1) : r[i])}</span>`).join('');
      html += '</div><div style="font-size:.75rem;color:var(--muted);font-family:var(--mono);margin-top:.3rem">one per row</div>';
    }
    view.innerHTML = html;
    const call = ax === 'none' ? `np.${fn}(data)` : `np.${fn}(data, axis=${ax})`;
    out.innerHTML = `<span class="k">&gt;&gt;&gt;</span> print(${call})\n<b>${esc(txt)}</b>` +
      (ax === '0' ? '\n<span class="k"># axis=0 travels down the rows: the result has one value per column</span>' : ax === '1' ? '\n<span class="k"># axis=1 travels along each row: the result has one value per row</span>' : '');
  }
  fnSel.addEventListener('change', run);
  document.querySelectorAll('input[name="ax-ax"]').forEach(r => r.addEventListener('change', run));
  run();
})();

/* ---------- Line style playground ---------- */
(() => {
  const svg = document.getElementById('st-svg');
  if (!svg) return;
  const $ = id => document.getElementById(id);
  const COLORS = { black: '#000000', blue: '#0000ff', red: '#ff0000', green: '#008000', orange: '#ffa500', purple: '#800080' };
  const W = 600, H = 260, pad = { l: 56, r: 14, t: 14, b: 40 };
  const xs = Array.from({ length: 100 }, (_, i) => 2 * Math.PI * i / 99);
  const X = x => pad.l + x / (2 * Math.PI) * (W - pad.l - pad.r);
  const Y = y => pad.t + (1.1 - y) / 2.2 * (H - pad.t - pad.b);
  function dash(ls, lw) {
    if (ls === '--') return `${3.7 * lw} ${1.6 * lw}`;
    if (ls === ':') return `${1 * lw} ${1.65 * lw}`;
    if (ls === '-.') return `${6.4 * lw} ${1.6 * lw} ${1 * lw} ${1.6 * lw}`;
    return 'none';
  }
  function marker(mk, x, y, col) {
    if (mk === 'o') return `<circle cx="${x}" cy="${y}" r="4" fill="${col}"/>`;
    if (mk === 's') return `<rect x="${x - 3.5}" y="${y - 3.5}" width="7" height="7" fill="${col}"/>`;
    if (mk === '^') return `<path d="M${x} ${y - 4.5} l4.5 8 h-9 z" fill="${col}"/>`;
    if (mk === 'x') return `<path d="M${x - 4} ${y - 4} l8 8 M${x + 4} ${y - 4} l-8 8" stroke="${col}" stroke-width="1.6"/>`;
    return '';
  }
  function run() {
    const col = $('st-color').value, ls = $('st-ls').value, lw = Number($('st-lw').value), mk = $('st-mk').value, cos = $('st-cos').checked;
    $('st-lwv').textContent = lw;
    let s = `<rect x="${pad.l}" y="${pad.t}" width="${W - pad.l - pad.r}" height="${H - pad.t - pad.b}" fill="#fff" stroke="#000" stroke-width="0.8"/>`;
    for (let v = 0; v <= 6; v++) s += `<path d="M${X(v)} ${pad.t} V ${H - pad.b}" stroke="#b0b0b0" stroke-width="0.8"/><text x="${X(v)}" y="${H - pad.b + 14}" font-size="10" text-anchor="middle" fill="#000" font-family="sans-serif">${v}</text>`;
    for (let v = -1; v <= 1; v += 0.5) s += `<path d="M${pad.l} ${Y(v)} H ${W - pad.r}" stroke="#b0b0b0" stroke-width="0.8"/><text x="${pad.l - 6}" y="${Y(v) + 3}" font-size="10" text-anchor="end" fill="#000" font-family="sans-serif">${v.toFixed(2)}</text>`;
    s += `<text x="${(W + pad.l) / 2}" y="${H - 6}" font-size="11" text-anchor="middle" fill="#000" font-family="sans-serif">Angle, x [rad]</text>`;
    s += `<text transform="translate(14 ${(H - pad.b + pad.t) / 2}) rotate(-90)" font-size="11" text-anchor="middle" fill="#000" font-family="sans-serif">Function value</text>`;
    const path = f => 'M' + xs.map(x => `${X(x).toFixed(1)} ${Y(f(x)).toFixed(1)}`).join(' L');
    const c = COLORS[col];
    s += `<path d="${path(Math.sin)}" fill="none" stroke="${c}" stroke-width="${lw}" stroke-dasharray="${dash(ls, lw)}"/>`;
    if (mk) xs.forEach((x, i) => { if (i % 10 === 0) s += marker(mk, X(x), Y(Math.sin(x)), c); });
    if (cos) s += `<path d="${path(Math.cos)}" fill="none" stroke="#1f77b4" stroke-width="1.5"/>`;
    // legend
    const lx = W - pad.r - 108, ly = pad.t + 8, lh = cos ? 44 : 26;
    s += `<rect x="${lx}" y="${ly}" width="100" height="${lh}" fill="#fff" stroke="#ccc" rx="3"/>`;
    s += `<path d="M${lx + 8} ${ly + 13} h26" stroke="${c}" stroke-width="${lw}" stroke-dasharray="${dash(ls, lw)}"/>${marker(mk, lx + 21, ly + 13, c)}<text x="${lx + 40}" y="${ly + 17}" font-size="11" fill="#000" font-family="sans-serif">sin(x)</text>`;
    if (cos) s += `<path d="M${lx + 8} ${ly + 31} h26" stroke="#1f77b4" stroke-width="1.5"/><text x="${lx + 40}" y="${ly + 35}" font-size="11" fill="#000" font-family="sans-serif">cos(x)</text>`;
    svg.innerHTML = s;
    const args = [`color="${col}"`, `linestyle="${ls}"`, `linewidth=${lw}`].concat(mk ? [`marker="${mk}"`, 'markevery=10'] : []).concat(['label="sin(x)"']);
    const code = `import numpy as np\nimport matplotlib.pyplot as plt\n\nx = np.linspace(0, 2 * np.pi, 100)\n\nplt.plot(x, np.sin(x), ${args.join(', ')})\n` +
      (cos ? 'plt.plot(x, np.cos(x), label="cos(x)")\n' : '') +
      'plt.xlabel("Angle, x [rad]")\nplt.ylabel("Function value")\nplt.grid(True)\nplt.legend()\nplt.show()';
    $('st-code').textContent = code;
    $('st-code').dataset.code = code;
  }
  ['st-color', 'st-ls', 'st-lw', 'st-mk', 'st-cos'].forEach(id => $(id).addEventListener('input', run));
  $('st-copy').addEventListener('click', async () => {
    const b = $('st-copy');
    try { await navigator.clipboard.writeText($('st-code').dataset.code); b.textContent = 'Copied'; } catch (e) { b.textContent = 'Select the code to copy'; }
    setTimeout(() => { b.textContent = 'Copy this code'; }, 1800);
  });
  run();
})();
