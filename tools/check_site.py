"""Zero-dependency sanity checks for the Run Tianjin static site.

Run with:  python tools/check_site.py

Checks performed
----------------
1. Every local href/src referenced by an HTML page exists on disk.
2. Every <script src> and <link href> resolves (no stale filenames).
3. Every page has a skip link, a <main id="main">, and a nav mount point.
4. Every page declares a viewport meta tag and a <title>.
5. Every JS file parses (via node --check when node is available).
6. No page still references a file that was moved to _image-backup/.
7. site.webmanifest icons all exist.

Exit code is 0 when everything passes, 1 otherwise.
"""

from __future__ import annotations

import json
import re
import shutil
import subprocess
import sys
from pathlib import Path
from urllib.parse import unquote, urlparse

ROOT = Path(__file__).resolve().parent.parent
PAGES = sorted(ROOT.glob("*.html"))
# nav.html is a fragment injected into #site-header, not a standalone page.
FRAGMENTS = {"nav.html"}
FULL_PAGES = [p for p in PAGES if p.name not in FRAGMENTS]

failures: list[str] = []
checks = 0


def fail(message: str) -> None:
    failures.append(message)


def ok() -> None:
    global checks
    checks += 1


def local_target(ref: str) -> str | None:
    """Return the on-disk relative path for a local reference, else None."""
    ref = ref.strip()
    if not ref or ref.startswith(("#", "data:", "mailto:", "tel:", "javascript:")):
        return None
    # Skip JS template placeholders such as ${route.image || ''}.
    if "${" in ref:
        return None
    parsed = urlparse(ref)
    if parsed.scheme in ("http", "https"):
        return None
    path = unquote(parsed.path)
    if not path:
        return None
    return path.lstrip("/")


ATTR_RE = re.compile(r'(?:href|src)\s*=\s*"([^"]*)"', re.IGNORECASE)


def check_references() -> None:
    for page in PAGES:
        html = page.read_text(encoding="utf-8")
        for ref in ATTR_RE.findall(html):
            target = local_target(ref)
            if target is None:
                continue
            resolved = (page.parent / target).resolve()
            if not resolved.exists():
                fail(f"{page.name}: missing reference -> {ref}")
            else:
                ok()


def check_page_structure() -> None:
    for page in FULL_PAGES:
        html = page.read_text(encoding="utf-8")
        name = page.name

        if 'class="skip-link"' not in html:
            fail(f"{name}: no skip link")
        else:
            ok()

        if not re.search(r'<main[^>]*id="main"', html):
            fail(f"{name}: no <main id=\"main\">")
        else:
            ok()

        if 'id="site-header"' not in html:
            fail(f"{name}: no #site-header mount point")
        else:
            ok()

        if 'name="viewport"' not in html:
            fail(f"{name}: no viewport meta tag")
        else:
            ok()

        if not re.search(r"<title>[^<]+</title>", html):
            fail(f"{name}: no <title>")
        else:
            ok()

        # The skip link must point at the main landmark.
        if 'class="skip-link"' in html and 'href="#main"' not in html:
            fail(f"{name}: skip link does not target #main")
        else:
            ok()


def check_manifest() -> None:
    manifest_path = ROOT / "site.webmanifest"
    if not manifest_path.exists():
        fail("site.webmanifest is missing")
        return
    try:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        fail(f"site.webmanifest is not valid JSON: {exc}")
        return
    ok()
    for icon in manifest.get("icons", []):
        src = icon.get("src", "")
        if not src:
            continue
        if not (ROOT / src).exists():
            fail(f"site.webmanifest: icon missing -> {src}")
        else:
            ok()


def check_no_backup_refs() -> None:
    """Flag pages that point at a file which only exists in the backup folder.

    _image-backup/originals/ holds copies of files that are still live, so a
    name appearing there is not by itself a problem. Only report a reference
    when the file is absent from the site root but present in the backup.
    """
    backup = ROOT / "_image-backup"
    if not backup.exists():
        return
    archived = {
        p.name for p in backup.rglob("*") if p.is_file() and not (ROOT / p.name).exists()
    }
    if not archived:
        return
    for page in PAGES:
        html = page.read_text(encoding="utf-8")
        for name in archived:
            if name in html:
                fail(f"{page.name}: references archived file -> {name}")
            else:
                ok()


def check_js_syntax() -> None:
    node = shutil.which("node")
    if not node:
        print("  (node not found - skipping JS syntax check)")
        return
    for script in sorted(ROOT.glob("*.js")):
        result = subprocess.run(
            [node, "--check", str(script)],
            capture_output=True,
            text=True,
        )
        if result.returncode != 0:
            detail = (result.stderr or result.stdout).strip().splitlines()
            fail(f"{script.name}: syntax error -> {detail[0] if detail else 'unknown'}")
        else:
            ok()


def check_no_duplicate_ids() -> None:
    id_re = re.compile(r'\sid="([^"]+)"')
    for page in FULL_PAGES:
        html = page.read_text(encoding="utf-8")
        seen: set[str] = set()
        for value in id_re.findall(html):
            if value in seen:
                fail(f"{page.name}: duplicate id -> {value}")
            else:
                seen.add(value)
                ok()


def check_no_mojibake() -> None:
    """Catch UTF-8 text that was decoded as GBK and re-encoded.

    The tell-tale is a CJK codepoint in the U+9200 block followed by '?', or a
    literal replacement character. These appear when a multi-byte sequence is
    mangled by a non-UTF-8 round-trip.
    """
    bad_chars = ("\u9225", "\u922b", "\u95b3", "\ufffd")
    for path in sorted(ROOT.glob("*")):
        if path.suffix.lower() not in (".html", ".js", ".css", ".md", ".json", ".webmanifest"):
            continue
        text = path.read_text(encoding="utf-8", errors="replace")
        for number, line in enumerate(text.splitlines(), start=1):
            if any(ch in line for ch in bad_chars):
                fail(f"{path.name}:{number}: mojibake -> {line.strip()[:70]}")
            else:
                ok()


def main() -> int:
    print(f"Checking {len(PAGES)} pages in {ROOT.name}\n")
    check_references()
    check_page_structure()
    check_manifest()
    check_no_backup_refs()
    check_no_duplicate_ids()
    check_no_mojibake()
    check_js_syntax()

    print(f"{checks} checks passed")
    if failures:
        print(f"\n{len(failures)} problem(s):")
        for item in failures:
            print(f"  - {item}")
        return 1
    print("All good.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
