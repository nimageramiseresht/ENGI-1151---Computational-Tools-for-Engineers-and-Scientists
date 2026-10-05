/* ENGI 1151 shared behaviour: week navigation, live Python, notebooks,
   quick checks, tabs and step-through tracers. Page-specific widgets live
   in each week's own <script> block. */

/* ============ Course map: add a week here and it appears everywhere ============ */
const WEEKS = [
  { n: 1, file: 'week1.html', title: 'Introduction to Python',
    blurb: 'Jupyter Notebook, Python as a calculator, variables, data types, lists and dictionaries.',
    topics: 'operators · variables · types · lists · dicts' },
  { n: 2, file: 'week2.html', title: 'Flow control in Python',
    blurb: 'Make decisions with if, repeat work with for and while loops, and handle errors with try and except.',
    topics: 'if/elif/else · for · while · break · try/except' },
  { n: 3, file: 'week3.html', title: 'Python libraries, NumPy and Matplotlib',
    blurb: 'Install and import packages, compute with whole arrays at once, and turn results into clear engineering plots.',
    topics: 'pip · import · numpy arrays · matplotlib'
  },
  { n: 4, file: 'week4.html', title: 'Functions in Python',
    blurb: 'Write an equation once as a named, documented function and reuse it with numbers, arrays and other functions.',
    topics: 'def · arguments · return · scope · lambda' },
  { n: 5, file: 'week5.html', title: 'Monte Carlo simulation',
    blurb: 'Sample uncertain inputs thousands of times with NumPy and let the answer emerge from the results.',
    topics: 'numpy.random · functions · histograms' },
];

/* ============ Live Python configuration ============ */
// The GitHub Action builds JupyterLite into ./lite/. If that folder is missing
// (for example when a page is opened straight from disk), the page falls back
// to the public JupyterLite demo so the live windows still work.
const LOCAL_LITE = 'lite/';
const PUBLIC_LITE = 'https://jupyterlite.github.io/demo/';
const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const PAGE_WEEK = Number(document.body.dataset.week || 0);

const liteBase = (async () => {
  if (location.protocol === 'file:') return { base: PUBLIC_LITE, local: false };
  try {
    const r = await fetch(LOCAL_LITE + 'repl/index.html', { method: 'HEAD', cache: 'no-store' });
    if (r.ok) return { base: LOCAL_LITE, local: true };
  } catch (e) { /* fall through */ }
  return { base: PUBLIC_LITE, local: false };
})();

function replUrl(base, setup) {
  const p = new URLSearchParams({
    kernel: 'python',
    toolbar: '1',
    showBanner: '0',
    clearCodeContentOnExecute: '0',  // keep typed code in the editor after running
    promptCellPosition: 'top',
    theme: darkQuery.matches ? 'JupyterLab Dark' : 'JupyterLab Light'
  });
  if (setup) {
    p.append('code', setup);         // executed silently on start-up
    p.set('hideCodeInput', '1');
  }
  return base + 'repl/index.html?' + p.toString();
}

/* ============ Top bar with week switcher ============ */
(() => {
  const slot = document.getElementById('topbar');
  if (!slot) return;
  const pills = WEEKS.map(w => w.soon
    ? `<span title="Week ${w.n}: coming soon">${w.n}</span>`
    : `<a href="${w.file}" title="Week ${w.n}: ${w.title}"${w.n === PAGE_WEEK ? ' aria-current="page"' : ''}>${w.n}</a>`).join('');
  slot.className = 'topbar';
  slot.innerHTML = `<div class="inner"><a class="home" href="index.html"><b>ENGI 1151</b> · all weeks</a>
    <nav class="weekpills" aria-label="Weeks"><span style="border:0;opacity:1;min-width:0;padding:0">Week</span>${pills}</nav></div>`;
})();

