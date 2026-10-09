/* ENGI 1151 presentation pages: runnable code boxes, step-through tracers
   and the if/elif/else flowchart. Shared by every weekN-slides.html. */
(() => {
  const IS_SPEAKER_PREVIEW = /receiver/i.test(location.search);   // iframes inside the speaker view
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  /* ================= Python worker ================= */
  const statusEls = () => document.querySelectorAll('[data-py-status]');
  const setStatus = html => statusEls().forEach(el => { el.innerHTML = html; });
  let worker = null, ready = false, queue = [], current = null, nextId = 1;

  function startWorker() {
    ready = false;
    setStatus('Python: loading… <span class="small">(10–20 s the first time)</span>');
    worker = new Worker('assets/pyworker.js', { type: 'module' });
    worker.onerror = () => setStatus('Python could not load: check the internet connection, then reload the page.');
    worker.onmessage = e => {
      const m = e.data;
      if (m.t === 'ready') {
        ready = true;
        setStatus('Python: <b>ready</b>');
        const q = queue; queue = [];
        q.forEach(send);
      } else if (m.t === 'fail') {
        setStatus('Python could not load: check the internet connection, then reload the page.');
      } else if (m.t === 'out' && current) {
        current.write(m.s);
      } else if (m.t === 'done' && current && current.id === m.id) {
        const c = current; current = null;
        c.finish(m.err);
      }
    };
  }
  function send(job) { current = job; worker.postMessage({ id: job.id, code: job.code, setup: job.setup, inputs: job.inputs }); }
  function run(job) {
    if (current) stop();                    // one program at a time
    job.id = nextId++;
    if (ready) send(job); else { current = job; queue = [job]; }
  }
  function stop() {
    const c = current; current = null; queue = [];
    if (worker) worker.terminate();
    startWorker();
    if (c) c.finish(null, true);
  }
  if (!IS_SPEAKER_PREVIEW) startWorker();
  else setStatus('Python runs in the main presentation window.');

  /* ================= Code boxes ================= */
  function highlight(code) {
    if (window.hljs) return hljs.highlight(code, { language: 'python', ignoreIllegals: true }).value;
    return esc(code);
  }
  document.querySelectorAll('.py').forEach(box => {
    const pre = box.querySelector('pre');
    const original = pre.textContent.replace(/^\n/, '').replace(/\s+$/, '');
    const setupEl = box.dataset.setup ? document.getElementById('setup-' + box.dataset.setup) : null;
    const setup = setupEl ? setupEl.textContent : '';
    const hasInput = 'input' in box.dataset;
    box.innerHTML = `
      <div class="ed"><pre aria-hidden="true"><code></code></pre><textarea wrap="off" spellcheck="false" autocapitalize="off" autocomplete="off" aria-label="Python code"></textarea></div>
      <div class="bar">
        <button type="button" class="run">▶ Run</button>
        <button type="button" class="stop" hidden>■ Stop</button>
        <button type="button" class="reset" title="Put the original code back">↺ Reset</button>
        ${hasInput ? `<label class="in">input() <input type="text" value="${esc(box.dataset.input)}" aria-label="Value(s) for input(), separated by commas"></label>` : ''}
        <span class="hint">${esc(box.dataset.hint || 'Shift + Enter runs')}</span>
      </div>
      <pre class="out" hidden aria-live="polite"></pre>`;
    const ta = box.querySelector('textarea'), hl = box.querySelector('.ed code'), out = box.querySelector('.out');
    const runBtn = box.querySelector('.run'), stopBtn = box.querySelector('.stop'), inField = box.querySelector('.in input');
    const sync = () => {
      hl.innerHTML = highlight(ta.value) + '\n';
    };
    ta.value = original; sync();
    ta.addEventListener('input', sync);
    ta.addEventListener('keydown', e => {
      e.stopPropagation();                      // never let typing move the slides
      if (e.key === 'Tab') {
        e.preventDefault();
        const s = ta.selectionStart, en = ta.selectionEnd;
        ta.setRangeText('    ', s, en, 'end'); sync();
      } else if (e.key === 'Enter' && (e.shiftKey || e.ctrlKey || e.metaKey)) {
        e.preventDefault(); go();
      } else if (e.key === 'Escape') {
        ta.blur();
      }
    });
    if (inField) inField.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') go(); });
    let lines = [], txt = null, frame = 0;
    const render = () => {
      frame = 0;
      txt.textContent = lines.length ? lines.join('\n') + '\n' : '';
      out.scrollTop = out.scrollHeight;
    };
    function go() {
      out.hidden = false;
      out.innerHTML = (ready ? '' : '<span class="note">Starting Python…\n</span>') + '<span class="txt"></span>';
      txt = out.querySelector('.txt');
      lines = [];
      stopBtn.hidden = false;
      const inputs = inField ? inField.value.split(',').map(s => s.trim()).filter(s => s !== '') : [];
      run({
        code: ta.value, setup, inputs,
        write(s) {
          const waiting = out.querySelector('.note');
          if (waiting) waiting.remove();
          lines.push(...s.split('\n'));
          if (lines.length > 400) lines.splice(0, lines.length - 400);   // keep the newest lines
          if (!frame) frame = requestAnimationFrame(render);
        },
        finish(err, stopped) {
          stopBtn.hidden = true;
          if (frame) cancelAnimationFrame(frame);
          render();
          const waiting = out.querySelector('.note');
          if (waiting) waiting.remove();
          if (err) out.insertAdjacentHTML('beforeend', `<span class="err">${esc(err)}</span>\n`);
          if (stopped) out.insertAdjacentHTML('beforeend', '<span class="note">■ Stopped.</span>\n');
          if (!err && !stopped && lines.length === 0) out.innerHTML = '<span class="note">(the code ran but printed nothing)</span>';
          out.scrollTop = out.scrollHeight;
        }
      });
    }
    runBtn.addEventListener('click', go);
    stopBtn.addEventListener('click', stop);
    box.querySelector('.reset').addEventListener('click', () => { ta.value = original; sync(); out.hidden = true; out.innerHTML = ''; });
  });

  /* ================= Static highlighted code ================= */
  document.querySelectorAll('pre.code code').forEach(el => { el.innerHTML = highlight(el.textContent.replace(/^\n/, '')); });

  /* ================= Step-through tracers ================= */
  document.querySelectorAll('.tracer[data-trace]').forEach(box => {
    const data = (window.TRACES || {})[box.dataset.trace];
    if (!data) return;
    const lines = data.code.split('\n');
    box.innerHTML =
      `<div class="t-body">
         <div class="t-code">${lines.map((l, i) => `<div data-n="${i + 1}">${esc(l) || ' '}</div>`).join('')}</div>
         <div class="t-side"><h5>Variables</h5><dl class="t-vars"></dl><h5>Output</h5><pre class="t-out"></pre></div>
       </div>
       <p class="t-note" aria-live="polite"></p>
       <div class="t-ctrl"><button type="button" data-a="reset">⟲ Start</button><button type="button" data-a="back">← Back</button><button type="button" class="run" data-a="next">Next line →</button><span class="count"></span></div>`;
    const rows = [...box.querySelectorAll('.t-code div')];
    const varsEl = box.querySelector('.t-vars'), outEl = box.querySelector('.t-out');
    const noteEl = box.querySelector('.t-note'), count = box.querySelector('.count');
    let k = -1;
    function render() {
      const s = data.steps[k], prev = data.steps[k - 1];
      rows.forEach((r, i) => r.classList.toggle('cur', s ? s.line === i + 1 : false));
      const vars = s ? s.vars : {};
      varsEl.innerHTML = Object.keys(vars).length
        ? Object.entries(vars).map(([n, v]) => `<dt>${esc(n)}</dt><dd class="${s && (!prev || prev.vars[n] !== v) ? 'changed' : ''}">${esc(v)}</dd>`).join('')
        : '<dt>–</dt><dd>none yet</dd>';
      outEl.textContent = s ? s.out : '';
      noteEl.textContent = k < 0 ? 'Press “Next line” to run the first line.'
        : (s.note || (k === data.steps.length - 1 ? 'Finished: Python has run the last line.' : `Line ${s.line} has just run.`));
      count.textContent = k < 0 ? `0 / ${data.steps.length}` : `step ${k + 1} / ${data.steps.length}`;
      box.querySelector('[data-a="back"]').disabled = k < 0;
      box.querySelector('[data-a="next"]').disabled = k >= data.steps.length - 1;
    }
    box.addEventListener('click', e => {
      const a = e.target.dataset && e.target.dataset.a;
      if (a === 'next') k = Math.min(k + 1, data.steps.length - 1);
      if (a === 'back') k = Math.max(k - 1, -1);
      if (a === 'reset') k = -1;
      if (a) render();
    });
    render();
  });

  /* ================= if / elif / else flowchart ================= */
  (() => {
    const t = document.getElementById('if-t');
    if (!t) return;
    const $ = id => document.getElementById(id);
    const wrong = $('if-wrong'), out = $('if-out');
    const f1 = x => Number.isInteger(x) ? x.toFixed(1) : String(x);
    const ALL = ['n-start', 'e-s1', 'n-d1', 'e-y1', 'n-y1', 'e-n1', 'n-d2', 'e-y2', 'n-y2', 'e-n2', 'n-el'];
    function go() {
      const T = Number(t.value);
      $('if-tv').textContent = f1(T);
      $('t-start').textContent = `temperature = ${f1(T)}`;
      const c = wrong.checked ? [[25.0, 'It is warm.'], [40.0, 'It is very hot.']] : [[40.0, 'It is very hot.'], [25.0, 'It is warm.']];
      $('t-d1').textContent = `temperature > ${f1(c[0][0])}`;
      $('t-d2').textContent = `temperature > ${f1(c[1][0])}`;
      $('t-y1').textContent = `print("${c[0][1]}")`;
      $('t-y2').textContent = `print("${c[1][1]}")`;
      let path, msg;
      if (T > c[0][0]) { path = ['n-start', 'e-s1', 'n-d1', 'e-y1', 'n-y1']; msg = c[0][1]; }
      else if (T > c[1][0]) { path = ['n-start', 'e-s1', 'n-d1', 'e-n1', 'n-d2', 'e-y2', 'n-y2']; msg = c[1][1]; }
      else { path = ['n-start', 'e-s1', 'n-d1', 'e-n1', 'n-d2', 'e-n2', 'n-el']; msg = 'It is cool.'; }
      ALL.forEach(id => {
        const el = $(id), on = path.includes(id);
        el.classList.toggle('dim', !on);
        if (el.tagName === 'path') el.classList.toggle('path-on', on);
        else el.querySelector('rect, polygon').classList.toggle('on', on && id !== 'n-start');
      });
      out.innerHTML = `output: <b>${msg}</b>` + (wrong.checked && T > 40 ? `\n<span class="err">Wrong!</span> ${f1(T)} °C is very hot, but temperature > 25.0 was checked first.` : '');
    }
    [t, wrong].forEach(el => {
      el.addEventListener('input', go);
      el.addEventListener('keydown', e => e.stopPropagation());
    });
    go();
  })();

  /* ================= Speaker notes: one bullet per line ================= */
  document.querySelectorAll('aside.notes').forEach(n => {
    const lines = n.textContent.split('\n').map(l => l.trim()).filter(Boolean);
    n.innerHTML = '<ul>' + lines.map(l => `<li>${esc(l)}</li>`).join('') + '</ul>';
  });

  /* ================= Reveal ================= */
  Reveal.initialize({
    hash: true,
    width: 1280, height: 720, margin: 0.04,
    center: false,
    slideNumber: 'c/t',
    transition: 'slide', transitionSpeed: 'fast',
    plugins: window.RevealNotes ? [RevealNotes] : []
  });
})();
