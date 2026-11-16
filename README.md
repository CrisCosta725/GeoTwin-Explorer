# GeoTwin Explorer

**Explore Earth to understand the Moon and Mars.**

GeoTwin Explorer is an interactive atlas for exploring Earth, the Moon, and Mars, identifying geological analogs, and comparing terrain using datasets included with the application. It brings study locations, satellite imagery, topographic profiles, and site selection rationales into a single interface.

**[Launch GeoTwin Explorer](https://criscosta725.github.io/GeoTwin-Explorer/)** · [User guide (Spanish)](dist/examples/GUIA_DEMO.md) · [Site catalog (Spanish)](dist/examples/ZONAS_Y_UBICACIONES.md) · [Data sources and credits (Spanish)](dist/examples/DATOS_Y_CREDITOS.md)

## Project Purpose

Visual similarity alone does not establish a scientific analogy between two locations. GeoTwin organizes available observations to explain which characteristics a terrestrial site shares with a lunar or Martian environment, where they differ, and which additional data are needed.

The project supports science communication, comparative research, and study planning for planetary exploration, including geology, resources, surface mobility, landing operations, and potential base locations. Its comparisons help frame research questions and identify areas for further study; they do not certify mission feasibility.

## Key Features

- **Combined planetary view:** interactive Earth, Moon, and Mars spheres with rotation, zoom, and selectable location markers.
- **Study catalog:** 20 terrestrial sites, 17 lunar locations, and 11 Martian locations. The terrestrial catalog includes eight areas in Peru.
- **Site comparisons:** recorded characteristics, analog associations, selection rationales, and limitations of the available evidence.
- **Terrestrial satellite context:** a locally stored NASA image covering 10 × 10 km and an embedded Google Satellite map with an initial view approximately 1 km across, adjusted for latitude and viewport width.
- **Topographic profiles:** terrestrial, lunar, and Martian transects with source, resolution, and elevation reference information.
- **3D astronaut guide:** location-specific explanations, animated gestures, autonomous movement, and drag and keyboard controls.
- **English and Spanish interface**, with installation and offline capabilities through a progressive web app.

## Comparison Criteria

The evaluation framework organizes variables into seven groups. Inclusion in this framework does not imply that measurements are available for every location.

| Group | Variables Considered |
| --- | --- |
| Morphometry | Diameter, depth, slope, circularity, and depth-to-diameter ratio. |
| Topography | Elevation, surface roughness, boulders, and relief. |
| Illumination | Illumination duration, shadows, and solar geometry. |
| Temperature | Maximum and minimum temperatures and thermal variability. |
| Resources | Indicators of hydrogen, ice, and volatiles. |
| Operations | Landing safety, traverse routes, and accessibility. |
| Geology | Basalts, anorthosites, regolith, ejecta, and geological structures. |

## Earth Observation Data

The data discovery resource is [NASA Earthdata Search](https://search.earthdata.nasa.gov/search?lat=9.483263807983967&long=-36.80023005098189&zoom=2.6038155321900227). Local terrain profiles use the following sources:

| Model | Coverage Within the Catalog | Vertical Reference |
| --- | --- | --- |
| [NASA JPL NASADEM HGT v001](https://doi.org/10.5067/MEaSUREs/NASADEM/NASADEM_HGT.001) | 16 terrestrial sites. | EGM96 geoid. |
| [ArcticDEM](https://www.pgc.umn.edu/data/arcticdem/) | Haughton, Askja, and Utqiaġvik, outside NASADEM coverage. | WGS84 ellipsoid. |
| [REMA](https://www.pgc.umn.edu/data/rema/) | McMurdo, outside NASADEM coverage. | WGS84 ellipsoid. |

Each terrestrial site has two 10 km transects. ArcticDEM and REMA ellipsoidal heights are not directly equivalent to NASADEM elevations referenced to EGM96.

The global Earth texture retains the existing ETOPO-derived grid and its provenance record. NASADEM does not provide ocean bathymetry. Local profiles and the global texture serve different purposes and operate at different spatial scales.

NASA context images are distributed locally and remain available offline; their historical dates and resolution are identified in the site details. Google Satellite requires an internet connection, retains its attribution within the embedded map, and displays an approximate extent that changes with zoom and viewport width.

## Lunar and Martian Terrain

Lunar profiles use regional [NASA LRO LOLA](https://pds-geosciences.wustl.edu/missions/lro/lola.htm) data. Their spatial resolution limits the representation of small craters, crater walls, and obstacles.

The Mars globe displays a shaded elevation visualization derived from [NASA PDS MOLA MEGDR](https://pds-geosciences.wustl.edu/missions/mgs/mola.html). Selecting a Martian point displays an approximate elevation relative to the areoid. See the [data sources and credits](dist/examples/DATOS_Y_CREDITOS.md) for resolution and limitations.

## Technology Stack

| Component | Implementation |
| --- | --- |
| User interface | HTML, CSS, and JavaScript with ES modules; no frontend framework. |
| Planetary viewer and profiles | Custom spherical renderer using Canvas 2D, with SVG charts. |
| 3D astronaut | Three.js r160 and WebGL, with a fallback renderer when WebGL is unavailable. |
| NASADEM profile generation | Node.js and GeoTIFF.js. |
| Installation and offline support | PWA, web app manifest, and service worker. |
| Local server | Any static web server; no application backend or custom API. |
| Storage | Local JSON files, JavaScript data modules, and binary files; no database management system. |
| Deployment | GitHub Pages and a GitHub Actions deployment workflow. |

## Running and Developing the Application

To run a local copy of the application, serve `dist` with a static web server. For example, with Python 3:

```sh
python -m http.server 8000 --directory dist
```

Open `http://localhost:8000/` in your browser.

To regenerate the NASADEM profiles, use Node.js 18 or later:

```sh
npm ci --prefix scripts
node scripts/build-earth-profiles.mjs
```

The generator accesses external data sources and requires an internet connection. The deployed application serves prepared datasets from the `dist` directory.

## Installation and Offline Use

GeoTwin can be installed as a progressive web app using the **Install app** button when supported by the browser. After the app has been opened online and its resources have finished downloading, the app shell and previously cached or visited resources remain available offline.

The Google Satellite map and access to external sources require an internet connection. Included NASA imagery and terrain profiles are stored locally for offline access.

## Scope and Limitations

GeoTwin is a comparative research and exploration tool. Its results do not validate landing sites, traverse routes, or scientific analogies. They do not certify an impact origin, the presence of subsurface ice, or a site's suitability for a base.

Study-supplied dimensions, classifications, and selection rationales are distinguished from observations derived from elevation models. A model's nominal resolution is not equivalent to vertical accuracy and does not guarantee boulder detection. Globe colors and shading provide a visual representation of relief; they do not displace the sphere's geometry.

See the [demo guide](dist/examples/GUIA_DEMO.md), [site catalog](dist/examples/ZONAS_Y_UBICACIONES.md), and [data sources, credits, and licenses](dist/examples/DATOS_Y_CREDITOS.md) for each resource's scope and terms of use. These supporting documents are currently in Spanish.
