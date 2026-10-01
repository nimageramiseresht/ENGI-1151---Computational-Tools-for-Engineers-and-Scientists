/* Week 1 widgets. Each one mimics what Python would print. */

/* ---------- Hero: notebook typing calculations ---------- */
(() => {
  const stack = document.getElementById('nb-stack');
  if (!stack) return;
  const opOut = document.getElementById('nb-op');
  const pauseBtn = document.getElementById('nb-pause');
  const DEMO = [
    ['3 + 5', '8', 'addition'],
    ['7 / 2', '3.5', 'division'],
    ['7 // 2', '3', 'floor division'],
    ['7 % 2', '1', 'remainder (modulo)'],
    ['2 ** 3', '8', 'exponentiation'],
    ['(5 + 2) * 5', '35', 'parentheses first'],
    ['span = 24\nspan * 2', '48', 'a variable'],
    ['type(2 + 3j)', "complex", 'type()'],
    ['[10, 20, 30, 40][-1]', '40', 'negative index'],
    ['0.1 + 0.2', '0.30000000000000004', 'floating point'],
  ];
  DEMO[7][1] = "<class 'complex'>";
  let i = 0, n = 1, paused = false, timer = null;

  function addCell(src, res, label, instant) {
    const cell = document.createElement('div');
    cell.className = 'nb-cell';
    cell.innerHTML = `<span class="p">In [${n}]:</span><span class="src"></span><span class="o"></span><span class="res"></span>`;
    stack.append(cell);
    [...stack.children].slice(0, -1).forEach(c => c.classList.add('old'));
    while (stack.children.length > 4) stack.firstElementChild.remove();
    const srcEl = cell.querySelector('.src');
    opOut.textContent = label;
    const finish = () => {
      srcEl.classList.remove('typing');
      cell.querySelector('.o').textContent = `Out[${n}]:`;
      cell.querySelector('.res').textContent = res;
      n++;
    };
    if (instant) { srcEl.textContent = src; finish(); return Promise.resolve(); }
    srcEl.classList.add('typing');
    return new Promise(resolve => {
      let k = 0;
      const t = setInterval(() => {
        if (paused) return;
        srcEl.textContent = src.slice(0, ++k);
        if (k >= src.length) { clearInterval(t); setTimeout(() => { finish(); resolve(); }, 380); }
      }, 75);
    });
  }
  async function loop() {
    while (true) {
      if (paused) { await new Promise(r => setTimeout(r, 200)); continue; }
      const [s, r, l] = DEMO[i % DEMO.length];
      await addCell(s, r, l, false);
      i++;
      await new Promise(r => setTimeout(r, 1400));
    }
  }
  if (reduceMotion) {
    DEMO.slice(0, 4).forEach(([s, r, l]) => addCell(s, r, l, true));
    pauseBtn.hidden = true;
  } else {
    loop();
  }
  pauseBtn.addEventListener('click', () => {
    paused = !paused;
    pauseBtn.textContent = paused ? 'Play' : 'Pause';
  });
})();

