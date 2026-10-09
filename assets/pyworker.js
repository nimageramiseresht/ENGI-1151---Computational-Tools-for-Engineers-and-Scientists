/* Python for the presentation pages. Runs Pyodide in a background worker so
   that a long or infinite loop never freezes the slides: the Stop button
   simply terminates this worker and starts a fresh one.
   (Pyodide 0.28+ only runs in module workers, hence the import below.) */
import { loadPyodide } from 'https://cdn.jsdelivr.net/pyodide/v314.0.6/full/pyodide.mjs';
const PYODIDE_URL = 'https://cdn.jsdelivr.net/pyodide/v314.0.6/full/';

const PRELUDE = `
import ast, sys, traceback

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
    except SyntaxError as e:
        sys.stdout.flush()
        return f"line {e.lineno}: {type(e).__name__}: {e.msg}"
    except BaseException as e:
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
  pyodide.runPython(PRELUDE);
  postMessage({ t: 'ready' });
})().catch(err => postMessage({ t: 'fail', s: String(err) }));

onmessage = async e => {
  await ready;
  const { id, code, setup, inputs } = e.data;
  try {
    const run = pyodide.globals.get('_run');
    const err = run(code, setup || '', pyodide.toPy(inputs || []));
    run.destroy();
    flush();
    postMessage({ t: 'done', id, err: err === undefined ? null : err });
  } catch (x) {
    flush();
    postMessage({ t: 'done', id, err: String(x.message || x).split('\n').filter(Boolean).pop() });
  }
};