/* Landing page cards */
(() => {
  const grid = document.getElementById('week-grid');
  if (grid) {
    grid.innerHTML = WEEKS.map(w => w.soon
      ? `<div class="week-card" aria-disabled="true"><span class="wk">Week<b>${w.n}</b></span><h3>Coming soon</h3><p>Notes for this week will appear here after the lecture is published.</p><span></span></div>`
      : `<a class="week-card" href="${w.file}"><span class="wk">Week<b>${w.n}</b></span><h3>${w.title}</h3><p>${w.blurb}</p><span class="topics">${w.topics}</span></a>`).join('');
  }
  const picker = document.getElementById('week-picker');
  if (picker) {
    picker.innerHTML = WEEKS.map(w => w.soon
      ? `<span class="pick soon" title="Coming soon">${w.n}</span>`
      : `<a class="pick" href="${w.file}" title="Week ${w.n}: ${w.title}">${w.n}</a>`).join('');
  }
  // Previous / next links at the bottom of a week page
  const pager = document.getElementById('pager');
  if (pager && PAGE_WEEK) {
    const live = WEEKS.filter(w => !w.soon);
    const i = live.findIndex(w => w.n === PAGE_WEEK);
    const prev = live[i - 1], next = live[i + 1];
    pager.innerHTML =
      (prev ? `<a href="${prev.file}">← Week ${prev.n}: ${prev.title}</a>` : '<a href="index.html">← All weeks</a>') +
      (next ? `<a href="${next.file}">Week ${next.n}: ${next.title} →</a>` : '<a href="index.html">All weeks →</a>');
  }
})();

/* ============ Syntax highlighting and maths ============ */
document.querySelectorAll('figure.code code').forEach(el => {
  el.dataset.source = el.textContent;       // keep the raw code before highlighting
  if (window.hljs) hljs.highlightElement(el);
});
if (window.renderMathInElement) {
  renderMathInElement(document.body, {
    delimiters: [{ left: '$$', right: '$$', display: true }, { left: '\\(', right: '\\)', display: false }],
    throwOnError: false
  });
}

/* ============ Runnable code blocks and empty practice boxes ============ */
document.querySelectorAll('figure.code[data-runnable]').forEach(fig => {
  const code = fig.querySelector('code').dataset.source;
  const setupId = fig.dataset.setup;
  const setupEl = setupId ? document.getElementById('setup-' + setupId) : null;
  const setup = setupEl ? setupEl.textContent : '';
  const sandbox = fig.classList.contains('sandbox');
  const bar = document.createElement('div');
  bar.className = 'code-bar';

  const openLabel = sandbox ? 'Open an empty Python box' : 'Open live Python';
  const run = document.createElement('button');
  run.type = 'button'; run.className = 'run';
  run.textContent = openLabel;
  run.setAttribute('aria-expanded', 'false');

  const copy = document.createElement('button');
  copy.type = 'button'; copy.textContent = sandbox ? 'Copy starter' : 'Copy code';

  const hint = document.createElement('span');
  hint.className = 'hint';
  hint.textContent = fig.dataset.hint || (setupEl && setupEl.dataset.hint) || '';

  bar.append(run, copy, hint);
  fig.append(bar);

  let panel = null;
  run.addEventListener('click', async () => {
    const open = run.getAttribute('aria-expanded') === 'true';
    if (open) {
      panel.remove(); panel = null;              // removing the iframe stops its Python kernel
      run.setAttribute('aria-expanded', 'false');
      run.textContent = openLabel;
      return;
    }
    run.setAttribute('aria-expanded', 'true');
    run.textContent = 'Close live Python';
    const { base } = await liteBase;
    panel = document.createElement('div');
    panel.className = 'repl';
    panel.innerHTML =
      '<p class="repl-help">Type or paste code into the empty box and press <kbd>Shift</kbd> + <kbd>Enter</kbd> to run it. Your code stays in the box, so you can change it and run it again. ' +
      'The first start takes 10 to 20 seconds while Python loads in your browser.</p>' +
      '<div class="repl-frame"><iframe title="Live Python console" loading="lazy" allow="clipboard-read; clipboard-write"></iframe></div>';
    panel.querySelector('iframe').src = replUrl(base, setup);
    fig.append(panel);
  });

  copy.addEventListener('click', async () => {
    const original = copy.textContent;
    try {
      await navigator.clipboard.writeText(code);
      copy.textContent = 'Copied';
    } catch (e) {
      copy.textContent = 'Select the code to copy';
    }
    setTimeout(() => { copy.textContent = original; }, 1800);
  });
});

