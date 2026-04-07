#!/usr/bin/env python3
"""Wrap window.elementSdk.init({...}) calls in `if (window.elementSdk) { ... }`."""
import sys
from pathlib import Path

def process(path: Path) -> bool:
    text = path.read_text(encoding="utf-8")
    if "if (window.elementSdk)" in text:
        return False
    if "window.elementSdk.init(" not in text:
        return False

    lines = text.split("\n")
    out = []
    i = 0
    patched = False
    while i < len(lines):
        line = lines[i]
        if not patched and "window.elementSdk.init(" in line and line.lstrip().startswith("window.elementSdk.init("):
            # Insert opening guard
            out.append("if (window.elementSdk) {")
            out.append(line)
            # Track parentheses depth from this line onward to find matching ')'
            depth = 0
            started = False
            j = i
            while j < len(lines):
                cur = lines[j] if j != i else line
                for ch in cur:
                    if ch == "(":
                        depth += 1
                        started = True
                    elif ch == ")":
                        depth -= 1
                if started and depth == 0:
                    break
                j += 1
            # Append lines i+1 .. j inclusive
            for k in range(i + 1, j + 1):
                out.append(lines[k])
            out.append("}")
            i = j + 1
            patched = True
            continue
        out.append(line)
        i += 1

    if not patched:
        return False
    path.write_text("\n".join(out), encoding="utf-8")
    return True

def main():
    files = [Path(p.strip()) for p in sys.stdin if p.strip()]
    count = 0
    for f in files:
        if process(f):
            count += 1
            print(f"patched: {f}")
        else:
            print(f"skipped: {f}", file=sys.stderr)
    print(f"\nTotal patched: {count}")

if __name__ == "__main__":
    main()
