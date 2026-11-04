"""Repair the mojibake in tips.html using knowledge.js as the source of truth.

The corruption predates this session: a UTF-8 en dash / arrow / em dash was
decoded as GBK and re-encoded, leaving a CJK lead character followed by '?'.
The trailing digit of each range was also swallowed, so the damaged text cannot
be repaired by character substitution alone - each string is restored from the
matching passage in knowledge.js, which is intact.
"""

from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TIPS = ROOT / "tips.html"

# (damaged fragment, correct fragment). Ordered longest-first so that a short
# pattern never eats part of a longer one.
REPAIRS = [
    # Numeric ranges - the second number was lost, restored from knowledge.js.
    ("5\u9225?0 min", "5\u201310 min"),
    ("8\u9225?0 min", "8\u201310 min"),
    ("5\u9225?0 minutes", "5\u201310 minutes"),
    ("10\u9225?5 minutes", "10\u201315 minutes"),
    ("5\u9225? minutes", "5\u201310 minutes"),
    ("15\u9225?0 seconds", "15\u201320 seconds"),
    ("600\u9225?00 km", "600\u2013800 km"),
    # Effort / heart-rate table cells.
    ("3\u9225? / 10", "3\u20134 / 10"),
    ("60\u9225?0% max", "60\u201370% max"),
    ("6\u9225? / 10", "6\u20137 / 10"),
    ("80\u9225?8% max", "80\u201388% max"),
    ("4\u9225? / 10", "4\u20135 / 10"),
    ("65\u9225?5% max", "65\u201375% max"),
    ("8\u9225? / 10", "8\u20139 / 10"),
    # Arrows in the "local-link" anchors.
    ("Run \u922b?/a>", "Run \u2192</a>"),
    ("Path \u922b?/a>", "Path \u2192</a>"),
    ("Loop \u922b?/a>", "Loop \u2192</a>"),
    # Em dash in the Q&A lead paragraph.
    ("conditions \u9225?answers", "conditions \u2014 answers"),
]


def main() -> None:
    text = TIPS.read_text(encoding="utf-8")
    original = text
    applied = 0
    for damaged, correct in REPAIRS:
        if damaged in text:
            text = text.replace(damaged, correct)
            applied += 1
        else:
            print(f"  (not found) {damaged!r}")

    # Strip a stray UTF-8 BOM that a PowerShell round-trip introduced.
    if text.startswith("\ufeff"):
        text = text[1:]
        print("  removed BOM")

    if text != original:
        TIPS.write_text(text, encoding="utf-8")
    print(f"{applied}/{len(REPAIRS)} patterns repaired")

    # Report anything still damaged.
    leftovers = [
        line.strip()
        for line in text.splitlines()
        if any(ch in line for ch in ("\u9225", "\u922b", "\u95b3"))
    ]
    if leftovers:
        print(f"\n{len(leftovers)} line(s) still damaged:")
        for line in leftovers:
            print(f"  {line[:110]}")
    else:
        print("No damaged characters remain.")


if __name__ == "__main__":
    main()