/* ============ Full practice notebook ============ */
(async () => {
  const slot = document.getElementById('notebook-slot');
  const NOTEBOOK = document.body.dataset.notebook;
  if (!slot || !NOTEBOOK) return;
  const links = document.getElementById('notebook-links');
  const { base, local } = await liteBase;
  if (local) {
    const nbUrl = base + 'notebooks/index.html?path=' + encodeURIComponent(NOTEBOOK);
    links.innerHTML =
      '<a href="' + nbUrl + '" target="_blank" rel="noopener">Open in a new tab</a>' +
      '<a href="' + base + 'lab/index.html?path=' + encodeURIComponent(NOTEBOOK) + '" target="_blank" rel="noopener">Open in JupyterLab</a>' +
      '<a href="' + base + 'files/' + NOTEBOOK + '" download>Download .ipynb</a>';
    const frame = document.createElement('div');
    frame.className = 'notebook-frame';
    const iframe = document.createElement('iframe');
    iframe.title = 'Practice notebook';
    iframe.loading = 'lazy';
    iframe.src = nbUrl;
    frame.append(iframe);
    slot.append(frame);
  } else {
    links.innerHTML = '<a href="content/' + NOTEBOOK + '" download>Download .ipynb</a>';
    slot.innerHTML =
      '<div class="notebook-empty"><p>The embedded notebook appears once this page is published with the included GitHub Action, which builds JupyterLite into the <code>lite/</code> folder.</p>' +
      '<p style="margin:0">Until then, the live Python windows above use the public JupyterLite demo, and you can download the notebook to run in any Jupyter installation.</p></div>';
  }
})();

/* ============ Contents highlight ============ */
(() => {
  const links = [...document.querySelectorAll('nav.toc a')];
  if (!links.length) return;
  const map = new Map(links.map(a => [a.getAttribute('href').slice(1), a]));
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        links.forEach(a => a.classList.remove('active'));
        map.get(e.target.id)?.classList.add('active');
      }
    });
  }, { rootMargin: '-20% 0px -70% 0px' });
  map.forEach((_, id) => { const s = document.getElementById(id); if (s) obs.observe(s); });
})();

/* ============ Quick-check questions ============ */
// <div class="quiz" data-answer="2"> <p class="q">…</p> <div class="opts"><button>…</button>…</div> <p class="why">…</p></div>
document.querySelectorAll('.quiz').forEach(q => {
  const answer = Number(q.dataset.answer);
  const buttons = [...q.querySelectorAll('.opts button')];
  const why = q.querySelector('.why');
  if (why) why.setAttribute('aria-live', 'polite');
  buttons.forEach((b, i) => {
    b.type = 'button';
    b.addEventListener('click', () => {
      if (i === answer) {
        b.classList.add('right');
        buttons.forEach(x => { x.disabled = true; });
        q.classList.add('answered');
        if (why && !why.dataset.prefixed) { why.innerHTML = '<span class="ok">Correct.</span> ' + why.innerHTML; why.dataset.prefixed = 1; }
      } else {
        b.classList.add('wrong');
        b.disabled = true;
      }
    });
  });
});

/* ============ Tabs ============ */
document.querySelectorAll('.tabs').forEach(t => {
  const tabs = [...t.querySelectorAll('[role="tab"]')];
  const panels = [...t.querySelectorAll('[role="tabpanel"]')];
  function select(i, focus) {
    tabs.forEach((tab, j) => {
      tab.setAttribute('aria-selected', String(i === j));
      tab.tabIndex = i === j ? 0 : -1;
      panels[j].hidden = i !== j;
    });
    if (focus) tabs[i].focus();
  }
  tabs.forEach((tab, i) => {
    tab.type = 'button';
    tab.addEventListener('click', () => select(i));
    tab.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight') select((i + 1) % tabs.length, true);
      if (e.key === 'ArrowLeft') select((i - 1 + tabs.length) % tabs.length, true);
    });
  });
  select(0);
});

