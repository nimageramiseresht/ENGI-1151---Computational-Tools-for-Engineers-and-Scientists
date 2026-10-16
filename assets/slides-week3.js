/* Week 3 slide widgets: NumPy and Matplotlib. Each one mimics what Python prints.
   Loaded after slides.js by week3-slides.html. */
(() => {
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const $ = id => document.getElementById(id);
  const head = expr => `<span class="k">&gt;&gt;&gt;</span> ${esc(expr)}\n`;
  const errLine = e => `<span class="err">${esc(e.split(':')[0])}</span>:${esc(e.slice(e.indexOf(':') + 1))}`;

  /* NumPy-style printing of numbers, 1-D and 2-D arrays */
  function npFmt(arr, isFloat) {
    const flat = Array.isArray(arr) ? arr.flat() : [arr];
    if (isFloat === undefined) isFloat = flat.some(v => !Number.isInteger(v));
    const one = v => {
      if (!isFloat) return String(v);
      let s = String(Number(v.toFixed(8)));
      if (s === '-0') s = '0';
      return s.includes('.') ? s : s + '.';
    };
    if (!Array.isArray(arr)) return one(arr).replace(/\.$/, isFloat ? '.0' : '');
    const strs = flat.map(one);
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
  const stopKeys = el => el.addEventListener('keydown', e => e.stopPropagation());

  /* ---------- 4.3 lists versus arrays ---------- */
  (() => {
    const chips = $('lva-chips');
    if (!chips) return;
    const L = $('lva-list'), A = $('lva-arr');
    const OPS = [
      ['* 2', '[1, 2, 3, 1, 2, 3]', '# the list is repeated', '[2 4 6]', '# every element is doubled'],
      ['+ 1', 'TypeError: can only concatenate list (not "int") to list', '', '[2 3 4]', '# 1 is added to every element'],
      ['+ [10, 20, 30]', '[1, 2, 3, 10, 20, 30]', '# the lists are joined end to end', '[11 22 33]', '# element by element'],
      ['** 2', "TypeError: unsupported operand type(s) for ** or pow(): 'list' and 'int'", '', '[1 4 9]', '# every element is squared'],
      ['/ 2', "TypeError: unsupported operand type(s) for /: 'list' and 'int'", '', '[0.5 1.  1.5]', '# / always gives floats'],
    ];
    const show = (el, expr, res, note) => {
      el.innerHTML = head(expr) + (/Error:/.test(res) ? errLine(res) : `<b>${esc(res)}</b>`) + (note ? `\n<span class="k">${esc(note)}</span>` : '');
    };
    function pick(i) {
      const [op, lr, ln, ar, an] = OPS[i];
      show(L, `print(python_list ${op})`, lr, ln);
      show(A, `print(numpy_array ${op})`, ar, an);
      [...chips.children].forEach((c, k) => c.classList.toggle('on', k === i));
    }
    OPS.forEach((o, i) => {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = o[0];
      b.addEventListener('click', () => pick(i)); chips.append(b);
    });
    pick(0);
  })();

  /* ---------- 4.5 2-D indexing explorer ---------- */
  (() => {
    const inp = $('ix-in');
    if (!inp) return;
    stopKeys(inp);
    const M = [[10, 20, 30], [40, 50, 60]], R = 2, C = 3;
    const grid = $('ix-grid'), out = $('ix-out');
    grid.style.gridTemplateColumns = `auto repeat(${C}, auto)`;
    grid.innerHTML = '<span class="hd"></span>' + [...Array(C).keys()].map(j => `<span class="hd">${j}</span>`).join('') +
      M.map((row, i) => `<span class="hd">${i}</span>` + row.map((v, j) => `<span data-i="${i}" data-j="${j}">${v}</span>`).join('')).join('');
    const cells = [...grid.querySelectorAll('span[data-i]')];
    ['0, 1', '1, 2', '0, :', ':, 1', '-1, -1', '0:2, 1:'].forEach(x => {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = x;
      b.addEventListener('click', () => { inp.value = x; run(); }); $('ix-chips').append(b);
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
      const t = inp.value, h = head(`print(matrix[${t.trim()}])`);
      const sel = [];
      try {
        const parts = t.split(',');
        if (parts.length > 2) throw `IndexError: too many indices for array: array is 2-dimensional, but ${parts.length} were indexed`;
        const r = part(parts[0], R, 0);
        const c = parts.length === 2 ? part(parts[1], C, 1) : { int: false, idx: [0, 1, 2] };
        r.idx.forEach(i => c.idx.forEach(j => sel.push(i + ',' + j)));
        let res, note;
        if (r.int && c.int) { res = String(M[r.idx[0]][c.idx[0]]); note = 'one number'; }
        else if (r.int) { res = npFmt(c.idx.map(j => M[r.idx[0]][j])); note = `part of row ${r.idx[0]}`; }
        else if (c.int) { res = npFmt(r.idx.map(i => M[i][c.idx[0]])); note = `part of column ${c.idx[0]}`; }
        else { const sub = r.idx.map(i => c.idx.map(j => M[i][j])); res = sub.length && sub[0].length ? npFmt(sub) : '[]'; note = `shape (${r.idx.length}, ${c.idx.length}): still 2-D`; }
        out.innerHTML = h + `<b>${esc(res)}</b>\n<span class="k"># ${esc(note)}</span>`;
      } catch (e) { out.innerHTML = h + errLine(String(e)); }
      cells.forEach(el => el.classList.toggle('on', sel.includes(el.dataset.i + ',' + el.dataset.j)));
    }
    inp.addEventListener('input', run); run();
  })();

  /* ---------- 5.4 meshgrid: how x and y are discretised ---------- */
  (() => {
    const svg = $('mg-svg');
    if (!svg) return;
    const nxIn = $('mg-nx'), nyIn = $('mg-ny');
    [nxIn, nyIn].forEach(stopKeys);
    const XMAX = 3, YMAX = 2;
    const lin = (a, b, n) => Array.from({ length: n }, (_, i) => n === 1 ? a : a + (b - a) * i / (n - 1));
    const f2 = v => String(Number(v.toFixed(2)));
    let pick = [0, 0];
    // plot area inside the 460 x 330 viewBox
    const P = { l: 60, r: 420, t: 36, b: 268 };
    const sx = v => P.l + v / XMAX * (P.r - P.l), sy = v => P.b - v / YMAX * (P.b - P.t);
    function draw() {
      const nx = +nxIn.value, ny = +nyIn.value;
      $('mg-nxv').textContent = nx; $('mg-nyv').textContent = ny;
      if (pick[0] >= ny || pick[1] >= nx) pick = [0, 0];
      const x = lin(0, XMAX, nx), y = lin(0, YMAX, ny);
      let s = `<path class="line" d="M${P.l} ${P.b} H ${P.r} M${P.l} ${P.b} V ${P.t}"/>`;
      s += `<text x="${P.r + 22}" y="${P.b + 24}" font-size="18" class="xtick" font-weight="700">x</text><text x="${P.l - 8}" y="${P.t - 14}" font-size="18" text-anchor="end" class="ytick" font-weight="700">y</text>`;
      x.forEach(v => { s += `<path class="xline" d="M${sx(v)} ${P.b} V ${P.t}"/><text x="${sx(v)}" y="${P.b + 22}" font-size="16" text-anchor="middle" class="xtick">${f2(v)}</text>`; });
      y.forEach((v, i) => {
        s += `<path class="yline" d="M${P.l} ${sy(v)} H ${P.r}"/><text x="${P.l - 8}" y="${sy(v) + 5}" font-size="16" text-anchor="end" class="ytick">${f2(v)}</text>`;
        s += `<text x="${P.r + 10}" y="${sy(v) + 5}" font-size="13" class="muted">row ${i}</text>`;
      });
      y.forEach((yv, i) => x.forEach((xv, j) => {
        const on = pick[0] === i && pick[1] === j;
        s += `<circle class="pt${on ? ' on' : ''}" data-i="${i}" data-j="${j}" cx="${sx(xv)}" cy="${sy(yv)}" r="${on ? 9 : 6}"/>`;
      }));
      s += `<text x="${(P.l + P.r) / 2}" y="${P.b + 50}" font-size="15" text-anchor="middle" class="muted">${nx} × ${ny} = ${nx * ny} grid points · click one</text>`;
      svg.innerHTML = s;
      svg.querySelectorAll('.pt').forEach(c => c.addEventListener('click', () => { pick = [+c.dataset.i, +c.dataset.j]; draw(); }));
      // the two coordinate arrays
      const mat = (el, val) => {
        el.style.gridTemplateColumns = `repeat(${nx}, auto)`;
        el.innerHTML = y.map((yv, i) => x.map((xv, j) => `<span class="${pick[0] === i && pick[1] === j ? 'on' : ''}">${f2(val(xv, yv))}</span>`).join('')).join('');
      };
      mat($('mg-X'), xv => xv); mat($('mg-Y'), (xv, yv) => yv);
      const [i, j] = pick;
      $('mg-pick').innerHTML = `point (x, y) = (<span class="mx">${f2(x[j])}</span>, <span class="my">${f2(y[i])}</span>) is <span class="mx">X[${i}, ${j}]</span>, <span class="my">Y[${i}, ${j}]</span>`;
      $('mg-code').innerHTML = `x = np.linspace(0, ${XMAX}, <b class="mx">${nx}</b>)\ny = np.linspace(0, ${YMAX}, <b class="my">${ny}</b>)\nX, Y = np.meshgrid(x, y)  <span class="k"># shape (${ny}, ${nx})</span>\nZ = X**2 + Y**2           <span class="k"># every point at once</span>`;
    }
    [nxIn, nyIn].forEach(el => el.addEventListener('input', draw));
    draw();
  })();

  /* ---------- 6.2 * versus @ ---------- */
  (() => {
    const mats = $('mm-mats');
    if (!mats) return;
    const out = $('mm-out');
    const A = [[2, 4, 5], [3, 1, 6]], Y = [[1, 0, 2], [4, 3, 5]], B = [[1, 4], [0, 3], [2, 5]];
    const grid = (M, name, click) => `<span class="lbl">${esc(name)}</span><span class="ngrid${click ? ' click' : ''}" data-name="${esc(name)}" style="grid-template-columns:repeat(${M[0].length}, auto)">` +
      M.map((r, i) => r.map((v, j) => `<span data-i="${i}" data-j="${j}">${v}</span>`).join('')).join('') + '</span>';
    function render() {
      const mode = document.querySelector('input[name="mm-op"]:checked').value, mul = mode === 'mul';
      const L = A, R = mul ? Y : B;
      const C = mul ? L.map((r, i) => r.map((v, j) => v * R[i][j])) : L.map((r, i) => R[0].map((_, j) => r.reduce((s, v, k) => s + v * R[k][j], 0)));
      const ln = 'A', rn = mul ? 'Y' : 'B', cn = mul ? 'A * Y' : 'A @ B';
      mats.innerHTML = grid(L, ln) + `<b>${mul ? '*' : '@'}</b>` + grid(R, rn) + '<b>=</b>' + grid(C, cn, true);
      const base = head(`print(${cn})`) + `<b>${npFmt(C)}</b>\n`;
      out.innerHTML = base + `<span class="k"># shape (${C.length}, ${C[0].length}) · click a number in the result</span>`;
      mats.querySelectorAll('.ngrid.click span').forEach(cell => cell.addEventListener('click', () => {
        const i = +cell.dataset.i, j = +cell.dataset.j;
        mats.querySelectorAll('.ngrid span').forEach(s => s.classList.remove('on', 'soft'));
        cell.classList.add('on');
        const Lg = mats.querySelector(`.ngrid[data-name="${ln}"]`), Rg = mats.querySelector(`.ngrid[data-name="${rn}"]`);
        let ex;
        if (mul) {
          Lg.querySelector(`[data-i="${i}"][data-j="${j}"]`).classList.add('soft');
          Rg.querySelector(`[data-i="${i}"][data-j="${j}"]`).classList.add('soft');
          ex = `A[${i}, ${j}] × Y[${i}, ${j}] = ${L[i][j]} × ${R[i][j]} = ${C[i][j]}\n# same position in both arrays`;
        } else {
          Lg.querySelectorAll(`[data-i="${i}"]`).forEach(s => s.classList.add('soft'));
          Rg.querySelectorAll(`[data-j="${j}"]`).forEach(s => s.classList.add('soft'));
          ex = `row ${i} of A · column ${j} of B = ` + L[i].map((v, k) => `${v}×${R[k][j]}`).join(' + ') + ` = ${C[i][j]}`;
        }
        out.innerHTML = base + `<span class="k">${esc(ex)}</span>`;
      }));
    }
    document.querySelectorAll('input[name="mm-op"]').forEach(r => { r.addEventListener('change', render); stopKeys(r); });
    render();
  })();

  /* ---------- 6.3 which way does axis go? ---------- */
  (() => {
    const view = $('ax-view');
    if (!view) return;
    const out = $('ax-out'), fnSel = $('ax-fn');
    stopKeys(fnSel);
    const D = [[1, 2, 3], [4, 5, 6]];
    const F = { mean: a => a.reduce((s, v) => s + v, 0) / a.length, sum: a => a.reduce((s, v) => s + v, 0), min: a => Math.min(...a), max: a => Math.max(...a) };
    function run() {
      const ax = document.querySelector('input[name="ax-ax"]:checked').value, fn = fnSel.value, f = F[fn], fl = fn === 'mean';
      const show = v => fl ? npFmt(v, true) : String(v);
      const cell = (v, cls = '') => `<span class="${cls}">${v}</span>`;
      let html, res;
      if (ax === 'none') {
        res = f(D.flat());
        html = `<span class="ngrid" style="grid-template-columns:repeat(3, auto)">${D.flat().map(v => cell(v, 'soft')).join('')}</span>` +
          `<span class="mmrow" style="margin-top:10px">all six values → <span class="ngrid">${cell(show(res), 'on')}</span></span>`;
        res = show(res);
      } else if (ax === '0') {
        const r = D[0].map((_, j) => f(D.map(row => row[j])));
        html = `<span class="ngrid" style="grid-template-columns:repeat(3, auto)">${D.flat().map(v => cell(v)).join('')}` +
          D[0].map(() => '<span class="hd" style="font-size:22px;color:var(--accent)">↓</span>').join('') + r.map(v => cell(show(v), 'on')).join('') + '</span>' +
          '<p class="small" style="margin-top:6px">down the rows → one value per column</p>';
        res = npFmt(r, fl);
      } else {
        const r = D.map(row => f(row));
        html = `<span class="ngrid" style="grid-template-columns:repeat(5, auto)">` +
          D.map((row, i) => row.map(v => cell(v)).join('') + '<span class="hd" style="font-size:22px;color:var(--accent)">→</span>' + cell(show(r[i]), 'on')).join('') + '</span>' +
          '<p class="small" style="margin-top:6px">along each row → one value per row</p>';
        res = npFmt(r, fl);
      }
      view.innerHTML = html;
      out.innerHTML = head(`print(np.${fn}(data${ax === 'none' ? '' : ', axis=' + ax}))`) + `<b>${esc(res)}</b>`;
    }
    fnSel.addEventListener('change', run);
    document.querySelectorAll('input[name="ax-ax"]').forEach(r => { r.addEventListener('change', run); stopKeys(r); });
    run();
  })();
})();
