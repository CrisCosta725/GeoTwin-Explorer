import { currentLanguage } from "./i18n.js";

export const evaluationGroups = [ {
  name: "Morfometría",
  variables: [ "Diámetro", "Profundidad", "Pendiente", "Circularidad", "Relación profundidad/diámetro (d/D)" ],
  method: "Delimitar la estructura y medir perfiles y contornos con un DEM de resolución adecuada."
}, {
  name: "Topografía",
  variables: [ "Elevación", "Rugosidad", "Bloques", "Relieve" ],
  method: "Registrar resolución del DEM, escala de muestreo e imágenes capaces de resolver los bloques."
}, {
  name: "Iluminación",
  variables: [ "Horas de iluminación", "Sombras", "Geometría solar" ],
  method: "Definir fecha, intervalo temporal, orientación y horizonte local."
}, {
  name: "Temperatura",
  variables: [ "Máxima", "Mínima", "Variación térmica" ],
  method: "Documentar período de observación, profundidad y si la temperatura corresponde al aire o a la superficie."
}, {
  name: "Recursos",
  variables: [ "Indicadores de hidrógeno", "Hielo", "Volátiles" ],
  method: "Distinguir indicios orbitales, mediciones de campo y detecciones confirmadas; registrar profundidad y resolución."
}, {
  name: "Operaciones",
  variables: [ "Seguridad de aterrizaje", "Rutas", "Accesibilidad" ],
  method: "Evaluar un vehículo, huella, peligros y restricciones concretos. El relieve por sí solo no valida seguridad."
}, {
  name: "Geología",
  variables: [ "Basaltos", "Anortositas", "Regolito", "Eyecciones", "Estructuras" ],
  method: "Contrastar cartografía y observaciones con fuentes y escala; una forma semejante no confirma composición."
} ];

export const lunarCraterRationale = [ {
  name: "Alunizaje",
  detail: "Buscar un sector relativamente plano, con pendientes suaves y pocos bloques, próximo a la infraestructura prevista. Evaluar la parcela y las rutas de acceso: el interior o el borde de un cráter no son automáticamente aptos.",
  check: "Pendiente, bloques, rugosidad, iluminación, comunicaciones y precisión del sistema de descenso."
}, {
  name: "Base habitacional",
  detail: "Evaluar posibilidades de blindaje con regolito o cavidades naturales para reducir la exposición al ambiente espacial. La presencia de un cráter no garantiza protección; una cavidad debe confirmarse y caracterizarse.",
  check: "Estabilidad del terreno o cavidad, espesor de blindaje, condiciones térmicas, energía y acceso."
}, {
  name: "Laboratorios geológicos",
  detail: "Seleccionar cráteres con materiales y exposiciones que permitan estudiar impactos, el subsuelo y la evolución lunar. Para investigar vulcanismo, verificar su relación con unidades volcánicas y distinguir estructuras de impacto de estructuras volcánicas.",
  check: "Cartografía, composición, estratigrafía, procedencia de eyecciones, muestreo y escala de los afloramientos."
}, {
  name: "Investigación de gravedad",
  detail: "Un cráter no genera gravedad cero. La superficie conserva la gravedad lunar. Los experimentos de microgravedad requieren una instalación o trayectoria de caída libre apropiada; un sistema giratorio puede generar aceleración artificial para estudiar contramedidas de salud.",
  check: "Definir el objetivo experimental y el sistema físico; no usar la forma del cráter como indicador de microgravedad."
} ];

export function evaluationFor(site = {}, lunarRow = null) {
  const geological = {
    Basaltos: "basalto",
    Anortositas: "anortosita",
    Regolito: "regolito"
  };
  const decimal = new Intl.NumberFormat(currentLanguage(), {
    maximumFractionDigits: 3
  });
  const lunarValues = lunarRow ? new Map([ [ "Diámetro", decimal.format(lunarRow.diameterKm) + " km" ], [ "Profundidad", decimal.format(lunarRow.depthKm) + " km" ], [ "Relación profundidad/diámetro (d/D)", new Intl.NumberFormat(currentLanguage(), {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3
  }).format(lunarRow.depthDiameter) ], [ "Estructuras", lunarRow.morphology ], [ "Relieve", lunarRow.terrain ] ].filter(([, value]) => value)) : null;
  return evaluationGroups.map(group => ({
    ...group,
    variables: group.variables.map(name => {
      if (lunarValues?.has(name)) {
        const measurement = [ "Diámetro", "Profundidad", "Relación profundidad/diámetro (d/D)" ].includes(name);
        return {
          name: name,
          value: lunarValues.get(name),
          status: measurement ? "Datos aportados" : "Datos aportados · " + lunarRow.period + " · verificación pendiente",
          source: null
        };
      }
      let value = null, status = "Pendiente de datos", source = null;
      if (name === "Elevación" && Number.isFinite(site.elevationM)) {
        value = site.elevationM + " m";
        status = "Cota aportada";
      }
      if (name === "Pendiente" && Number.isFinite(site.slope)) {
        value = site.slope + "°";
        status = "Máxima estimada · radio de 1 km · DEM " + site.resolution + " m";
        source = site.dem ?? null;
      }
      if (geological[name] && site.originStatus !== "unverified" && site.geology?.includes(geological[name])) {
        value = "Registrado en la ficha";
        status = "Evidencia regional · verificar en la parcela";
        source = site.source ?? null;
      }
      return {
        name: name,
        value: value,
        status: status,
        source: source
      };
    })
  }));
}
