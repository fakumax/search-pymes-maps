/**
 * Script LOCAL (no usa la API de Google).
 * Lee el Excel ya generado y agrega/actualiza la columna "WhatsApp"
 * con el número en formato +549... a partir del teléfono que ya está en el archivo.
 *
 * Uso:  pnpm whatsapp
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import ExcelJS from "exceljs";
import { UBICACION } from "./config.ts";
import { aWhatsappAr } from "./telefono.ts";

function slug(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function textoCelda(value: unknown): string {
  if (value && typeof value === "object") {
    const o = value as Record<string, unknown>;
    if ("text" in o) return String(o.text ?? "");
    if ("result" in o) return String(o.result ?? "");
    if ("hyperlink" in o) return String(o.hyperlink ?? "");
  }
  return value == null ? "" : String(value);
}

async function main() {
  const ruta = join(process.cwd(), "salida", `pymes-${slug(UBICACION.region)}.xlsx`);
  if (!existsSync(ruta)) {
    console.error(`\n❌ No encontré ${ruta}. Generá primero el Excel con el scraper.\n`);
    process.exit(1);
  }

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(ruta);
  const ws = wb.worksheets[0];
  if (!ws) {
    console.error("❌ El Excel no tiene hojas.");
    process.exit(1);
  }

  // Mapeo de encabezados → número de columna.
  const headerRow = ws.getRow(1);
  let maxCol = 0;
  const cols = new Map<string, number>();
  headerRow.eachCell((cell, col) => {
    cols.set(textoCelda(cell.value).trim().toLowerCase(), col);
    if (col > maxCol) maxCol = col;
  });

  // Busco la columna de teléfono: priorizo "internacional", si no, "teléfono".
  let colTel: number | undefined;
  for (const [texto, col] of cols) {
    if (texto.includes("internacional")) { colTel = col; break; }
  }
  if (!colTel) {
    for (const [texto, col] of cols) {
      if (texto.includes("tel")) { colTel = col; break; }
    }
  }
  if (!colTel) {
    console.error("❌ No encontré ninguna columna de teléfono en el Excel.");
    process.exit(1);
  }

  // Columna WhatsApp: reuso si existe, si no la creo al final.
  let colWa = cols.get("whatsapp");
  if (!colWa) {
    colWa = maxCol + 1;
    const cell = headerRow.getCell(colWa);
    cell.value = "WhatsApp";
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2E7D32" } };
    ws.getColumn(colWa).width = 18;
  }

  let convertidos = 0;
  let vacios = 0;
  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const tel = textoCelda(row.getCell(colTel).value);
    if (!tel.trim()) continue; // fila vacía / sin teléfono
    const wa = aWhatsappAr(tel);
    row.getCell(colWa).value = wa;
    wa ? convertidos++ : vacios++;
  }

  await wb.xlsx.writeFile(ruta);

  console.log("\n✅ Listo (sin usar la API).");
  console.log(`   Columna de origen: "${textoCelda(headerRow.getCell(colTel).value)}"`);
  console.log(`   Números convertidos a WhatsApp: ${convertidos}`);
  console.log(`   Teléfonos que no se pudieron normalizar: ${vacios}`);
  console.log(`   Archivo: ${ruta}\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
