# -*- coding: utf-8 -*-
"""Clean up temp files and verify landmark images exist."""
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LM = os.path.join(ROOT, "images", "landmarks")

TEMP = [
    "probe2.txt", "probe3.txt", "probe_out.txt", "probe_err.txt",
    "probe_result.txt", "run_out.txt", "fetch_log.txt", "ls.txt",
    "_ls.txt", "cleanup_report.txt",
    "images/landmarks/water-park-westlake.jpg",
]

report = []
for rel in TEMP:
    path = os.path.join(ROOT, rel.replace("/", os.sep))
    if os.path.exists(path):
        try:
            os.remove(path)
            report.append("removed %s" % rel)
        except Exception as exc:  # noqa: BLE001
            report.append("FAILED %s (%s)" % (rel, exc))
    else:
        report.append("absent  %s" % rel)

report.append("")
report.append("--- images/landmarks ---")
if os.path.isdir(LM):
    for name in sorted(os.listdir(LM)):
        size = os.path.getsize(os.path.join(LM, name))
        report.append("%-28s %8d bytes" % (name, size))
else:
    report.append("MISSING DIRECTORY")

with open(os.path.join(ROOT, "_cleanup.txt"), "w", encoding="utf-8") as fh:
    fh.write("\n".join(report))
print("done")
