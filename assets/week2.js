/* Week 2 widgets. */
const pyBool = b => `<span class="tv-${b ? 'True' : 'False'}">${b ? 'True' : 'False'}</span>`;
const f1 = x => pyNum(Number(x), false);

/* ---------- Hero: error halving until below the tolerance ---------- */
(() => {
  const canvas = document.getElementById('hero-conv');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const itOut = document.getElementById('conv-it'), errOut = document.getElementById('conv-err');
  const tolSel = document.getElementById('conv-tol'), replay = document.getElementById('conv-replay');
  let bars = [], timer = null, box;
  const pad = { l: 52, r: 12, t: 12, b: 28 };
  const LOGMIN = -5, LOGMAX = 0;      // 1e-5 … 1

  function size() {
    const dpr = window.devicePixelRatio || 1;
    const r = canvas.getBoundingClientRect();
    canvas.width = Math.round(r.width * dpr); canvas.height = Math.round(r.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    box = r;
  }
  function colours() {
    const cs = getComputedStyle(document.documentElement);
    const g = n => cs.getPropertyValue(n).trim();
    return { ink: g('--ink'), accent: g('--accent'), grid: g('--grid'), muted: g('--muted'), good: g('--good') };
  }
  const yOf = v => pad.t + (LOGMAX - Math.log10(v)) / (LOGMAX - LOGMIN) * (box.height - pad.t - pad.b);
  function draw() {
    const c = colours(), w = box.width, h = box.height, tol = Number(tolSel.value);
    ctx.clearRect(0, 0, w, h);
    ctx.font = '11px "IBM Plex Mono", monospace'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    for (let e = LOGMAX; e >= LOGMIN; e--) {
      const y = yOf(10 ** e);
      ctx.strokeStyle = c.grid; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke();
      ctx.fillStyle = c.muted; ctx.fillText(e === 0 ? '1' : '1e' + e, pad.l - 6, y);
    }
    const n = Math.max(17, bars.length);
    const bw = (w - pad.l - pad.r) / n;
    const base = h - pad.b;
    bars.forEach((v, i) => {
      const y = yOf(v);
      ctx.fillStyle = v <= tol ? c.good : c.accent;
      ctx.fillRect(pad.l + i * bw + 2, y, Math.max(1, bw - 4), base - y);
      ctx.fillStyle = c.muted; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      if (n <= 20 || (i + 1) % 2 === 0) ctx.fillText(String(i + 1), pad.l + i * bw + bw / 2, base + 6);
    });
    const ty = yOf(tol);
    ctx.setLineDash([6, 5]); ctx.strokeStyle = c.ink; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(pad.l, ty); ctx.lineTo(w - pad.r, ty); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = c.ink; ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
    ctx.fillText('tolerance ' + tolSel.value, w - pad.r, ty - 3);
  }
  function start() {
    clearInterval(timer);
    const tol = Number(tolSel.value);
    let error = 1.0, it = 0;
    bars = [];
    itOut.textContent = '0'; errOut.textContent = '1.0';
    const stepOnce = () => {
      if (!(error > tol)) { clearInterval(timer); return false; }
      error = error / 2.0; it++;
      bars.push(error);
      itOut.textContent = it; errOut.textContent = pyNum(error, false);
      draw();
      return true;
    };
    if (reduceMotion) { while (stepOnce()); draw(); return; }
    draw();
    timer = setInterval(stepOnce, 420);
  }
  size(); start();
  replay.addEventListener('click', start);
  tolSel.addEventListener('change', start);
  window.addEventListener('resize', () => { size(); draw(); });
  darkQuery.addEventListener('change', draw);
})();

/* ---------- Comparison operators ---------- */
(() => {
  const t = document.getElementById('cmp-t');
  if (!t) return;
  const tv = document.getElementById('cmp-tv'), list = document.getElementById('cmp-list');
  const EXPR = [['>', 30.0], ['==', 35.0], ['<=', 20.0], ['!=', 35.0], ['>=', 30.0], ['<', 20.0]];
  function run() {
    const v = Number(t.value);
    tv.textContent = f1(v);
    list.innerHTML = EXPR.map(([op, c]) => {
      const r = op === '>' ? v > c : op === '==' ? v === c : op === '<=' ? v <= c : op === '!=' ? v !== c : op === '>=' ? v >= c : v < c;
      return `<span>temperature ${esc(op)} ${f1(c)}</span>${pyBool(r)}`;
    }).join('');
  }
  t.addEventListener('input', run); run();
})();

/* ---------- Logical operators ---------- */
(() => {
  const t = document.getElementById('lg-t');
  if (!t) return;
  const p = document.getElementById('lg-p'), tv = document.getElementById('lg-tv'), pv = document.getElementById('lg-pv');
  const out = document.getElementById('lg-out'), tbody = document.querySelector('#lg-table tbody');
  const ROWS = [[true, true], [true, false], [false, true], [false, false]];
  tbody.innerHTML = ROWS.map(([a, b]) => `<tr><td>${pyBool(a)}</td><td>${pyBool(b)}</td><td>${pyBool(a && b)}</td><td>${pyBool(a || b)}</td></tr>`).join('');
  const rows = [...tbody.children];
  function run() {
    const T = Number(t.value), P = Number(p.value);
    tv.textContent = f1(T); pv.textContent = f1(P);
    const A = T < 80.0, B = P < 5.0;
    const safe = A && B, warn = T > 80.0 || P > 5.0;
    out.innerHTML =
      `safe_operation   = temperature &lt; 80.0 and pressure &lt; 5.0   → ${pyBool(safe)}\n` +
      `warning_required = temperature &gt; 80.0 or  pressure &gt; 5.0   → ${pyBool(warn)}\n` +
      `not safe_operation                                   → ${pyBool(!safe)}` +
      (!safe && !warn ? `\n<span class="k"># exactly on a limit (80.0 or 5.0): not safe, but no warning either — check your &lt; and &gt;=!</span>` : '');
    rows.forEach((r, i) => r.classList.toggle('cur', ROWS[i][0] === A && ROWS[i][1] === B));
  }
  t.addEventListener('input', run); p.addEventListener('input', run); run();
})();

/* ---------- if / elif / else flowchart ---------- */
(() => {
  const t = document.getElementById('if-t');
  if (!t) return;
  const tv = document.getElementById('if-tv'), wrong = document.getElementById('if-wrong'), out = document.getElementById('if-out');
  const $ = id => document.getElementById(id);
  const ALL = ['n-start', 'e-s1', 'n-d1', 'e-y1', 'n-y1', 'e-n1', 'n-d2', 'e-y2', 'n-y2', 'e-n2', 'n-el'];
  function run() {
    const T = Number(t.value);
    tv.textContent = f1(T);
    $('t-start').textContent = `temperature = ${f1(T)}`;
    const conds = wrong.checked ? [[25.0, 'It is warm.'], [40.0, 'It is very hot.']] : [[40.0, 'It is very hot.'], [25.0, 'It is warm.']];
    $('t-d1').textContent = `temperature > ${f1(conds[0][0])}`;
    $('t-d2').textContent = `temperature > ${f1(conds[1][0])}`;
    $('t-y1').textContent = `print("${conds[0][1]}")`;
    $('t-y2').textContent = `print("${conds[1][1]}")`;
    let path, msg;
    if (T > conds[0][0]) { path = ['n-start', 'e-s1', 'n-d1', 'e-y1', 'n-y1']; msg = conds[0][1]; }
    else if (T > conds[1][0]) { path = ['n-start', 'e-s1', 'n-d1', 'e-n1', 'n-d2', 'e-y2', 'n-y2']; msg = conds[1][1]; }
    else { path = ['n-start', 'e-s1', 'n-d1', 'e-n1', 'n-d2', 'e-n2', 'n-el']; msg = 'It is cool.'; }
    ALL.forEach(id => {
      const el = $(id), on = path.includes(id);
      el.classList.toggle('dim', !on);
      if (el.tagName === 'path') el.classList.toggle('path-on', on);
      else el.querySelector('rect, polygon').classList.toggle('on', on && id !== 'n-start');
    });
    out.innerHTML = `<span class="k">output:</span> <b>${msg}</b>` +
      (wrong.checked && T > 40 ? `\n<span class="err">Wrong answer!</span> ${f1(T)} °C is very hot, but <code>temperature &gt; 25.0</code> was checked first and was already True.` : '');
  }
  t.addEventListener('input', run); wrong.addEventListener('change', run); run();
})();

/* ---------- Factor of safety ---------- */
(() => {
  const s = document.getElementById('fos-s');
  if (!s) return;
  const a = document.getElementById('fos-a'), out = document.getElementById('fos-out'), fill = document.getElementById('fos-fill');
  function run() {
    const S = Number(s.value), A = Number(a.value);
    document.getElementById('fos-sv').textContent = f1(S);
    document.getElementById('fos-av').textContent = f1(A);
    const fos = S / A, ok = fos >= 2.0;
    fill.style.width = Math.min(100, fos / 5 * 100) + '%';
    fill.style.background = ok ? 'var(--good)' : 'var(--bad)';
    out.innerHTML = `factor_of_safety = ${f1(S)} / ${f1(A)} = <b>${pyNum(fos, false)}</b>\n` +
      `factor_of_safety &gt;= 2.0 → ${pyBool(ok)}\n` +
      `<span class="k">output:</span> <b>${ok ? 'The design satisfies the safety requirement.' : 'The design does not satisfy the safety requirement.'}</b>`;
  }
  s.addEventListener('input', run); a.addEventListener('input', run); run();
})();

/* ---------- range() explorer ---------- */
(() => {
  const A = document.getElementById('rg-a');
  if (!A) return;
  const B = document.getElementById('rg-b'), C = document.getElementById('rg-c');
  const out = document.getElementById('rg-out'), msg = document.getElementById('rg-msg');
  const chips = document.getElementById('rg-chips');
  [['', '5', ''], ['', '4', ''], ['2', '6', ''], ['0', '10', '2'], ['5', '0', '-1'], ['2', '10', '3'], ['10', '0', ''], ['0', '10', '0'], ['0', '2.5', '']].forEach(([a, b, c]) => {
    const bt = document.createElement('button'); bt.type = 'button';
    bt.textContent = `range(${[a, b, c].filter(x => x !== '').join(', ')})`;
    if (a === '' && c === '') bt.textContent = `range(${b})`;
    bt.addEventListener('click', () => { A.value = a; B.value = b; C.value = c; run(); });
    chips.append(bt);
  });
  function run() {
    const raw = [A.value.trim(), B.value.trim(), C.value.trim()];
    const call = raw[0] === '' && raw[2] === '' ? `range(${raw[1]})` : raw[2] === '' ? `range(${raw[0] || 0}, ${raw[1]})` : `range(${raw[0] || 0}, ${raw[1]}, ${raw[2]})`;
    out.innerHTML = '';
    if (raw[1] === '') { msg.innerHTML = '<span class="k">stop is required</span>'; return; }
    const nums = [raw[0] || '0', raw[1], raw[2] || '1'];
    const bad = nums.find(x => !/^-?\d+$/.test(x));
    if (bad !== undefined) { msg.innerHTML = `<span class="k">&gt;&gt;&gt;</span> list(${esc(call)})\n<span class="err">TypeError</span>: 'float' object cannot be interpreted as an integer`; return; }
    const [a, b, c] = nums.map(Number);
    if (c === 0) { msg.innerHTML = `<span class="k">&gt;&gt;&gt;</span> list(${esc(call)})\n<span class="err">ValueError</span>: range() arg 3 must not be zero`; return; }
    const vals = [];
    for (let i = a; c > 0 ? i < b : i > b; i += c) { vals.push(i); if (vals.length > 200) break; }
    vals.slice(0, 60).forEach((v, k) => {
      const ch = document.createElement('span'); ch.className = 'chip'; ch.textContent = v;
      ch.style.animationDelay = reduceMotion ? '0s' : (k * 0.04) + 's';
      out.append(ch);
    });
    msg.innerHTML = `<span class="k">&gt;&gt;&gt;</span> list(${esc(call)})\n[${vals.slice(0, 60).join(', ')}${vals.length > 60 ? ', …' : ''}]\n` +
      `<span class="k"># ${vals.length} value${vals.length === 1 ? '' : 's'}: a for loop over this range runs its body ${vals.length} time${vals.length === 1 ? '' : 's'}</span>` +
      (vals.length === 0 ? `\n<span class="k"># empty: with a ${c > 0 ? 'positive' : 'negative'} step, start must be ${c > 0 ? 'less' : 'greater'} than stop</span>` : '');
  }
  [A, B, C].forEach(x => x.addEventListener('input', run)); run();
})();

/* ---------- Nested loop grid ---------- */
(() => {
  const grid = document.getElementById('grid-loop');
  if (!grid) return;
  const LENGTHS = [1.0, 2.0, 3.0], LOADS = [100.0, 200.0];
  grid.innerHTML = '<span class="h"></span>' + LOADS.map(l => `<span class="h">load = ${f1(l)}</span>`).join('') +
    LENGTHS.map(L => `<span class="h">length = ${f1(L)}</span>` + LOADS.map(() => '<span class="c"></span>').join('')).join('');
  const cells = [...grid.querySelectorAll('.c')];
  const out = document.getElementById('grid-out'), count = document.getElementById('grid-count');
  const play = document.getElementById('grid-play');
  let k = 0, timer = null;
  function render() {
    cells.forEach((c, i) => {
      c.classList.toggle('done', i < k - 1);
      c.classList.toggle('now', i === k - 1);
      c.textContent = i < k ? `pass ${i + 1}` : '';
    });
    const lines = [];
    for (let i = 0; i < k; i++) lines.push(`Length: ${f1(LENGTHS[Math.floor(i / 2)])} Load: ${f1(LOADS[i % 2])}`);
    out.textContent = lines.join('\n') || 'Press Play or Step.';
    count.textContent = `${k} / ${cells.length} passes`;
  }
  function stop() { clearInterval(timer); timer = null; play.textContent = '▶ Play'; }
  document.getElementById('grid-step').addEventListener('click', () => { stop(); if (k < cells.length) k++; render(); });
  document.getElementById('grid-reset').addEventListener('click', () => { stop(); k = 0; render(); });
  play.addEventListener('click', () => {
    if (timer) { stop(); return; }
    if (k >= cells.length) k = 0;
    play.textContent = '❚❚ Pause';
    timer = setInterval(() => { k++; render(); if (k >= cells.length) stop(); }, 650);
  });
  render();
})();

/* ---------- try / except / else / finally simulator ---------- */
(() => {
  const inp = document.getElementById('exc-in');
  if (!inp) return;
  const codeEl = document.getElementById('exc-code'), out = document.getElementById('exc-out');
  const CODE = [
    'try:',
    '    value = float(input("Enter a non-zero value: "))',
    '    reciprocal = 1.0 / value',
    'except ValueError:',
    '    print("The input must be numerical.")',
    'except ZeroDivisionError:',
    '    print("The entered value must not be zero.")',
    'else:',
    '    print("Reciprocal:", reciprocal)',
    'finally:',
    '    print("Input processing has finished.")',
  ];
  codeEl.innerHTML = CODE.map(l => `<div>${esc(l)}</div>`).join('');
  const rows = [...codeEl.children];
  const chips = document.getElementById('exc-chips');
  ['4', '0', 'abc', '-2.5', '1e3', '', '0.0', 'twelve'].forEach(x => {
    const bt = document.createElement('button'); bt.type = 'button'; bt.textContent = x === '' ? '(nothing)' : x;
    bt.addEventListener('click', () => { inp.value = x; run(); });
    chips.append(bt);
  });
  function pyFloat(s) {
    const t = s.trim().replace(/_/g, '');
    if (/^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(t)) return parseFloat(t);
    if (/^[+-]?(inf|infinity)$/i.test(t)) return t.startsWith('-') ? -Infinity : Infinity;
    if (/^[+-]?nan$/i.test(t)) return NaN;
    return null;
  }
  function run() {
    const v = pyFloat(inp.value);
    let ran, boom = null, printed;
    if (v === null) { ran = [0, 3, 4, 9, 10]; boom = 1; printed = ['The input must be numerical.']; }
    else if (v === 0) { ran = [0, 1, 5, 6, 9, 10]; boom = 2; printed = ['The entered value must not be zero.']; }
    else { ran = [0, 1, 2, 7, 8, 9, 10]; printed = ['Reciprocal: ' + pyNum(1 / v, false)]; }
    printed.push('Input processing has finished.');
    rows.forEach((r, i) => {
      r.classList.toggle('boom', i === boom);
      r.classList.toggle('ran', ran.includes(i) && i !== boom);
      r.classList.toggle('skip', !ran.includes(i) && i !== boom);
    });
    const why = v === null ? `float(${JSON.stringify(inp.value)}) raised a ValueError, so the matching except block ran`
      : v === 0 ? '1.0 / 0.0 raised a ZeroDivisionError, so the matching except block ran'
      : 'no exception, so the else block ran';
    out.innerHTML = `<span class="k">Enter a non-zero value:</span> ${esc(inp.value)}\n${printed.map(esc).join('\n')}\n<span class="k"># ${esc(why)}; finally always runs</span>`;
  }
  inp.addEventListener('input', run); run();
})();
