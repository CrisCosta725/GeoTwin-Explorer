# GeoTwin Explorer

An interactive atlas for exploring Earth, Moon, and Mars, finding geological analogs, and comparing terrain with included datasets.

**[Open GeoTwin Explorer](https://criscosta725.github.io/GeoTwin-Explorer/)** · [Guía en español](dist/examples/GUIA_DEMO.md) · [Data sources and credits](dist/examples/DATOS_Y_CREDITOS.md)

The web app is installable as a Progressive Web App from its in-app **Install app** button when supported by the browser. After opening it online once, the app shell and previously visited resources remain available offline.

GeoTwin is a comparative research and exploration tool. Results do not validate landing sites, routes, or scientific analogies. Consult the [demo guide](dist/examples/GUIA_DEMO.md) and [catalog](dist/examples/ZONAS_Y_UBICACIONES.md) for scope and limitations.

Earth observation resource: [NASA Earthdata Search](https://search.earthdata.nasa.gov/search?lat=9.483263807983967&long=-36.80023005098189&zoom=2.6038155321900227). Local terrain profiles now use [NASA JPL NASADEM HGT v001](https://doi.org/10.5067/MEaSUREs/NASADEM/NASADEM_HGT.001), with two 10 km transects for each of 16 covered Earth sites, including all eight Peruvian sites. Four high-latitude sites are outside coverage. To rebuild, run `npm ci --prefix scripts` and then `node scripts/build-earth-profiles.mjs` with Node.js 18 or later; downloads use the public Planetary Computer copy and are cached outside the distributable app. The global Earth texture retains the existing ETOPO-derived grid and its provenance; NASADEM does not provide ocean bathymetry.
