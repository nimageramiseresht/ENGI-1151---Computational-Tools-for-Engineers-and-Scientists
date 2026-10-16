/* Python for the presentation pages. Runs Pyodide in a background worker so
   that a long or infinite loop never freezes the slides: the Stop button
   simply terminates this worker and starts a fresh one.
   (Pyodide 0.28+ only runs in module workers, hence the import below.)
   Matplotlib figures are drawn off-screen (Agg) and sent to the slide as PNG images. */
import { loadPyodide } from 'https://cdn.jsdelivr.net/pyodide/v314.0.6/full/pyodide.mjs';
const PYODIDE_URL = 'https://cdn.jsdelivr.net/pyodide/v314.0.6/full/';

const PRELUDE = `
import ast, sys, os, io, base64, traceback, warnings
os.environ["MPLBACKEND"] = "Agg"     # draw figures off-screen; the slide shows them as images
warnings.filterwarnings("ignore", category=DeprecationWarning) 

def _send_png(data):
    """Send one PNG (base64) to the slide. Figures travel outside stdout, so no
    marker text can be lost or shown on the slide."""
    try:
        import slide_io
        slide_io.show_png(data)
    except ImportError:                  # plain Python (testing): print a marker line
        print("\\x00IMG:" + data)

def _show(*args, **kwargs):
    """Replacement for plt.show(): send every open figure to the slide as a PNG image."""
    import matplotlib.pyplot as plt
    for num in plt.get_fignums():
        buf = io.BytesIO()
        plt.figure(num).savefig(buf, format="png", dpi=100, bbox_inches="tight")
        sys.stdout.flush()           # text printed before the figure goes first
        _send_png(base64.b64encode(buf.getvalue()).decode("ascii"))
    plt.close("all")

def _run(code, setup, inputs):
    """Run one code box in a fresh namespace. Returns an error line or None."""
    ns = {"__name__": "__main__"}
    queue = [str(v) for v in inputs]

    def _input(prompt=""):
        # input() reads from the small input box above the code on the slide
        if not queue:
            raise EOFError("no value left: type one in the input box above the code")
        value = queue.pop(0)
        print(str(prompt) + value)
        return value

    ns["input"] = _input
    uses_mpl = "matplotlib" in code or "matplotlib" in setup
    if uses_mpl:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
        plt.close("all")
        plt.show = _show
    try:
        if setup:
            exec(compile(setup, "<setup>", "exec"), ns)
        tree = ast.parse(code, "<slide>")
        last = tree.body[-1] if tree.body else None
        if isinstance(last, ast.Expr):
            exec(compile(ast.Module(tree.body[:-1], []), "<slide>", "exec"), ns)
            value = eval(compile(ast.Expression(last.value), "<slide>", "eval"), ns)
            if value is not None:
                print(repr(value))
        else:
            exec(compile(tree, "<slide>", "exec"), ns)
        if uses_mpl:
            _show()                  # figures that were drawn but never shown
    except SyntaxError as e:
        sys.stdout.flush()
        return f"line {e.lineno}: {type(e).__name__}: {e.msg}"
    except BaseException as e:
        if uses_mpl:
            plt.close("all")
        sys.stdout.flush()
        frames = [f for f in traceback.extract_tb(e.__traceback__) if f.filename == "<slide>"]
        where = f"line {frames[-1].lineno}: " if frames else ""
        return f"{where}{type(e).__name__}: {e}"
    sys.stdout.flush()
    return None
`;

// Output is sent in small batches (at most ~15 per second, newest 400 lines
// kept), so even an infinite print loop cannot flood or freeze the slides.
let buf = [], last = 0;
function emit(s) {
  buf.push(s);
  if (buf.length > 400) buf.splice(0, buf.length - 400);
  if (Date.now() - last >= 70) flush();
}
function flush() {
  if (buf.length) postMessage({ t: 'out', s: buf.join('\n') });
  buf = []; last = Date.now();
}

let pyodide = null;
const ready = (async () => {
  pyodide = await loadPyodide({ indexURL: PYODIDE_URL });
  pyodide.setStdout({ batched: emit });
  pyodide.setStderr({ batched: emit });
  pyodide.registerJsModule('slide_io', { show_png: data => { flush(); postMessage({ t: 'img', s: data }); } });
  pyodide.runPython(PRELUDE);
  postMessage({ t: 'ready' });
})().catch(err => postMessage({ t: 'fail', s: String(err) }));

// Package loading writes no progress or error text into the code-box output.
const QUIET = errors => ({ messageCallback: () => {}, errorCallback: e => errors.push(e) });

// Messages are handled one at a time, in order: an optional package preload
// ({t: 'preload', pkgs}) and then the code boxes as they are run.
let chain = ready;
onmessage = e => { const m = e.data; chain = chain.then(() => handle(m)).catch(() => {}); };

async function handle(m) {
  if (m.t === 'preload') {
    const errors = [];
    try { await pyodide.loadPackage(m.pkgs, QUIET(errors)); } catch (x) { errors.push(String(x)); }
    // on failure the code boxes simply try again when they need the package
    postMessage(errors.length ? { t: 'loaded', err: errors.join(' ') } : { t: 'loaded' });
    return;
  }
  const { id, code, setup, inputs } = m;
  try {
    try { await pyodide.loadPackagesFromImports((setup || '') + '\n' + code, QUIET([])); } catch (x) { /* Python reports a missing module below */ }
    const run = pyodide.globals.get('_run');
    const err = run(code, setup || '', pyodide.toPy(inputs || []));
    run.destroy();
    flush();
    postMessage({ t: 'done', id, err: err === undefined ? null : err });
  } catch (x) {
    flush();
    postMessage({ t: 'done', id, err: String(x.message || x).split('\n').filter(Boolean).pop() });
  }
}
