"""Encode a WGS 84, north-up USGS 3DEP GeoTIFF export in the atlas grid format.

The supplied recorte is returned by USGS 3DEPElevation exportImage for
bbox -155.97,19.15,-155.02,20.18 (EPSG:4326), size 1060,1150, F32 GeoTIFF,
bilinear interpolation. Usage: python3 scripts/build-hawaii-dem.py INPUT.tif
"""
import gzip
import json
import sys
from pathlib import Path

import numpy as np
from osgeo import gdal

gdal.UseExceptions()
dataset = gdal.Open(sys.argv[1])
band = dataset.GetRasterBand(1)
values = band.ReadAsArray()
west, dx, rotation_x, north, rotation_y, dy = dataset.GetGeoTransform()
if dataset.GetSpatialRef().GetAuthorityCode(None) != '4326' or rotation_x or rotation_y or dx <= 0 or dy >= 0:
    raise ValueError('Expected a geographic WGS 84 north-up raster.')
valid = np.isfinite(values) & (values >= -20000) & (values <= 28000)
if band.GetNoDataValue() is not None:
    valid &= values != band.GetNoDataValue()
if not valid.any():
    raise ValueError('The raster has no valid elevations.')
encoded = np.where(valid, np.rint(values), -32768).astype('<i2')
delta = encoded.copy()
delta[:, 1:] = np.diff(encoded, axis=1)
delta[1:, :] = np.diff(delta.copy(), axis=0)
path = Path(__file__).resolve().parents[1] / 'dist/assets/relief-data'
(path / 'hawaii-3dep.bin.gz').write_bytes(gzip.compress(delta.tobytes(), compresslevel=6, mtime=0))
tile = dict(file='hawaii-3dep', projection='geographic', west=west+dx/2, north=north+dy/2, dx=dx,
            dy=-dy, resolution=100, source='usgs3dep', width=dataset.RasterXSize, height=dataset.RasterYSize)
(path / 'hawaii-3dep.json').write_text(json.dumps(tile, indent=2)+'\n', encoding='utf-8')
