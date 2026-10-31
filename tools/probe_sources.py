import urllib.request
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "probe_result.txt"

tests = {
    'openverse': 'https://api.openverse.org/v1/images/?q=tianjin&page_size=2',
    'pixabay': 'https://pixabay.com/api/?key=demo&q=tianjin',
    'wikidata': 'https://www.wikidata.org/w/api.php?action=wbsearchentities&search=Tianjin%20Eye&language=en&format=json',
    'dbpedia': 'https://dbpedia.org/data/Tianjin_Eye.json',
    'unsplash_img': 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=200',
    'pexels_img': 'https://images.pexels.com/photos/1007426/pexels-photo-1007426.jpeg?w=200',
    'pixabay_img': 'https://cdn.pixabay.com/photo/2016/11/29/05/45/astronomy-1867616_640.jpg',
}

lines = []
for k, u in tests.items():
    try:
        req = urllib.request.Request(u, headers={'User-Agent': 'Mozilla/5.0'})
        d = urllib.request.urlopen(req, timeout=15).read()
        lines.append(f'{k:14} OK   {len(d)} bytes')
    except Exception as e:
        lines.append(f'{k:14} ERR  {type(e).__name__}: {str(e)[:70]}')

OUT.write_text('\n'.join(lines), encoding='utf-8')
print('\n'.join(lines))
