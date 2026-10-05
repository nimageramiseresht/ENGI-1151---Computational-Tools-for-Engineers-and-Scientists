/* Week 4 widgets: functions. Each one mimics what Python would print. */

function pyVal(s) {
  s = s.trim();
  if (/^[+-]?\d+$/.test(s)) return { int: true, v: parseInt(s, 10) };
  if (/^[+-]?(\d+\.\d*|\.\d+|\d+)(e[+-]?\d+)?$/i.test(s)) return { int: false, v: parseFloat(s) };
  return null;
}
const fmt = (x, isInt) => isInt ? String(x) : pyNum(x, false);

/* ---------- Hero: the function machine ---------- */
(() => {
  const svg = document.getElementById('mach-svg');
  if (!svg) return;
  const rIn = document.getElementById('mach-r'), hIn = document.getElementById('mach-h');
  const rOut = document.getElementById('mach-rv'), hOut = document.getElementById('mach-hv');
  const call = document.getElementById('mach-call'), runBtn = document.getElementById('mach-run');
  svg.innerHTML = `
    <g font-size="13">
      <rect class="box-acc" x="10" y="52" width="122" height="34" rx="17"/><text id="m-r" x="71" y="74" text-anchor="middle" class="acc">radius = 2.0</text>
      <rect class="box-acc" x="10" y="146" width="122" height="34" rx="17"/><text id="m-h" x="71" y="168" text-anchor="middle" class="acc">height = 10.0</text>
    </g>
    <path class="line" d="M132 69 C 150 69, 152 100, 170 100"/><path class="line" d="M132 163 C 150 163, 152 140, 170 140"/>
    <rect id="m-box" class="box" x="172" y="34" width="190" height="180" rx="6" style="transition: fill .2s"/>
    <rect class="box-code" x="172" y="34" width="190" height="34" rx="6"/>
    <text x="267" y="56" font-size="11.5" text-anchor="middle" font-weight="600">calculate_cylinder_volume</text>
    <g id="m-gear" style="transform-origin: 267px 128px; transition: transform .9s ease-in-out">
      <circle cx="267" cy="128" r="22" class="line-muted" style="stroke-dasharray:6 5;stroke-width:5"/>
      <circle cx="267" cy="128" r="10" class="fill-acc"/>
    </g>
    <text x="267" y="176" font-size="10.5" text-anchor="middle" class="muted">volume = np.pi *</text>
    <text x="267" y="191" font-size="10.5" text-anchor="middle" class="muted">radius**2 * height</text>
    <path class="line" d="M362 124 H 382"/><path class="fill-ink" d="M390 124 l-9 -5 v10 z"/>
    <rect class="box-code" x="392" y="104" width="122" height="40" rx="4" style="stroke:var(--accent)"/>
    <text x="453" y="120" font-size="10.5" text-anchor="middle" class="muted">return</text>
    <text id="m-out" x="453" y="137" font-size="12.5" text-anchor="middle" font-weight="600">125.66</text>
    <g id="m-cyl"></g>
    <circle id="m-d1" r="5" class="fill-acc" cx="-20" cy="-20"/>
    <circle id="m-d2" r="5" class="fill-acc" cx="-20" cy="-20"/>
    <circle id="m-d3" r="6" class="fill-acc" cx="-20" cy="-20"/>`;
  const $ = id => svg.querySelector('#' + id);
  let raf, turn = 0;
  const bez = (p0, p1, p2, p3, t) => {
    const u = 1 - t;
    return [u*u*u*p0[0] + 3*u*u*t*p1[0] + 3*u*t*t*p2[0] + t*t*t*p3[0], u*u*u*p0[1] + 3*u*u*t*p1[1] + 3*u*t*t*p2[1] + t*t*t*p3[1]];
  };
  function cylinder(r, h) {
    const cx = 453, base = 236, sx = 13, sy = 6.5;            // px per unit
    const rx = r * sx, ry = Math.max(3, r * 3), top = base - h * sy;
    return `<path d="M${cx - rx} ${top} V ${base} A ${rx} ${ry} 0 0 0 ${cx + rx} ${base} V ${top}" class="box-acc" style="stroke-width:1.2"/>
            <ellipse cx="${cx}" cy="${top}" rx="${rx}" ry="${ry}" class="box-acc" style="stroke-width:1.2"/>`;
  }
  function update(animate) {
    const r = Number(rIn.value), h = Number(hIn.value);
    const rs = pyNum(r, false), hs = pyNum(h, false);
    rOut.textContent = rs; hOut.textContent = hs;
    $('m-r').textContent = `radius = ${rs}`; $('m-h').textContent = `height = ${hs}`;
    const vol = Math.PI * r * r * h;
    const volText = pyNum(vol, false);
    $('m-cyl').innerHTML = cylinder(r, h);
    const show = () => {
      $('m-out').textContent = vol.toFixed(2);
      call.innerHTML = `<span style="color:var(--muted)">&gt;&gt;&gt;</span> calculate_cylinder_volume(${rs}, ${hs})<br><b>${volText}</b>`;
    };
    cancelAnimationFrame(raf);
    if (!animate || reduceMotion) { ['m-d1', 'm-d2', 'm-d3'].forEach(d => { $(d).setAttribute('cx', -20); }); show(); return; }
    $('m-out').textContent = '…';
    turn += 360; $('m-gear').style.transform = `rotate(${turn}deg)`;
    const t0 = performance.now();
    const step = now => {
      const t = Math.min(1, (now - t0) / 1300);
      const tin = Math.min(1, t / 0.4), tout = Math.max(0, (t - 0.65) / 0.35);
      const a = bez([132, 69], [150, 69], [152, 100], [215, 112], tin);
      const b = bez([132, 163], [150, 163], [152, 140], [215, 140], tin);
      $('m-d1').setAttribute('cx', tin < 1 ? a[0] : -20); $('m-d1').setAttribute('cy', a[1]);
      $('m-d2').setAttribute('cx', tin < 1 ? b[0] : -20); $('m-d2').setAttribute('cy', b[1]);
      $('m-box').style.fill = t > 0.4 && t < 0.65 ? 'var(--accent-soft)' : '';
      $('m-d3').setAttribute('cx', tout > 0 && tout < 1 ? 320 + tout * 70 : -20); $('m-d3').setAttribute('cy', 124);
      if (t < 1) raf = requestAnimationFrame(step); else show();
    };
    raf = requestAnimationFrame(step);
  }
  rIn.addEventListener('change', () => update(true));
  hIn.addEventListener('change', () => update(true));
  rIn.addEventListener('input', () => update(false));
  hIn.addEventListener('input', () => update(false));
  runBtn.addEventListener('click', () => update(true));
  update(false);
  if (!reduceMotion) setTimeout(() => update(true), 600);
})();

