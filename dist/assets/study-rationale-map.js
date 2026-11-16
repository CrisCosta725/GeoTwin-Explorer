import { studyTables } from "./study-rationale.js";

import { analogs } from "./analogs.js";

import { lunarMatrix } from "./lunar-matrix.js";

import { marsOperations } from "./mars-operations.js";

export function rationaleFor(world, site) {
  let table, row;
  if (world === "Earth") {
    table = studyTables[0];
    const index = analogs.findIndex(s => s.id === site.id);
    if (index >= 0) row = table.rows[index + 1];
  } else if (world === "Mars") {
    table = studyTables[4];
    const index = Object.keys(marsOperations).indexOf(site.id);
    if (index >= 0) row = table.rows[index + 1];
  } else if (world === "Moon") for (const [i, group] of lunarMatrix.entries()) {
    const index = group.rows.findIndex(r => r.code.toLowerCase() === site.id);
    if (index >= 0) {
      table = studyTables[i + 1];
      row = table.rows[index + 1];
      break;
    }
  }
  return row ? table.rows[0].map((label, i) => ({
    label: label,
    value: row[i]
  })).filter(item => item.value && item.label !== "N.º" && item.label !== "Justificación estratégica para Geo Twin") : [];
}
