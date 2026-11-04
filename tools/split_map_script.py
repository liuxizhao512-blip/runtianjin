"""Split the single inline <script> in map.html into two external files.

map-data.js  - routeConfigs, sceneryData, sceneryArt (pure data, no DOM)
map-app.js   - everything else (the IIFE that drives the page)

Both files are loaded as classic scripts before the page's own logic runs, so
the data constants stay global exactly as they were when they lived inline.
"""

from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MAP = ROOT / "map.html"

# 1-based line numbers of the inline script body (inclusive), as measured.
SCRIPT_OPEN = 441          # line containing "<script>"
SCRIPT_CLOSE = 2860        # line containing "</script>"
DATA_START = 442           # "const routeConfigs = ["
DATA_END = 767             # closing "};" of sceneryArt

lines = MAP.read_text(encoding="utf-8").splitlines(keepends=True)

assert "<script>" in lines[SCRIPT_OPEN - 1], lines[SCRIPT_OPEN - 1]
assert "</script>" in lines[SCRIPT_CLOSE - 1], lines[SCRIPT_CLOSE - 1]
assert "const routeConfigs" in lines[DATA_START - 1], lines[DATA_START - 1]
assert lines[DATA_END - 1].strip() == "};", repr(lines[DATA_END - 1])

data_body = "".join(lines[DATA_START - 1:DATA_END])
app_body = "".join(lines[DATA_END:SCRIPT_CLOSE - 1])

data_header = (
    "// Route definitions, landmark notes, and inline SVG art for map.html.\n"
    "// Pure data: no DOM access, no side effects. Loaded before map-app.js.\n\n"
)
app_header = (
    "// Interactive logic for map.html: Leaflet mini maps, weather, route\n"
    "// analysis, training plans, and the share card. Depends on the globals\n"
    "// declared in map-data.js.\n\n"
)

(ROOT / "map-data.js").write_text(data_header + data_body, encoding="utf-8")
(ROOT / "map-app.js").write_text(app_header + app_body, encoding="utf-8")

new_tag = (
    '    <script src="map-data.js"></script>\n'
    '    <script src="map-app.js"></script>\n'
)
new_lines = (
    lines[:SCRIPT_OPEN - 1]
    + [new_tag]
    + lines[SCRIPT_CLOSE:]
)
MAP.write_text("".join(new_lines), encoding="utf-8")

print(f"map-data.js  {len(data_body.splitlines()):>5} lines")
print(f"map-app.js   {len(app_body.splitlines()):>5} lines")
print(f"map.html     {len(new_lines):>5} lines (was {len(lines)})")
