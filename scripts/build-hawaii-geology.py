"""Build the compact geology asset from WGS84 GeoJSON pages of the Hawaii GIS layer.

Export layer 28 with geometry envelope -156.15,18.87,-154.78,20.33,
inSR=4326, outSR=4326, geometryPrecision=5, orderByFields=objectid,
outFields=objectid,symbol,unit,rock_type,lithology,composition,name and f=geojson.
Use resultRecordCount=1000 and increase resultOffset until the final page.
Source: https://geodata.hawaii.gov/arcgis/rest/services/Terrestrial/MapServer/28
Publication: https://doi.org/10.3133/ofr20071089

Usage: python3 scripts/build-hawaii-geology.py OUTPUT PAGE [PAGE ...]
Requires GDAL with GEOS. Pass pages in query order.
"""
import gzip
import json
import re
import sys
from pathlib import Path

from osgeo import ogr

output, *paths = sys.argv[1:]
pages = [json.loads(Path(path).read_text(encoding='utf-8')) for path in paths]
if not pages or pages[-1].get('exceededTransferLimit'):
    raise ValueError('The official query has more pages.')
features = [f for page in pages for f in page['features']]
if not features or len(features) != len({feature['id'] for feature in features}):
    raise ValueError('Missing or repeated feature records.')
groups = {}
def polygons(g):
    if g.GetGeometryName() == 'POLYGON':
        yield g
    elif g.GetGeometryName() in ('MULTIPOLYGON', 'GEOMETRYCOLLECTION'):
        for part in g:
            yield from polygons(part)
def rounded(g):
    return [[[round(x, 5), round(y, 5)] for x, y, *_ in ring.GetPoints()] for ring in g]
for feature in features:
    p = feature['properties']
    code, formation, rock, composition, lithology = ((p[k] or '').strip() for k in
        ('symbol', 'name', 'rock_type', 'composition', 'lithology'))
    if not rock or rock.lower() in {'n/a', 'open water', 'waiakea pond, wailoa river'}:
        continue
    key = (code, formation, rock, composition, lithology)
    if key not in groups:
        groups[key] = ogr.Geometry(ogr.wkbMultiPolygon)
    g = ogr.CreateGeometryFromJson(json.dumps(feature['geometry']))
    if not g.IsValid():
        g = g.MakeValid()
    for part in polygons(g):
        if not part.IsEmpty():
            groups[key].AddGeometry(part)

out = []
masks = {key: ogr.Geometry(ogr.wkbMultiPolygon) for key in ('mapped', 'marius-basalt', 'ulysses-scoria')}
for (code, formation, rock, composition, lithology), collection in sorted(groups.items()):
    united = collection.UnionCascaded()
    for part in polygons(united):
        if part.GetArea() <= 0:
            continue
        west, east, south, north = part.GetEnvelope()
        out.append([code, formation, rock, composition, lithology, [west, south, east, north], rounded(part)])
        masks['mapped'].AddGeometry(part)
        if rock == 'Lava flows' and re.search(r'\bbasalt\b', composition, re.I):
            masks['marius-basalt'].AddGeometry(part)
        if re.search(r'\b(?:scoria cones?|cinder cones?)\b', rock, re.I):
            masks['ulysses-scoria'].AddGeometry(part)

def tiles(geometry):
    west, east, south, north = geometry.GetEnvelope()
    for x in range(int(west*10)-1, int(east*10)+1):
        for y in range(int(south*10), int(north*10)+1):
            ring = ogr.Geometry(ogr.wkbLinearRing)
            for a, b in [(x,y), (x+1,y), (x+1,y+1), (x,y+1), (x,y)]:
                ring.AddPoint_2D(a/10, b/10)
            rect = ogr.Geometry(ogr.wkbPolygon)
            rect.AddGeometry(ring)
            cut = geometry.Intersection(rect)
            yield from polygons(cut)

summary = {}
for key, collection in masks.items():
    combined = collection.UnionCascaded()
    summary[key] = []
    for part in tiles(combined):
        if part.GetArea() > 0:
            west, east, south, north = part.GetEnvelope()
            summary[key].append([[west, south, east, north], rounded(part)])
    print(key, len(summary[key]), flush=True)
print(len(out), 'parts and', len(groups), 'units')
raw=json.dumps({'units': out, 'masks': summary},ensure_ascii=False,separators=(',',':')).encode()
Path(output).write_bytes(gzip.compress(raw, mtime=0))
