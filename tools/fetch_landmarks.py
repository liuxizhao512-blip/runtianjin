# -*- coding: utf-8 -*-
"""Fetch real landmark photos via Bing image search, one distinct image per landmark."""
import hashlib
import os
import re
import ssl
import urllib.parse
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT, "images", "landmarks")
os.makedirs(OUT_DIR, exist_ok=True)

UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")

CTX = ssl.create_default_context()
CTX.check_hostname = False
CTX.verify_mode = ssl.CERT_NONE

TARGETS = [
    ("tianjin-eye",         "天津之眼 摩天轮 夜景"),
    ("jiefang-bridge",      "天津解放桥 海河"),
    ("jinwan-plaza",        "天津津湾广场"),
    ("cuiping-hill",        "天津南翠屏公园"),
    ("cuiping-ski",         "南翠屏公园 滑雪"),
    ("water-park-westlake", "天津水上公园 湖"),
    ("tianjin-zoo",         "天津动物园 大门"),
    ("water-park-eastdock", "天津水上公园 游船"),
    ("teda-stadium",        "泰达足球场"),
    ("teda-msd",            "天津泰达 MSD"),
    ("beihai-road",         "天津滨海新区 街景"),
]

HEADERS = {
    "User-Agent": UA,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
}

used_hashes = set()


def http_get(url, timeout=25, referer=None):
    headers = dict(HEADERS)
    if referer:
        headers["Referer"] = referer
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=timeout, context=CTX) as resp:
        return resp.read()


def search_image_urls(query, limit=20):
    url = "https://cn.bing.com/images/search?q=" + urllib.parse.quote(query)
    try:
        html = http_get(url).decode("utf-8", "ignore")
    except Exception as exc:  # noqa: BLE001
        return [], "search failed: %s" % exc
    found = re.findall(r'murl&quot;:&quot;(.*?)&quot;', html)
    if not found:
        found = re.findall(r'"murl":"(.*?)"', html)
    cleaned = []
    for item in found:
        item = item.replace("\\/", "/")
        if item.startswith("http") and item not in cleaned:
            cleaned.append(item)
    return cleaned[:limit], "ok"


def looks_like_image(data):
    if len(data) < 15000:
        return False
    head = data[:16]
    if head[:3] == b"\xff\xd8\xff":
        return True
    if head[:8] == b"\x89PNG\r\n\x1a\n":
        return True
    if head[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return True
    return False


def ext_for(data):
    if data[:3] == b"\xff\xd8\xff":
        return ".jpg"
    if data[:8] == b"\x89PNG\r\n\x1a\n":
        return ".png"
    if data[:4] == b"RIFF":
        return ".webp"
    return ".jpg"


def main():
    log = []
    for slug, query in TARGETS:
        urls, status = search_image_urls(query)
        log.append("[%s] q=%s -> %s (%d urls)" % (slug, query, status, len(urls)))
        saved = False
        for candidate in urls:
            try:
                data = http_get(candidate, timeout=20, referer="https://cn.bing.com/")
            except Exception as exc:  # noqa: BLE001
                log.append("    skip %s (%s)" % (candidate[:60], type(exc).__name__))
                continue
            if not looks_like_image(data):
                log.append("    not-image %s (%d B)" % (candidate[:60], len(data)))
                continue
            digest = hashlib.md5(data).hexdigest()
            if digest in used_hashes:
                log.append("    dup %s" % candidate[:60])
                continue
            used_hashes.add(digest)
            path = os.path.join(OUT_DIR, slug + ext_for(data))
            with open(path, "wb") as fh:
                fh.write(data)
            log.append("    SAVED %s (%d B) <- %s" % (os.path.basename(path), len(data), candidate[:70]))
            saved = True
            break
        if not saved:
            log.append("    !! NO IMAGE for %s" % slug)
    with open(os.path.join(ROOT, "fetch_log.txt"), "w", encoding="utf-8") as fh:
        fh.write("\n".join(log))
    print("done")


if __name__ == "__main__":
    main()