/* ============ Step-through tracers ============ */
// <div class="tracer" data-trace="id" data-title="…"></div> + <script type="application/json" id="trace-id">
document.querySelectorAll('.tracer[data-trace]').forEach(box => {
  const id = box.dataset.trace;
  const data = (window.TRACES || {})[id] || JSON.parse(document.getElementById('trace-' + id).textContent);
  const lines = data.code.split('\n');
  box.innerHTML =
    `<div class="t-head">${box.dataset.title || 'Watch Python run this code line by line'}</div>
     <div class="t-body">
       <div class="t-code">${lines.map((l, i) => `<div data-n="${i + 1}">${l.replace(/&/g, '&amp;').replace(/</g, '&lt;') || ' '}</div>`).join('')}</div>
       <div class="t-side"><h5>Variables</h5><dl class="t-vars"></dl><h5>Output</h5><pre class="t-out"></pre></div>
     </div>
     <p class="t-note" aria-live="polite"></p>
     <div class="t-ctrl"><button type="button" data-a="reset">⟲ Start</button><button type="button" data-a="back">← Back</button><button type="button" class="run" data-a="next">Next line →</button><button type="button" data-a="play">▶ Play</button><span class="count"></span></div>`;
  const codeRows = [...box.querySelectorAll('.t-code div')];
  const varsEl = box.querySelector('.t-vars');
  const outEl = box.querySelector('.t-out');
  const noteEl = box.querySelector('.t-note');
  const count = box.querySelector('.count');
  const btn = a => box.querySelector(`[data-a="${a}"]`);
  let k = -1, timer = null;

  function render() {
    const s = data.steps[k];
    const prev = data.steps[k - 1];
    codeRows.forEach((r, i) => r.classList.toggle('cur', s ? s.line === i + 1 : false));
    const vars = s ? s.vars : {};
    varsEl.innerHTML = Object.keys(vars).length
      ? Object.entries(vars).map(([n, v]) => {
          const changed = !prev || prev.vars[n] !== v;
          return `<dt>${n}</dt><dd class="${changed && s ? 'changed' : ''}">${v.replace(/</g, '&lt;')}</dd>`;
        }).join('')
      : '<dt>–</dt><dd>none yet</dd>';
    outEl.textContent = s ? s.out : '';
    outEl.scrollTop = outEl.scrollHeight;
    noteEl.textContent = k < 0 ? 'Press “Next line” to run the first line.' :
      (s.note || (k === data.steps.length - 1 ? 'Finished: Python has run the last line.' : `Line ${s.line} has just run.`));
    count.textContent = k < 0 ? `0 / ${data.steps.length}` : `step ${k + 1} / ${data.steps.length}`;
    btn('back').disabled = k < 0;
    btn('next').disabled = k >= data.steps.length - 1;
  }
  function stop() { clearInterval(timer); timer = null; btn('play').textContent = '▶ Play'; }
  box.addEventListener('click', e => {
    const a = e.target.dataset?.a;
    if (!a) return;
    if (a === 'next') { stop(); k = Math.min(k + 1, data.steps.length - 1); }
    if (a === 'back') { stop(); k = Math.max(k - 1, -1); }
    if (a === 'reset') { stop(); k = -1; }
    if (a === 'play') {
      if (timer) { stop(); }
      else {
        if (k >= data.steps.length - 1) k = -1;
        btn('play').textContent = '❚❚ Pause';
        timer = setInterval(() => {
          k++; render();
          if (k >= data.steps.length - 1) stop();
        }, 700);
      }
    }
    render();
  });
  render();
});

/* ============ Summary checklist (remembered in this browser only) ============ */
document.querySelectorAll('ul.checklist').forEach(list => {
  const key = 'engi1151-check-' + location.pathname + '-' + (list.id || '');
  let saved = [];
  try { saved = JSON.parse(localStorage.getItem(key) || '[]'); } catch (e) { saved = []; }
  const boxes = [...list.querySelectorAll('input[type="checkbox"]')];
  boxes.forEach((b, i) => {
    b.checked = !!saved[i];
    b.addEventListener('change', () => {
      try { localStorage.setItem(key, JSON.stringify(boxes.map(x => x.checked))); } catch (e) { /* storage unavailable */ }
    });
  });
});

/* ============ Helpers shared by page widgets ============ */
// Python-style repr for numbers, so widgets print what Python would print.
function pyNum(x, isInt) {
  if (typeof x === 'bigint') return x.toString();
  if (isInt) return String(x);
  if (Number.isNaN(x)) return 'nan';
  if (!Number.isFinite(x)) return x > 0 ? 'inf' : '-inf';
  if (Number.isInteger(x) && Math.abs(x) < 1e16) return x.toFixed(1);
  const a = Math.abs(x);
  if (a !== 0 && (a < 1e-4 || a >= 1e16)) {
    let [m, e] = x.toExponential().split('e');
    const sign = e[0] === '-' ? '-' : '+';
    e = e.replace(/^[+-]/, '').padStart(2, '0');
    return m + 'e' + sign + e;
  }
  return String(x);
}
function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
