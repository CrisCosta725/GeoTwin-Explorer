export const marsOperations = Object.fromEntries([ [ "arcadia-ap1", "AP-1", "Alta prioridad", "Alta prioridad de estudio", "Hielo y recursos" ], [ "arcadia-ap8", "AP-8", "Favorable en el área estudiada", "Posible", "Criogeomorfología" ], [ "arcadia-ap9", "AP-9", "Favorable en el área estudiada", "Posible", "Hielo y perforación" ], [ "deuteronilus", "Deuteronilus Mensae", "Desfavorable en lóbulos", "Condicional", "Glaciología" ], [ "jezero", "Jezero", "Solo sectores seleccionados", "Condicional", "Astrobiología" ], [ "meridiani", "Meridiani–Eagle", "Planicie regional", "Posible", "Sedimentología" ], [ "phoenix", "Phoenix", "Históricamente viable", "Condicional", "Permafrost" ], [ "olympus", "Olympus Mons", "Desfavorable en sectores volcánicos", "No prioritario", "Volcanología" ], [ "ulysses", "Ulysses Colles", "Pendiente de delimitación", "No prioritario", "Volcanismo explosivo" ], [ "gale", "Gale", "Sectores seleccionados", "Condicional", "Estratigrafía" ], [ "firsoff", "Firsoff", "Pendiente de evaluación", "Condicional", "Volcanismo de lodo y fluidos" ] ].map(([id, name, landing, habitat, laboratory]) => [ id, {
  id: id,
  name: name,
  landing: landing,
  habitat: habitat,
  laboratory: laboratory,
  status: "Valoración aportada · pendiente de verificación operativa"
} ]));
