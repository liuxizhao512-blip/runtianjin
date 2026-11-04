"""Repair mojibake left behind by a PowerShell UTF-8 round-trip.

The damage pattern is a CJK codepoint followed by a literal '?', which is what
you get when a multi-byte UTF-8 sequence is decoded as GBK and re-encoded:

    –  (U+2013)  ->  鈥?   (U+9225 + '?')
    →  (U+2192)  ->  鈫?   (U+922B + '?')
    —  (U+2014)  ->  鈥?   (same lead byte as –, so context decides)

Because – and — share a lead byte, the replacement is chosen from context:
a dash between two digits is an en dash, a dash between words is an em dash.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# Lead characters produced by the corruption.
DASH_LEAD = "\u9225"   # 鈥
ARROW_LEAD = "\u922b"  # 鈫

# A dash lead followed by an optional '?' and optional spaces.
DASH_RE = re.compile(re.escape(DASH_LEAD) + r"\??")
ARROW_RE = re.compile(re.escape(ARROW_LEAD) + r"\??")


def fix_dash(match: re.Match[str]) -> str:
    text = match.string
    start, end = match.span()
    before = text[start - 1] if start > 0 else ""
    after = text[end] if end < len(text) else ""
    # Digit on both sides -> en dash (a numeric range such as 5–10).
    if before.isdigit() and after.isdigit():
        return "\u2013"
    # Digit on one side only -> en dash too (e.g. "10–15 minutes").
    if before.isdigit() or after.isdigit():
        return "\u2013"
    # Otherwise it separates words -> em dash.
    return "\u2014"


def repair(text: str) -> tuple[str, int]:
    count = 0
    text, n = ARROW_RE.subn("\u2192", text)
    count += n
    text, n = DASH_RE.subn(fix_dash, text)
    count += n
    return text, count


def main() -> int:
    dry_run = "--dry-run" in sys.argv
    targets = sorted(ROOT.glob("*.html")) + sorted(ROOT.glob("*.js")) + sorted(ROOT.glob("*.css"))
    targets += sorted(ROOT.glob("*.md"))
    total = 0
    for path in targets:
        original = path.read_text(encoding="utf-8")
        fixed, n = repair(original)
        if n:
            print(f"{path.name}: {n} repair(s)")
            if dry_run:
                for old_line, new_line in zip(original.splitlines(), fixed.splitlines()):
                    if old_line != new_line:
                        print(f"  - {old_line.strip()[:100]}")
                        print(f"  + {new_line.strip()[:100]}")
            else:
                path.write_text(fixed, encoding="utf-8")
            total += n
    if not total:
        print("Nothing to repair.")
    else:
        suffix = " (dry run - nothing written)" if dry_run else ""
        print(f"\n{total} repair(s){suffix}.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