/* ---------- Argument matcher for calculate_force(mass, acceleration) ---------- */
(() => {
  const inp = document.getElementById('am-in');
  if (!inp) return;
  const map = document.getElementById('am-map'), out = document.getElementById('am-out');
  const P = ['mass', 'acceleration'];
  const chips = document.getElementById('am-chips');
  ['10.0, 9.81', '9.81, 10.0', 'mass=10.0, acceleration=9.81', 'acceleration=9.81, mass=10.0', '10.0, acceleration=9.81',
   '10.0', '', '10.0, 9.81, 2', 'mass=10.0, 9.81', '10.0, mass=9.81', 'm=10.0, a=9.81', '10, 2'].forEach(x => {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = `calculate_force(${x})`;
    b.addEventListener('click', () => { inp.value = x; run(); }); chips.append(b);
  });
  const err = (kind, msg) => { throw `<span class="err">${kind}</span>: ${esc(msg)}`; };
  function run() {
    const raw = inp.value.trim();
    const head = `<span class="k">&gt;&gt;&gt;</span> calculate_force(${esc(raw)})\n`;
    const got = {}, how = {};
    try {
      const parts = raw === '' ? [] : raw.split(',').map(s => s.trim());
      if (parts.some(p => p === '')) err('SyntaxError', 'invalid syntax');
      let seenKw = false, pos = 0;
      const kwSeen = new Set();
      parts.forEach(p => {
        const m = p.match(/^([A-Za-z_]\w*)\s*=\s*(.+)$/);
        if (m) { if (kwSeen.has(m[1])) err('SyntaxError', `keyword argument repeated: ${m[1]}`); kwSeen.add(m[1]); seenKw = true; }
        else if (seenKw) err('SyntaxError', 'positional argument follows keyword argument');
      });
      const positional = parts.filter(p => !/^[A-Za-z_]\w*\s*=/.test(p));
      const val = s => {
        const v = pyVal(s);
        if (v) return v;
        if (/^[A-Za-z_]\w*$/.test(s)) err('NameError', `name '${s}' is not defined`);
        err('SyntaxError', 'type numbers, such as 10.0 or 9.81');
      };
      if (positional.length > 2) err('TypeError', `calculate_force() takes 2 positional arguments but ${positional.length} were given`);
      positional.forEach((p, i) => { got[P[i]] = val(p); how[P[i]] = `position ${i + 1}`; pos++; });
      parts.filter(p => /^[A-Za-z_]\w*\s*=/.test(p)).forEach(p => {
        const [, k, v] = p.match(/^([A-Za-z_]\w*)\s*=\s*(.+)$/);
        if (!P.includes(k)) err('TypeError', `calculate_force() got an unexpected keyword argument '${k}'`);
        if (k in got) err('TypeError', `calculate_force() got multiple values for argument '${k}'`);
        got[k] = val(v); how[k] = 'keyword';
      });
      const missing = P.filter(k => !(k in got));
      if (missing.length === 1) err('TypeError', `calculate_force() missing 1 required positional argument: '${missing[0]}'`);
      if (missing.length === 2) err('TypeError', `calculate_force() missing 2 required positional arguments: 'mass' and 'acceleration'`);
      const isInt = got.mass.int && got.acceleration.int;
      const f = got.mass.v * got.acceleration.v;
      out.innerHTML = head + `<b>Force: ${fmt(f, isInt)} N</b>`;
    } catch (e) {
      out.innerHTML = head + e;
    }
    map.innerHTML = P.map(k => k in got
      ? `<span class="param">${k}</span><span class="val">${fmt(got[k].v, got[k].int)}</span><span class="how">← ${how[k]}</span>`
      : `<span class="param missing">${k}</span><span class="val" style="border-style:dashed;color:var(--muted)">?</span><span class="how">no value</span>`).join('');
  }
  inp.addEventListener('input', run); run();
})();

