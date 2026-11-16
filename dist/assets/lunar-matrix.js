const suppliedCoordinates = {
  CSN215: {
    lat: -67.5982,
    lon: 32.792
  },
  CSN216: {
    lat: -64.436,
    lon: 22.6303
  },
  CSN217: {
    lat: -63.6761,
    lon: 24.1139
  },
  CSN218: {
    lat: -64.0839,
    lon: 19.6388
  },
  CSN202: {
    lat: -62.5883,
    lon: 331.6076 - 360,
    originalLongitude: 331.6076
  },
  CSN201: {
    lat: -60.7218,
    lon: 327.6966 - 360,
    originalLongitude: 327.6966
  },
  CSE37: {
    lat: 13.9767,
    lon: 312.3557 - 360,
    originalLongitude: 312.3557
  },
  CSE47: {
    lat: 16.3314,
    lon: 312.6483 - 360,
    originalLongitude: 312.6483
  },
  CSE03: {
    lat: -24.2276,
    lon: 335.3208 - 360,
    originalLongitude: 335.3208
  },
  CSE16: {
    lat: -6.9516,
    lon: 50.4371
  },
  CSE07: {
    lat: -.8143,
    lon: 15.4192
  },
  CSC13: {
    lat: 23.7299,
    lon: 312.5099 - 360,
    originalLongitude: 312.5099
  },
  CSC16: {
    lat: 4.181,
    lon: 3.5988
  },
  CSC25: {
    lat: 16.2593,
    lon: 15.9294
  },
  CSC19: {
    lat: 21.7342,
    lon: 17.9204
  },
  CSC06: {
    lat: -79.40668,
    lon: 24.04089
  }
};

export const lunarMatrix = [ {
  period: "Nectárico",
  purpose: "Laboratorio de evolución y degradación",
  rows: [ [ "Manzinus T", "CSN215", 21.29, 1.929, "Tazón", null, "Referencia para estudiar una estructura de mayor diámetro con borde irregular." ], [ "Manzinus L", "CSN216", 18.11, 1.054, "Tazón" ], [ "Mutus H", "CSN217", 20.23, 1.675, "Tazón" ], [ "Manzinus F", "CSN218", 17.5, 2.289, "Tazón", null, "Comparar la profundidad relativa con otros cráteres de diámetro parecido." ], [ "Scheiner G", "CSN202", 13.6, 1.586, "Cono", null, "Incorporar una morfología registrada como cono a la comparación." ], [ "Scheiner D", "CSN201", 17.61, 1.888, "Tazón" ] ]
}, {
  period: "Eratosteniano",
  purpose: "Laboratorio de vulcanismo y modificación superficial",
  rows: [ [ "Marius C", "CSE37", 11.92, 1.369, "Tazón", "Mar lunar", "Referencia morfológica de tazón en un entorno volcánico." ], [ "Marius B", "CSE47", 15.44, 1.479, "Embudo", "Mar lunar", "Comparar una estructura de embudo en el mismo entorno regional." ], [ "König", "CSE03", 23.52, 1.626, "Embudo", "Mar lunar", "Comparar diferencias de geometría en un cráter de mayor diámetro en terrenos de mare." ], [ "Ibn Battuta", "CSE16", 12.52, 1.164, "Tazón", "Mar lunar" ], [ "Theon Senior", "CSE07", 18.62, 2.94, "Cono", "Tierras altas" ] ]
}, {
  period: "Copernicano",
  purpose: "Laboratorio de impactos recientes y exposición de materiales profundos",
  rows: [ [ "Aristarchus", "CSC13", 63.02, 3.479, "Tazón", null, "El posible pico central, las paredes escalonadas, los materiales excavados y el contexto volcánico. Estos rasgos aún deben verificarse." ], [ "Triesnecker", "CSC16", 25.91, 1.801, "Tazón", null, "Estudiar morfología de impacto." ], [ "Menelaus", "CSC25", 26.81, 2.906, "Embudo" ], [ "Bessel", "CSC19", 15.33, 1.288, "Tazón" ], [ "CSC06", "CSC06", 10.02, 1.305, "Cono" ] ]
} ].map(group => ({
  ...group,
  rows: group.rows.map(([name, code, diameterKm, depthKm, morphology, terrain, reason]) => ({
    name: name,
    code: code,
    period: group.period,
    diameterKm: diameterKm,
    depthKm: depthKm,
    morphology: morphology,
    terrain: terrain ?? null,
    reason: reason ?? null,
    selected: Boolean(reason),
    depthDiameter: depthKm / diameterKm,
    status: "Datos aportados · verificación pendiente",
    lat: null,
    lon: null,
    ...suppliedCoordinates[code]
  }))
}));