/* ---------- Parsing helpers: a tiny subset of Python literals ---------- */
function parseNumber(s) {
  s = s.trim();
  if (/^[+-]?\d+$/.test(s)) return { kind: 'int', v: BigInt(s) };
  if (/^[+-]?(\d+\.\d*|\.\d+|\d+)(e[+-]?\d+)?$/i.test(s)) return { kind: 'float', v: parseFloat(s) };
  return null;
}
function parseLiteral(s) {
  s = s.trim();
  const m = s.match(/^(['"])(.*)\1$/);
  if (m) return { kind: 'str', v: m[2] };
  if (s === 'True' || s === 'False') return { kind: 'bool', v: s === 'True' };
  const n = parseNumber(s);
  if (n) return n;
  return null;
}
function pyRepr(x) {
  if (x.kind === 'int') return x.v.toString();
  if (x.kind === 'float') return pyNum(x.v, false);
  if (x.kind === 'bool') return x.v ? 'True' : 'False';
  if (x.kind === 'str') return "'" + x.v.replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
  return '?';
}
function typeLine(kind) { return `<span class="k">type:</span> &lt;class '${kind}'&gt;`; }

/* ---------- Operator explorer ---------- */
(() => {
  const a = document.getElementById('op-a'), b = document.getElementById('op-b');
  const op = document.getElementById('op-op'), out = document.getElementById('op-out');
  if (!a) return;
  function pyMod(x, y) { let r = x % y; if (r !== 0 && (r < 0) !== (y < 0)) r += y; return r; }
  function bigFloorDiv(x, y) { let q = x / y; if ((x % y !== 0n) && ((x < 0n) !== (y < 0n))) q -= 1n; return q; }
  function bigMod(x, y) { let r = x % y; if (r !== 0n && ((r < 0n) !== (y < 0n))) r += y; return r; }

  function compute() {
    const A = parseNumber(a.value), B = parseNumber(b.value), o = op.value;
    const expr = `${a.value.trim()} ${o} ${b.value.trim()}`;
    if (!A || !B) {
      out.innerHTML = `<span class="k">&gt;&gt;&gt;</span> ${esc(expr)}\n<span class="err">Type a number in each box</span> (for example 7, -3 or 2.5).`;
      return;
    }
    const ints = A.kind === 'int' && B.kind === 'int';
    let res, kind, extra = '';
    try {
      if (ints) {
        const x = A.v, y = B.v;
        if ((o === '/' || o === '//' || o === '%') && y === 0n) throw 'zero';
        if (o === '+') { res = x + y; kind = 'int'; }
        if (o === '-') { res = x - y; kind = 'int'; }
        if (o === '*') { res = x * y; kind = 'int'; }
        if (o === '/') { res = Number(x) / Number(y); kind = 'float'; }
        if (o === '//') { res = bigFloorDiv(x, y); kind = 'int'; }
        if (o === '%') { res = bigMod(x, y); kind = 'int'; }
        if (o === '**') {
          if (y >= 0n) {
            if (y > 2000n) throw 'big';
            res = x ** y; kind = 'int';
          } else { res = Math.pow(Number(x), Number(y)); kind = 'float'; }
        }
        if (o === '//' || o === '%') {
          const q = bigFloorDiv(x, y), r = bigMod(x, y);
          extra = `\n<span class="k"># check: ${x} == ${y} * ${q} + ${r}</span>`;
        }
      } else {
        const x = Number(A.v), y = Number(B.v);
        if ((o === '/' || o === '//' || o === '%') && y === 0) throw 'zero';
        kind = 'float';
        if (o === '+') res = x + y;
        if (o === '-') res = x - y;
        if (o === '*') res = x * y;
        if (o === '/') res = x / y;
        if (o === '//') res = Math.floor(x / y);
        if (o === '%') res = pyMod(x, y);
        if (o === '**') {
          if (x < 0 && !Number.isInteger(y)) throw 'complex';
          res = Math.pow(x, y);
        }
        if (o === '//' && A.kind === 'int' !== (B.kind === 'int')) extra = '\n<span class="k"># one float in, so a float comes out</span>';
      }
    } catch (e) {
      if (e === 'zero') out.innerHTML = `<span class="k">&gt;&gt;&gt;</span> ${esc(expr)}\n<span class="err">ZeroDivisionError</span>  <span class="k"># Python cannot divide by zero</span>`;
      else if (e === 'complex') out.innerHTML = `<span class="k">&gt;&gt;&gt;</span> ${esc(expr)}\n<span class="warn">a complex number</span>  <span class="k"># a negative number to a fractional power gives a complex result</span>`;
      else out.innerHTML = `<span class="k">&gt;&gt;&gt;</span> ${esc(expr)}\n<span class="warn">a very large integer</span>  <span class="k"># Python can do this, but the widget stops here</span>`;
      return;
    }
    const shown = kind === 'int' ? res.toString() : pyNum(res, false);
    out.innerHTML = `<span class="k">&gt;&gt;&gt;</span> ${esc(expr)}\n<b>${esc(shown)}</b>\n${typeLine(kind)}${extra}`;
  }
  [a, b, op].forEach(el => el.addEventListener('input', compute));
  compute();
})();

/* ---------- Variable name checker ---------- */
(() => {
  const inp = document.getElementById('name-in'), out = document.getElementById('name-out');
  if (!inp) return;
  const KEYWORDS = 'False None True and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield'.split(' ');
  const BUILTINS = 'list int float str bool dict set tuple complex sum max min len print type input range abs round sorted open id map filter zip enumerate any all next iter format pow divmod'.split(' ');
  const EXAMPLES = ['pipe_radius', '2nd_value', 'surface area', 'max-stress', 'class', 'list', 'Temperature', 'fluidDensity', 'r', 'load@node'];
  const chips = document.getElementById('name-chips');
  EXAMPLES.forEach(x => {
    const bt = document.createElement('button'); bt.type = 'button'; bt.textContent = x;
    bt.addEventListener('click', () => { inp.value = x; check(); });
    chips.append(bt);
  });
  function check() {
    const s = inp.value;
    const n = s.trim() === s ? s : s;
    let msg;
    if (!n) msg = '<span class="k">Type a name to check it.</span>';
    else if (/\s/.test(n)) msg = `<span class="err">Invalid.</span> Names cannot contain spaces. Try <code>${esc(n.trim().replace(/\s+/g, '_'))}</code>.\n<span class="k">Python says: SyntaxError</span>`;
    else if (/^\d/.test(n)) msg = `<span class="err">Invalid.</span> Names cannot begin with a number.\n<span class="k">Python says: SyntaxError</span>`;
    else if (/[^A-Za-z0-9_]/.test(n)) {
      const bad = [...new Set(n.replace(/[A-Za-z0-9_]/g, ''))].map(c => `'${esc(c)}'`).join(', ');
      msg = `<span class="err">Invalid.</span> Only letters, numbers and underscores are allowed; found ${bad}.` +
        (n.includes('-') ? '\n<span class="k">Python would read - as a minus sign.</span>' : '') + '\n<span class="k">Python says: SyntaxError</span>';
    }
    else if (KEYWORDS.includes(n)) msg = `<span class="err">Invalid.</span> <code>${n}</code> is a Python keyword, reserved for the language itself.\n<span class="k">Python says: SyntaxError</span>`;
    else if (BUILTINS.includes(n)) msg = `<span class="warn">Valid, but avoid it.</span> <code>${n}</code> is the name of a built-in function or type. Using it as a variable hides the original, so <code>${n}(…)</code> stops working.`;
    else if (/[a-z][A-Z]/.test(n)) msg = `<span class="ok">Valid.</span> Python style prefers snake_case, though: <code>${esc(n.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase())}</code>.`;
    else if (/^[A-Z]/.test(n) && n !== n.toUpperCase()) msg = `<span class="ok">Valid.</span> Remember names are case-sensitive: <code>${esc(n)}</code> and <code>${esc(n.toLowerCase())}</code> are different variables. Lowercase is the usual style.`;
    else if (n.length === 1) msg = `<span class="ok">Valid.</span> Fine when the meaning is obvious (like <code>x</code> or <code>t</code> in an equation); a descriptive name is clearer in a long program.`;
    else msg = `<span class="ok">Valid</span> and descriptive.`;
    out.innerHTML = msg;
  }
  inp.addEventListener('input', check);
  check();
})();

/* ---------- Type conversion playground ---------- */
(() => {
  const fn = document.getElementById('conv-fn'), inp = document.getElementById('conv-in'), out = document.getElementById('conv-out');
  if (!fn) return;
  const EX = [['int', '4.8'], ['int', '-4.9'], ['float', '"12.5"'], ['str', '250'], ['float', '"Hello World"'], ['int', '"12.5"'], ['int', '"42"'], ['bool', '0'], ['bool', '"0"'], ['bool', '""'], ['float', '3']];
  const chips = document.getElementById('conv-chips');
  EX.forEach(([f, v]) => {
    const bt = document.createElement('button'); bt.type = 'button'; bt.textContent = `${f}(${v})`;
    bt.addEventListener('click', () => { fn.value = f; inp.value = v; run(); });
    chips.append(bt);
  });
  function run() {
    const f = fn.value, raw = inp.value;
    const x = parseLiteral(raw);
    const head = `<span class="k">&gt;&gt;&gt;</span> ${esc(f)}(${esc(raw.trim())})\n`;
    if (!x) {
      const word = raw.trim();
      out.innerHTML = head + (word && /^[A-Za-z_]\w*$/.test(word)
        ? `<span class="err">NameError</span>: name '${esc(word)}' is not defined\n<span class="k"># text needs quotation marks: "${esc(word)}"</span>`
        : `<span class="err">SyntaxError</span>  <span class="k"># type a number, True/False, or text in quotes</span>`);
      return;
    }
    let r, note = '';
    try {
      if (f === 'int') {
        if (x.kind === 'int') r = x;
        else if (x.kind === 'float') { r = { kind: 'int', v: BigInt(Math.trunc(x.v)) }; note = x.v !== Math.trunc(x.v) ? 'the fractional part is cut off (towards zero), not rounded' : ''; }
        else if (x.kind === 'bool') r = { kind: 'int', v: x.v ? 1n : 0n };
        else if (/^\s*[+-]?\d+\s*$/.test(x.v)) r = { kind: 'int', v: BigInt(x.v.trim()) };
        else throw `<span class="err">ValueError</span>: invalid literal for int() with base 10: ${esc(pyRepr(x))}` +
          (parseNumber(x.v) ? '\n<span class="k"># int() of a string needs a whole number; try int(float("' + esc(x.v) + '"))</span>' : '');
      }
      if (f === 'float') {
        if (x.kind === 'int') r = { kind: 'float', v: Number(x.v) };
        else if (x.kind === 'float') r = x;
        else if (x.kind === 'bool') r = { kind: 'float', v: x.v ? 1 : 0 };
        else {
          const t = x.v.trim(), p = parseNumber(t);
          if (p) r = { kind: 'float', v: Number(p.v) };
          else if (/^[+-]?(inf|infinity|nan)$/i.test(t)) r = { kind: 'float', v: /nan/i.test(t) ? NaN : (t.startsWith('-') ? -Infinity : Infinity) };
          else throw `<span class="err">ValueError</span>: could not convert string to float: ${esc(pyRepr(x))}`;
        }
      }
      if (f === 'str') { r = { kind: 'str', v: x.kind === 'str' ? x.v : pyRepr(x) }; note = 'the quotes show it is now text'; }
      if (f === 'bool') {
        const v = x.kind === 'str' ? x.v.length > 0 : x.kind === 'bool' ? x.v : (x.kind === 'int' ? x.v !== 0n : x.v !== 0);
        r = { kind: 'bool', v };
        if (x.kind === 'str') note = x.v.length ? 'any non-empty string is True, even "0" or "False"' : 'only the empty string is False';
        else if (x.kind !== 'bool') note = 'zero is False; every other number is True';
      }
    } catch (e) { out.innerHTML = head + e; return; }
    out.innerHTML = head + `<b>${esc(pyRepr(r))}</b>${note ? `  <span class="k"># ${esc(note)}</span>` : ''}\n` + typeLine(r.kind);
  }
  fn.addEventListener('change', run); inp.addEventListener('input', run);
  run();
})();

/* ---------- List index and slice explorer ---------- */
(() => {
  const inp = document.getElementById('list-in'), cellsEl = document.getElementById('list-cells'), out = document.getElementById('list-out');
  if (!inp) return;
  const VALUES = [10, 20, 30, 40, 50, 60, 123];
  const L = VALUES.length;
  cellsEl.innerHTML = VALUES.map((v, i) => `<div class="cell"><span class="ix">${i}</span><span class="val">${v}</span><span class="ix neg">${i - L}</span></div>`).join('');
  const cells = [...cellsEl.children];
  const chips = document.getElementById('list-chips');
  ['0', '-1', '-2', '1:4', ':3', '2:', '::2', '-3:', '::-1', '7'].forEach(x => {
    const bt = document.createElement('button'); bt.type = 'button'; bt.textContent = `values[${x}]`;
    bt.addEventListener('click', () => { inp.value = x; run(); });
    chips.append(bt);
  });
  function sliceIndices(start, stop, step) {
    if (step === 0) throw 'ValueError: slice step cannot be zero';
    const lower = step > 0 ? 0 : -1, upper = step > 0 ? L : L - 1;
    const norm = (v, def) => v === null ? def : (v < 0 ? Math.max(v + L, lower) : Math.min(v, upper));
    const s = norm(start, step > 0 ? lower : upper), e = norm(stop, step > 0 ? upper : lower);
    const idx = [];
    for (let i = s; step > 0 ? i < e : i > e; i += step) idx.push(i);
    return idx;
  }
  function run() {
    const t = inp.value.replace(/\s/g, '');
    const head = `<span class="k">&gt;&gt;&gt;</span> values[${esc(t)}]\n`;
    let sel = [];
    const intRe = /^[+-]?\d+$/;
    try {
      if (!t.includes(':')) {
        if (!intRe.test(t)) throw 'TypeError: list indices must be integers or slices';
        const i = parseInt(t, 10);
        if (i >= L || i < -L) throw `IndexError: list index out of range  <span class="k"># valid indices are 0 to ${L - 1}, or -1 to -${L}</span>`;
        const j = i < 0 ? i + L : i;
        sel = [j];
        out.innerHTML = head + `<b>${VALUES[j]}</b>` + (i < 0 ? `  <span class="k"># ${i} counts back from the end: same as values[${j}]</span>` : '');
      } else {
        const parts = t.split(':');
        if (parts.length > 3 || parts.some(p => p !== '' && !intRe.test(p))) throw 'SyntaxError: use start:stop:step with whole numbers';
        const [a, b, c] = [parts[0], parts[1], parts[2]].map(p => p === undefined || p === '' ? null : parseInt(p, 10));
        sel = sliceIndices(a, b, c === null ? 1 : c);
        out.innerHTML = head + `<b>[${sel.map(i => VALUES[i]).join(', ')}]</b>` +
          (sel.length === 0 ? '  <span class="k"># an empty slice is not an error</span>' : `  <span class="k"># indices ${sel.join(', ')}</span>`);
      }
    } catch (e) {
      out.innerHTML = head + `<span class="err">${e.split(':')[0]}</span>:${e.slice(e.indexOf(':') + 1)}`;
    }
    cells.forEach((c, i) => c.classList.toggle('sel', sel.includes(i)));
  }
  inp.addEventListener('input', run);
  run();
})();

/* ---------- Dictionary lookup ---------- */
(() => {
  const view = document.getElementById('dict-view');
  if (!view) return;
  const how = document.getElementById('dict-how'), keyIn = document.getElementById('dict-key'), out = document.getElementById('dict-out');
  const BASE = () => ({ Name: "['David', 'Thomas', 'Ellen']", Age: '[22, 34, 12]' });
  let d = BASE();
  function render(hit) {
    view.innerHTML = Object.entries(d).map(([k, v]) => `<span class="key${k === hit ? ' hit' : ''}">'${esc(k)}'</span><span class="val">${esc(v)}</span>`).join('');
  }
  function run() {
    let k = keyIn.value.trim().replace(/^(['"])(.*)\1$/, '$2');
    const shown = `"${k}"`;
    const has = Object.prototype.hasOwnProperty.call(d, k);
    const expr = how.value === 'br' ? `example_dict[${shown}]` : how.value === 'get' ? `example_dict.get(${shown})` : `example_dict.get(${shown}, "Key not found")`;
    let res;
    if (has) res = `<b>${esc(d[k])}</b>`;
    else if (how.value === 'br') {
      const near = Object.keys(d).find(x => x.toLowerCase() === k.toLowerCase());
      res = `<span class="err">KeyError</span>: '${esc(k)}'` + (near ? `  <span class="k"># keys are case-sensitive: did you mean "${near}"?</span>` : '');
    }
    else if (how.value === 'get') res = '<b>None</b>  <span class="k"># no error: .get() returns None for a missing key</span>';
    else res = '<b>Key not found</b>  <span class="k"># the default you supplied</span>';
    out.innerHTML = `<span class="k">&gt;&gt;&gt;</span> print(${esc(expr)})\n${res}`;
    render(has ? k : null);
  }
  document.getElementById('dict-add').addEventListener('click', () => { d.Height = '[1.72, 1.8, 1.65]'; keyIn.value = 'Height'; run(); });
  document.getElementById('dict-reset').addEventListener('click', () => { d = BASE(); keyIn.value = 'Name'; how.value = 'br'; run(); });
  how.addEventListener('change', run); keyIn.addEventListener('input', run);
  run();
})();