/* ---------- Defaults and input checks ---------- */
(() => {
  const r = document.getElementById('cy-r');
  if (!r) return;
  const h = document.getElementById('cy-h'), pass = document.getElementById('cy-pass'), kw = document.getElementById('cy-kw');
  const steps = document.getElementById('cy-steps'), out = document.getElementById('cy-out');
  function run() {
    h.disabled = !pass.checked;
    const R = Number(r.value), H = pass.checked ? Number(h.value) : 10.0;
    const rs = pyNum(R, false), hs = pyNum(Number(h.value), false);
    document.getElementById('cy-rv').textContent = rs;
    document.getElementById('cy-hv').textContent = hs;
    const args = kw.checked ? [`radius=${rs}`].concat(pass.checked ? [`height=${hs}`] : []) : [rs].concat(pass.checked ? [hs] : []);
    const callTxt = `calculate_cylinder_volume(${args.join(', ')})`;
    const li = [];
    li.push(['', `radius = ${rs}` + (kw.checked ? ' (keyword)' : ' (1st positional argument)')]);
    li.push(['', `height = ${pyNum(H, false)}` + (pass.checked ? (kw.checked ? ' (keyword)' : ' (2nd positional argument)') : ' (default value, nothing was passed)')]);
    let printed = [], result;
    if (R < 0) {
      li.push(['stop', 'radius < 0 is True → print a message and return None']);
      li.push(['skip', 'height < 0 is never checked']);
      li.push(['skip', 'the volume is never calculated']);
      printed.push('The radius must not be negative.'); result = 'None';
    } else {
      li.push(['', 'radius < 0 is False → carry on']);
      if (H < 0) {
        li.push(['stop', 'height < 0 is True → print a message and return None']);
        li.push(['skip', 'the volume is never calculated']);
        printed.push('The height must not be negative.'); result = 'None';
      } else {
        li.push(['', 'height < 0 is False → carry on']);
        const v = Math.PI * R * R * H;
        li.push(['', `volume = np.pi * ${rs}**2 * ${pyNum(H, false)} → return ${pyNum(v, false)}`]);
        result = pyNum(v, false);
      }
    }
    steps.innerHTML = li.map(([c, t]) => `<li class="${c}">${esc(t)}</li>`).join('');
    out.innerHTML = `<span class="k">&gt;&gt;&gt;</span> volume = ${esc(callTxt)}\n` + printed.map(p => esc(p) + '\n').join('') +
      `<span class="k">&gt;&gt;&gt;</span> print(volume)\n<b>${result}</b>`;
  }
  [r, h, pass, kw].forEach(el => el.addEventListener('input', run));
  run();
})();
