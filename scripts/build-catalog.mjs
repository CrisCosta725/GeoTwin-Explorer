import { writeFile } from "node:fs/promises";

import { analogs } from "../dist/assets/analogs.js";

import { hasCoordinates } from "../dist/assets/coordinates.js";

const coordinate = value => value.toFixed(7);

const rows = analogs.map(site => "| " + [ site.catalogNumber, site.name, site.country, site.application, hasCoordinates(site) ? coordinate(site.lat) + ", " + coordinate(site.lon) : "Pendiente", site.elevationM == null ? "—" : site.elevationM + " m · aportada", site.originStatus === "unverified" ? "Origen por verificar" : "Referencia regional" ].join(" | ") + " |");

const details = analogs.map(site => "### " + site.catalogNumber + ". " + site.name + "\n\n" + site.locationNote + "\n\n" + (site.source ? "Fuente: [" + site.organization + "](" + site.source + ")." : site.organization + ".") + (site.reference ? " [" + (site.referenceLabel ?? "Fuente complementaria") + "](" + site.reference + ")." : "") + "\n\n" + (site.limit ?? "La referencia regional requiere comprobar el sector concreto y su escala antes del ensayo.") + "\n");

const text = "# GeoTwin · zonas y ubicaciones\n\nActualización del catálogo: 14 de noviembre de 2026.\n\n" + "La lista conserva el orden, países y aplicaciones principales solicitados por el usuario. Sus aplicaciones son objetivos de comparación; no equivalen a validación científica de cada analogía.\n\n" + "| N.º | Sitio | País | Aplicación principal | Latitud, longitud (grados decimales) | Cota aportada | Alcance |\n" + "| --- | --- | --- | --- | --- | --- | --- |\n" + rows.join("\n") + "\n\n" + "Las coordenadas y cotas de Isabella–Chotén y Sucre fueron aportadas y asignadas por el usuario. Se conservan como datos proporcionados: su datum, referencia vertical, contorno y origen geológico requieren verificación. Las cotas no sustituyen las elevaciones del DEM.\n\n" + "Los demás marcadores son referencias de los sitios y no delimitan parcelas de ensayo ni garantizan una cobertura DEM local de detalle. Nasca–Palpa usa una referencia regional aproximada; La Joya usa el centro calculado del cuadrángulo publicado.\n\n" + details.join("\n");

await writeFile(new URL("../dist/examples/ZONAS_Y_UBICACIONES.md", import.meta.url), text);

console.log("Inventario actualizado: " + analogs.length + " zonas, " + analogs.filter(hasCoordinates).length + " con coordenadas.");
