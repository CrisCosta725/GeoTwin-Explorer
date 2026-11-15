"""Build the atlas elevation grids from downloaded source products.

Usage: python3 scripts/build-relief.py INPUT_DIR
Requires numpy and GDAL Python bindings. INPUT_DIR holds the NASA PDS
LDEM_16 and MEGT90N000EB images (moon16.img and mars16.img), NOAA
etopo5.nc, LOLA ldem_875s_20m.img with its detached label, sites.json,
and any optional local Copernicus DEM tiles in INPUT_DIR/copernicus.
Adjacent tiles in INPUT_DIR/copernicus-extra use names like atacama-west.tif.
Optional Copernicus GLO-30 tiles go in INPUT_DIR/copernicus30 with the
same names. Optional geographic USGS HRSC/MOLA crops use the site ID
followed by -hrsc.tif. Optional NASA PGDA crops use filenames
cabeus-polar.tif, malapert-polar.tif and malapert-detail.tif.
Use ldem_64.img (NASA PDS) for regional terrain around Marius Hills.
Optional local elevation products: Site04_final_adj_5mpp_surf.tif
(NASA PGDA LOLA) and M20_JezeroCrater_CTXDEM_20m.tif (USGS Astrogeology).
"""
import gzip
import json
import sys
from pathlib import Path

import numpy as np
from osgeo import gdal

gdal.UseExceptions()
root = Path(sys.argv[1])
output = Path(__file__).resolve().parents[1] / "dist/assets/relief-data"
output.mkdir(parents=True, exist_ok=True)
sites = json.loads((root / "sites.json").read_text())
manifest = {}


def grid(file, width, height, dtype):
    return np.memmap(root / file, mode="r", dtype=dtype, shape=(height, width))


def save(name, values, geometry):
    values = np.rint(values)
    valid = np.isfinite(values) & (values >= -20000) & (values <= 28000)
    encoded = np.where(valid, values, -32768).astype("<i2")
    delta = np.empty_like(encoded)
    delta[:, 0] = encoded[:, 0]
    delta[:, 1:] = np.diff(encoded, axis=1)
    delta[1:, :] = np.diff(delta, axis=0)
    (output / f"{name}.bin.gz").write_bytes(gzip.compress(delta.tobytes(), compresslevel=6, mtime=0))
    return dict(geometry, file=name, width=values.shape[1], height=values.shape[0])


def save_global(name, values, geometry):
    height, width = values.shape
    chunk = round(45/geometry["dx"])
    for y in range(0,height,chunk):
        for x in range(0,width,chunk):
            save(f"{name}-{x//chunk}-{y//chunk}", values[y:y+chunk,x:x+chunk], {})
    return dict(geometry, file=name, width=width, height=height, chunk=chunk)


noaa = gdal.Open(str(root / "etopo5.nc"))
earth = noaa.ReadAsArray()[:, :-1]
manifest["Earth"] = {"base": save_global("earth", earth, {
    "projection":"geographic", "west":-180, "north":90, "dx":1/12, "dy":1/12,
    "periodic":True, "resolution":9266, "source":"etopo"}), "local":[]}

for body, filename, byte_order, source, resolution, factor in [
    ("Moon", "moon16.img", "<i2", "lola", 1895, .5),
    ("Mars", "mars16.img", ">i2", "mola", 3706, 1),
]:
    arr = grid(filename,5760,2880,byte_order)
    step = 1/16
    manifest[body] = {"base": save_global(body.lower(), arr*factor, {
        "projection":"geographic", "west":step/2, "north":90-step/2, "dx":step, "dy":step,
        "periodic":True, "resolution":resolution, "source":source}), "local":[]}

for site in sites["Earth"]:
    path = root / "copernicus" / f'{site["id"]}.tif'
    if not path.exists():
        continue
    ds = gdal.Open(str(path))
    neighbors = sorted((root / "copernicus-extra").glob(f'{site["id"]}-*.tif'))
    if neighbors:
        ds = gdal.BuildVRT("", [str(tile) for tile in [*neighbors, path]])
    t = ds.GetGeoTransform()
    dx, dy = t[1], -t[5]
    col = int((site["lon"]-t[0])/dx)
    row = int((t[3]-site["lat"])/dy)
    x, y = max(0,col-240),max(0,row-240)
    w, h = min(ds.RasterXSize-x,col+241-x), min(ds.RasterYSize-y,row+241-y)
    if min(w,h)<5:
        continue
    values = ds.ReadAsArray(x,y,w,h)
    manifest["Earth"]["local"].append(save(site["id"], values, {
        "projection":"geographic", "west":t[0]+(x+.5)*dx, "north":t[3]-(y+.5)*dy,
        "dx":dx, "dy":dy, "resolution":90, "source":"copernicus"}))

