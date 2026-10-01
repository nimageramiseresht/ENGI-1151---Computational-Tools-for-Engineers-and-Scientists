"""Generate assets/traces.js: real Python execution traces for the
"Step through" boxes on the week pages.

Each step records the line that has just run, the variables afterwards and
the printed output so far. Run from the repository root:

    python tools/make_traces.py
"""
import io
import json
import sys
from contextlib import redirect_stdout

TRACES = {
    # ---------------- Week 1 ----------------
    "w1-assign": dict(code="""a = 10
b = 20
result = a + b

print(result)

temperature = 25.0
temperature = temperature + 5.0

print(temperature)""", notes={
        3: "The right-hand side a + b is evaluated first (30), then stored in result.",
        8: "Python reads the current value (25.0), adds 5.0, and stores 30.0 back in temperature.",
    }),

    # ---------------- Week 2 ----------------
    "w2-sequence": dict(code="""a = 12
b = 33

result = a + b

a = 36

print(result)""", notes={
        6: "a changes, but result was already calculated. It does not update by itself.",
        8: "result is still 45: the calculation is not repeated unless you write it again.",
    }),
    "w2-elif": dict(code="""temperature = 41.0

if temperature > 40.0:
    print("It is very hot.")
elif temperature > 25.0:
    print("It is warm.")
else:
    print("It is cool.")""", notes={
        3: "temperature > 40.0 is True, so Python enters this block…",
        4: "…and skips every remaining elif and else, even though 41 > 25 is also True.",
    }),
    "w2-while": dict(code="""counter = 0

while counter < 3:
    print("Counter:", counter)
    counter += 1""", notes={}),
    "w2-tolerance": dict(code="""error = 1.0
tolerance = 0.01
iteration = 0

while error > tolerance:
    error = error / 2.0
    iteration += 1

    print("Iteration:", iteration, "Error:", error)

print("The tolerance has been satisfied.")""", notes={}),
    "w2-break": dict(code="""temperatures = [22.0, 24.5, 27.1, 85.0, 25.3]
maximum_temperature = 80.0

for temperature in temperatures:
    if temperature > maximum_temperature:
        print("Unsafe temperature detected:", temperature)
        break

    print("Accepted temperature:", temperature)""", notes={
        7: "break leaves the loop immediately: 25.3 is never checked.",
    }),
    "w2-continue": dict(code="""measurements = [12.5, -999.0, 13.1, 12.8]
invalid_value = -999.0

for measurement in measurements:
    if measurement == invalid_value:
        continue

    print("Valid measurement:", measurement)""", notes={
        6: "continue skips the rest of this iteration; the loop moves on to the next measurement.",
    }),
    "w2-nested": dict(code="""lengths = [1.0, 2.0, 3.0]
loads = [100.0, 200.0]

for length in lengths:
    for load in loads:
        print("Length:", length, "Load:", load)""", notes={}),
    "w2-accumulate": dict(code="""loads = [12.5, 8.0, 15.5, 10.0]

total_load = 0.0
for load in loads:
    total_load += load

average_load = total_load / len(loads)
print("Total:", total_load, "kN")
print("Average:", average_load, "kN")""", notes={
        3: "Start the running total at zero before the loop.",
        5: "Each pass adds one load to the running total.",
    }),
}


def trace(code, notes):
    steps = []
    buf = io.StringIO()
    pending = {}

    def snapshot(frame):
        out = {}
        for k, v in frame.f_locals.items():
            if k.startswith("__") or callable(v) or isinstance(v, type(sys)):
                continue
            out[k] = repr(v)
        return out

    def tracer(frame, event, arg):
        if frame.f_code.co_filename != "<lesson>":
            return tracer
        if event == "line":
            if pending:
                pending["vars"] = snapshot(frame)
                pending["out"] = buf.getvalue()
                steps.append(dict(pending))
            pending.clear()
            pending["line"] = frame.f_lineno
        return tracer

    g = {"__name__": "__lesson__"}
    compiled = compile(code, "<lesson>", "exec")
    sys.settrace(tracer)
    try:
        with redirect_stdout(buf):
            exec(compiled, g)
    finally:
        sys.settrace(None)
    if pending:
        final = {k: repr(v) for k, v in g.items() if not k.startswith("__") and not callable(v)}
        pending["vars"] = final
        pending["out"] = buf.getvalue()
        steps.append(dict(pending))
    lines = code.split("\n")
    for i, s in enumerate(steps):
        if s["line"] in notes:
            s["note"] = notes[s["line"]]
            continue
        text = lines[s["line"] - 1].strip()
        nxt = steps[i + 1]["line"] if i + 1 < len(steps) else None
        entered = nxt == s["line"] + 1
        if text.startswith(("if ", "elif ", "while ")):
            cond = text.split(" ", 1)[1].rstrip(":")
            s["note"] = (f"{cond} is True, so the indented block runs." if entered
                         else f"{cond} is False, so the indented block is skipped.")
        elif text.startswith("for "):
            var = text[4:].split(" in ")[0]
            s["note"] = (f"The loop takes the next value: {var} = {s['vars'].get(var, '?')}." if entered
                         else "There are no values left, so the loop ends.")
    return {"code": code, "steps": steps}


if __name__ == "__main__":
    data = {k: trace(v["code"], v["notes"]) for k, v in TRACES.items()}
    with open("assets/traces.js", "w", encoding="utf-8") as f:
        f.write("/* Generated by tools/make_traces.py. Do not edit by hand. */\n")
        f.write("window.TRACES = " + json.dumps(data, indent=1) + ";\n")
    for k, v in data.items():
        print(k, len(v["steps"]), "steps")
