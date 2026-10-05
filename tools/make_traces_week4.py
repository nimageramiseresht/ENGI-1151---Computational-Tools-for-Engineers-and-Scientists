"""Generate assets/traces-week4.js: step-through traces for the week 4 page.

Unlike the earlier traces, these follow Python into function calls and show
each function's local variables (labelled "name · function") next to the
global ones, so students can see locals appear and disappear.
Run from the repository root:

    python tools/make_traces_week4.py
"""
import io
import json
import sys
import types
from contextlib import redirect_stdout

TRACES = {
    "w4-greet": dict(code='''def greet(name):
    print("Hello,", name)

greet("Alice")
greet("Bob")''', notes={}),
    "w4-return": dict(code='''def add(a, b):
    result = a + b
    return result

total = add(3, 5)

print(total)''', notes={
        (5, "after"): "The returned value, 8, replaces add(3, 5), so it is stored in total.",
    }),
    "w4-scope": dict(code='''import numpy as np

def calculate_area(radius):
    area = np.pi * radius**2
    return area

result = calculate_area(5.0)

print(result)''', notes={
        (7, "after"): "area and radius have disappeared: they were local to calculate_area(). Only the returned value survives, in result.",
    }),
    "w4-default": dict(code='''import numpy as np

def calculate_cylinder_volume(radius, height=10.0):
    volume = np.pi * radius**2 * height
    return volume

v1 = calculate_cylinder_volume(2.0)
v2 = calculate_cylinder_volume(2.0, 5.0)''', notes={}),
    "w4-nested": dict(code='''import numpy as np

def calculate_circle_properties(radius):

    def calculate_area():
        return np.pi * radius**2

    def calculate_circumference():
        return 2 * np.pi * radius

    area = calculate_area()
    circumference = calculate_circumference()

    return area, circumference

area, circumference = calculate_circle_properties(5.0)''', notes={
        (5, "after"): "The inner function is created inside the outer one. It exists only while calculate_circle_properties() is running.",
    }),
}

FILENAME = "<lesson>"


def short(v):
    if isinstance(v, types.FunctionType):
        return f"<function {v.__name__}>"
    if isinstance(v, types.ModuleType):
        return f"<module {v.__name__}>"
    r = repr(v)
    return r if len(r) <= 60 else r[:57] + "..."


def snapshot(frame, g):
    out = {}
    for k, v in g.items():
        if k.startswith("__"):
            continue
        out[k] = short(v)
    stack = []
    f = frame
    while f is not None and f.f_code.co_filename == FILENAME and f.f_code.co_name != "<module>":
        stack.append(f)
        f = f.f_back
    for f in reversed(stack):
        for k, v in f.f_locals.items():
            out[f"{k} · {f.f_code.co_name}"] = short(v)
    return out


def trace(code, notes):
    lines = code.split("\n")
    steps = []
    buf = io.StringIO()
    g = {"__name__": "__main__"}
    pending = {}          # frame id -> step dict waiting for its "after" state

    def finish(fid, frame, note=None):
        st = pending.pop(fid, None)
        if st is None:
            return
        st["vars"] = snapshot(frame, g)
        st["out"] = buf.getvalue()
        key = (st["line"], "after")
        text = lines[st["line"] - 1].strip()
        if key in notes:
            st["note"] = notes[key]
        elif note:
            st["note"] = note
        elif text.startswith("def "):
            name = text[4:].split("(")[0]
            st["note"] = f"def creates the function {name}(). Its body does not run until the function is called."
        elif text.startswith("import "):
            st["note"] = "The module is imported, so np can now be used."
        steps.append(st)

    def tracer(frame, event, arg):
        if frame.f_code.co_filename != FILENAME:
            return tracer
        fid = id(frame)
        if event == "call" and frame.f_code.co_name != "<module>":
            name = frame.f_code.co_name
            params = frame.f_code.co_varnames[:frame.f_code.co_argcount]
            args = ", ".join(f"{p} = {short(frame.f_locals[p])}" for p in params)
            steps.append({
                "line": frame.f_code.co_firstlineno,
                "vars": snapshot(frame, g),
                "out": buf.getvalue(),
                "note": f"Calling {name}(): Python jumps into the function" + (f" with {args}." if args else " (it takes no arguments)."),
            })
        elif event == "line":
            finish(fid, frame)
            pending[fid] = {"line": frame.f_lineno}
        elif event == "return" and frame.f_code.co_name != "<module>":
            name = frame.f_code.co_name
            finish(fid, frame, note=f"{name}() returns {short(arg)} to the line that called it; its local variables are then discarded.")
        return tracer

    compiled = compile(code, FILENAME, "exec")
    sys.settrace(tracer)
    try:
        with redirect_stdout(buf):
            exec(compiled, g)
    finally:
        sys.settrace(None)
    # the last module-level line
    for fid in list(pending):
        st = pending.pop(fid)
        st["vars"] = snapshot(None, g)
        st["out"] = buf.getvalue()
        st["note"] = notes.get((st["line"], "after"), "Finished: Python has run the last line.")
        steps.append(st)
    for st in steps:
        st.setdefault("note", f"Line {st['line']} has just run.")
    return {"code": code, "steps": steps}


if __name__ == "__main__":
    data = {k: trace(v["code"], v["notes"]) for k, v in TRACES.items()}
    with open("assets/traces-week4.js", "w", encoding="utf-8") as f:
        f.write("/* Generated by tools/make_traces_week4.py. Do not edit by hand. */\n")
        f.write("window.TRACES = Object.assign(window.TRACES || {}, " + json.dumps(data, indent=1, ensure_ascii=False) + ");\n")
    for k, v in data.items():
        print(k, len(v["steps"]), "steps")