for site in sites["Earth"]:
    name = site["id"]
    directory = root / "copernicus30"
    path = directory / f"{name}.tif"
    if not path.exists():
        continue
    neighbors = sorted(directory.glob(f"{name}-*.tif"))
    ds = (gdal.BuildVRT("", [str(tile) for tile in [*neighbors, path]])
          if neighbors else gdal.Open(str(path)))
    west, dx, _, north, _, dy = ds.GetGeoTransform()
    col = int((site["lon"]-west)/dx)
    row = int((site["lat"]-north)/dy)
    # Keep a 12 km window, accounting for the east–west spacing at this latitude.
    half_width = int(6000 / (111195*dx*np.cos(np.deg2rad(site["lat"]))))+2
    half_height = int(6000 / (111195*-dy))+2
    x, y = max(0,col-half_width), max(0,row-half_height)
    width = min(ds.RasterXSize,col+half_width+1)-x
    height = min(ds.RasterYSize,row+half_height+1)-y
    values = ds.ReadAsArray(x,y,width,height)
    manifest["Earth"]["local"].append(save(f"{name}-glo30", values, {
        "projection":"geographic", "west":west+(x+.5)*dx, "north":north+(y+.5)*dy,
        "dx":dx, "dy":-dy, "resolution":30, "source":"copernicus30"}))

polar = gdal.Open(str(root / "ldem_875s_20m.lbl"))
t = polar.GetGeoTransform()
x = y = 2768
size = 2048
manifest["Moon"]["local"].append(save("shackleton", polar.ReadAsArray(x,y,size,size)*.5, {
    "projection":"south-pole", "west":t[0]+(x+.5)*20, "north":t[3]-(y+.5)*20,
    "dx":20, "dy":20, "resolution":20, "source":"lolaPolar"}))

extra = root / "regional.json"
if extra.exists():
    for item in json.loads(extra.read_text()):
        values = grid(item["input"],item["width"],item["height"],item["dtype"])*item["factor"]
        geometry = {k:item[k] for k in ("projection","west","north","dx","dy","resolution","source")}
        manifest[item["world"]]["local"].append(save(item["id"],values,geometry))

if (root / "ldem_64.img").exists():
    step = 1 / 64
    row = int((90 - 14.10) / step) - 128
    col = int(303.26 / step) - 128
    lola64 = grid("ldem_64.img", 23040, 11520, "<i2")
    values = lola64[row:row+256, col:col+256] * .5
    manifest["Moon"]["local"].append(save("marius-lola", values, {
        "projection":"geographic", "west":(col+.5)*step, "north":90-(row+.5)*step,
        "dx":step, "dy":step, "resolution":474, "source":"lolaRegional"}))

for world, filename, name, source, projection, resolution in [
    ("Moon", "Site04_final_adj_5mpp_surf.tif", "shackleton-rim", "lolaShackleton", "south-pole", 5),
    ("Moon", "cabeus-polar.tif", "cabeus-polar", "lolaAdjustedPolar", "south-pole", 20),
    ("Moon", "malapert-polar.tif", "malapert-polar", "lolaAdjustedPolar", "south-pole", 20),
    ("Moon", "malapert-detail.tif", "malapert-detail", "lolaMalapert", "south-pole", 5),
    ("Moon", "mons-mouton-polar.tif", "mons-mouton-polar", "lolaAdjustedPolar", "south-pole", 20),
    ("Moon", "connecting-ridge-polar.tif", "connecting-ridge-polar", "lolaAdjustedPolar", "south-pole", 20),
    ("Mars", "M20_JezeroCrater_CTXDEM_20m.tif", "jezero-ctx", "ctxJezero", "equirectangular", 20),
]:
    path = root / filename
    if not path.exists():
        continue
    ds = gdal.Open(str(path))
    west, dx, skew_x, north, skew_y, dy = ds.GetGeoTransform()
    if (dx, dy, skew_x, skew_y) != (resolution, -resolution, 0, 0):
        raise ValueError(f"Unexpected grid spacing or orientation in {filename}")
    geometry = dict(projection=projection, west=west+dx/2, north=north+dy/2,
                    dx=dx, dy=-dy, resolution=resolution, source=source)
    if projection == "equirectangular":
        srs = ds.GetSpatialRef()
        geometry.update(radius=srs.GetSemiMajor(), standardParallel=srs.GetProjParm("standard_parallel_1"))
    manifest[world]["local"].append(save(name, ds.ReadAsArray(), geometry))

for name in ["meridiani", "phoenix", "olympus", "ulysses", "gale", "firsoff", "arcadia-ap1", "arcadia-ap8", "arcadia-ap9", "deuteronilus"]:
    path = root / f"{name}-hrsc.tif"
    if not path.exists():
        continue
    ds = gdal.Open(str(path))
    west, dx, skew_x, north, skew_y, dy = ds.GetGeoTransform()
    if not ds.GetSpatialRef().IsGeographic() or skew_x or skew_y or dx <= 0 or dy >= 0:
        raise ValueError(f"Unexpected geographic grid in {path.name}")
    manifest["Mars"]["local"].append(save(f"{name}-hrsc", ds.ReadAsArray(), {
        "projection":"geographic", "west":west+dx/2, "north":north+dy/2,
        "dx":dx, "dy":-dy, "resolution":200, "source":"hrscMola"}))

(output / "index.json").write_text(json.dumps(manifest,separators=(",",":"))+"\n")
for world,item in manifest.items():
    print(world, item["base"]["width"], item["base"]["height"], [tile["file"] for tile in item["local"]])
