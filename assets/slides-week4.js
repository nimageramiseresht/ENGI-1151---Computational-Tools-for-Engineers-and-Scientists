/* Week 4 slide widgets: functions. Each one mimics what Python prints.
   Loaded after slides.js by week4-slides.html. */
(() => {
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const $ = id => document.getElementById(id);
  const stopKeys = el => el.addEventListener('keydown', e => e.stopPropagation());
  // Python's repr() of a float (enough for these widgets)
  function pyNum(x, isInt) {
    if (isInt) return String(x);
    if (!Number.isFinite(x)) return x > 0 ? 'inf' : '-inf';
    if (Number.isInteger(x) && Math.abs(x) < 1e16) return x.toFixed(1);
    const a = Math.abs(x);
    if (a !== 0 && (a < 1e-4 || a >= 1e16)) {
      let [m, e] = x.toExponential().split('e');
      const sign = e[0] === '-' ? '-' : '+';
      return m + 'e' + sign + e.replace(/^[+-]/, '').padStart(2, '0');
    }
    return String(x);
  }
  function pyVal(s) {
    s = s.trim();
    if (/^[+-]?\d+$/.test(s)) return { int: true, v: parseInt(s, 10) };
    if (/^[+-]?(\d+\.\d*|\.\d+|\d+)(e[+-]?\d+)?$/i.test(s)) return { int: false, v: parseFloat(s) };
    return null;
  }

  /* ---------- 2.1 which parameter gets which argument? ---------- */
  (() => {
    const inp = $('am-in');
    if (!inp) return;
    stopKeys(inp);
    const map = $('am-map'), out = $('am-out'), P = ['mass', 'acceleration'];
    ['10.0, 9.81', '9.81, 10.0', 'acceleration=9.81, mass=10.0', '10.0, acceleration=9.81', '10.0', 'mass=10.0, 9.81', '10.0, 9.81, 2'].forEach(x => {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = x || '(nothing)';
      b.addEventListener('click', () => { inp.value = x; run(); }); $('am-chips').append(b);
    });
    const fail = (kind, msg) => { throw `<span class="err">${kind}</span>: ${esc(msg)}`; };
    function run() {
      const raw = inp.value.trim();
      const head = `<span class="k">&gt;&gt;&gt;</span> calculate_force(${esc(raw)})\n`;
      const got = {}, how = {};
      try {
        const parts = raw === '' ? [] : raw.split(',').map(s => s.trim());
        if (parts.some(p => p === '')) fail('SyntaxError', 'invalid syntax');
        const isKw = p => /^[A-Za-z_]\w*\s*=/.test(p);
        let seenKw = false;
        parts.forEach(p => { if (isKw(p)) seenKw = true; else if (seenKw) fail('SyntaxError', 'positional argument follows keyword argument'); });
        const val = s => {
          const v = pyVal(s);
          if (v) return v;
          if (/^[A-Za-z_]\w*$/.test(s)) fail('NameError', `name '${s}' is not defined`);
          fail('SyntaxError', 'type numbers, such as 10.0 or 9.81');
        };
        const positional = parts.filter(p => !isKw(p));
        if (positional.length > 2) fail('TypeError', `calculate_force() takes 2 positional arguments but ${positional.length} were given`);
        positional.forEach((p, i) => { got[P[i]] = val(p); how[P[i]] = `by position (${i + 1})`; });
        parts.filter(isKw).forEach(p => {
          const [, k, v] = p.match(/^([A-Za-z_]\w*)\s*=\s*(.+)$/);
          if (!P.includes(k)) fail('TypeError', `calculate_force() got an unexpected keyword argument '${k}'`);
          if (k in got) fail('TypeError', `calculate_force() got multiple values for argument '${k}'`);
          got[k] = val(v); how[k] = 'by keyword';
        });
        const missing = P.filter(k => !(k in got));
        if (missing.length === 1) fail('TypeError', `calculate_force() missing 1 required positional argument: '${missing[0]}'`);
        if (missing.length === 2) fail('TypeError', "calculate_force() missing 2 required positional arguments: 'mass' and 'acceleration'");
        const isInt = got.mass.int && got.acceleration.int;
        out.innerHTML = head + `<b>Force: ${pyNum(got.mass.v * got.acceleration.v, isInt)} N</b>`;
      } catch (e) { out.innerHTML = head + e; }
      map.innerHTML = P.map(k => k in got
        ? `<span class="param">${k}</span><span class="val">${pyNum(got[k].v, got[k].int)}</span><span class="how">← ${how[k]}</span>`
        : `<span class="param missing">${k}</span><span class="val none">?</span><span class="how">no value</span>`).join('');
    }
    inp.addEventListener('input', run); run();
  })();

  /* ---------- 6.2 defaults and input checks ---------- */
  (() => {
    const r = $('cy-r');
    if (!r) return;
    const h = $('cy-h'), pass = $('cy-pass'), kw = $('cy-kw'), steps = $('cy-steps'), out = $('cy-out');
    [r, h, pass, kw].forEach(stopKeys);
    function run() {
      h.disabled = !pass.checked;
      const R = Number(r.value), H = pass.checked ? Number(h.value) : 10.0;
      const rs = pyNum(R, false), hs = pyNum(Number(h.value), false);
      $('cy-rv').textContent = rs; $('cy-hv').textContent = hs;
      const args = kw.checked ? [`radius=${rs}`].concat(pass.checked ? [`height=${hs}`] : []) : [rs].concat(pass.checked ? [hs] : []);
      const li = [];
      li.push(['', `radius = ${rs}` + (kw.checked ? '  (keyword)' : '  (1st positional argument)')]);
      li.push([pass.checked ? '' : 'def', `height = ${pyNum(H, false)}` + (pass.checked ? (kw.checked ? '  (keyword)' : '  (2nd positional argument)') : '  (default value: nothing was passed)')]);
      let printed = [], result;
      if (R < 0) {
        li.push(['stop', 'radius < 0 is True → print a message, return None']);
        li.push(['skip', 'the rest of the function never runs']);
        printed.push('The radius must not be negative.'); result = 'None';
      } else if (H < 0) {
        li.push(['', 'radius < 0 is False → carry on']);
        li.push(['stop', 'height < 0 is True → print a message, return None']);
        printed.push('The height must not be negative.'); result = 'None';
      } else {
        li.push(['', 'both checks are False → carry on']);
        const v = Math.PI * R * R * H;
        li.push(['', `volume = π × ${rs}² × ${pyNum(H, false)} → return ${pyNum(v, false)}`]);
        result = pyNum(v, false);
      }
      steps.innerHTML = li.map(([c, t]) => `<li class="${c}">${esc(t)}</li>`).join('');
      out.innerHTML = `<span class="k">&gt;&gt;&gt;</span> volume = calculate_cylinder_volume(${esc(args.join(', '))})\n` +
        printed.map(p => esc(p) + '\n').join('') + `<span class="k">&gt;&gt;&gt;</span> print(volume)\n<b>${result}</b>`;
    }
    [r, h, pass, kw].forEach(el => el.addEventListener('input', run));
    run();
  })();
})();
