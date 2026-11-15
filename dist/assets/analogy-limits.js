export const planetaryLimits = {
  Moon:{
    source:{name:'NASA · características de la Luna',url:'https://science.nasa.gov/moon/facts/'},
    items:[
      'La gravedad lunar es menor que la terrestre. Una pendiente semejante permite comparar formas; la tracción y la dinámica requieren un modelo del vehículo y de la gravedad.',
      'La superficie terrestre no reproduce el vacío lunar, su régimen térmico ni su exposición a la radiación. Los ensayos de materiales y equipos necesitan condiciones controladas.',
      'El relieve no demuestra hielo, estabilidad de una cavidad, iluminación solar ni seguridad de un alunizaje. Cada rasgo exige observaciones específicas.'
    ]
  },
  Mars:{
    source:{name:'NASA · características de Marte',url:'https://science.nasa.gov/mars/facts/'},
    items:[
      'La gravedad y la presión atmosférica marcianas difieren de las terrestres. Cambian la dinámica de vehículos, partículas y procesos volcánicos.',
      'El clima terrestre no reproduce conjuntamente la atmósfera tenue, la temperatura y la radiación de Marte. La aridez o el permafrost son analogías de rasgos concretos.',
      'Una forma semejante no confirma composición, edad, agua disponible ni habitabilidad. Las bioseñales y los recursos requieren evidencia independiente.'
    ]
  }
};

export function analogyLimits(world,site) {
  return [site?.limit || 'Falta comprobar el rasgo en una parcela concreta, documentar su escala y distinguir la evidencia regional de las mediciones locales.',
    ...(planetaryLimits[world]?.items ?? [])];
}

export const measurementCaution='La resolución nominal y el paso de muestreo delimitan la escala del resultado. La incertidumbre vertical y cartográfica no se ha propagado; diferencias pequeñas pueden no ser significativas.';
