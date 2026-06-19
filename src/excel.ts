/** Exporta y lee los resultados en Excel (.xlsx) con formato. */
import { existsSync } from "node:fs";
import ExcelJS from "exceljs";

export interface ColumnaExcel {
  key: string;
  header: string;
  width: number;
  /** Si es "url", la celda se vuelve un hipervínculo clicable. */
  tipo?: "url";
}

/** Extrae el valor "plano" de una celda (resolviendo hipervínculos). */
function valorCelda(value: unknown): unknown {
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if ("hyperlink" in obj) return obj.hyperlink ?? obj.text ?? "";
    if ("text" in obj) return obj.text ?? "";
    if ("result" in obj) return obj.result ?? "";
  }
  return value ?? "";
}

/**
 * Lee un xlsx previo y devuelve sus filas indexadas por placeId.
 * Sirve para acumular entre corridas sin duplicar y preservando tus notas.
 */
export async function leerPrevios(
  archivo: string,
  columnas: ColumnaExcel[]
): Promise<Map<string, Record<string, unknown>>> {
  const mapa = new Map<string, Record<string, unknown>>();
  if (!existsSync(archivo)) return mapa;

  try {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(archivo);
    const ws = wb.worksheets[0];
    if (!ws) return mapa;

    const headerAKey = new Map(columnas.map((c) => [c.header, c.key]));
    const keyPorColumna: (string | undefined)[] = [];
    ws.getRow(1).eachCell((cell, col) => {
      const texto = String(valorCelda(cell.value)).trim();
      keyPorColumna[col] = headerAKey.get(texto);
    });

    for (let r = 2; r <= ws.rowCount; r++) {
      const row = ws.getRow(r);
      const obj: Record<string, unknown> = {};
      row.eachCell((cell, col) => {
        const key = keyPorColumna[col];
        if (key) obj[key] = valorCelda(cell.value);
      });
      const placeId = obj.placeId;
      if (typeof placeId === "string" && placeId) mapa.set(placeId, obj);
    }
  } catch (err) {
    console.error(
      `\n   ⚠️  No pude leer el xlsx previo (${(err as Error).message}). ` +
        `Si lo tenés abierto en Excel, cerralo. Sigo sin acumular.`
    );
  }

  return mapa;
}

export async function escribirExcel(
  archivo: string,
  filas: Record<string, unknown>[],
  columnas: ColumnaExcel[]
): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "buscaEmpresas";
  wb.created = new Date();
  const ws = wb.addWorksheet("PyMEs candidatas", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  ws.columns = columnas.map((c) => ({
    key: c.key,
    header: c.header,
    width: c.width,
  }));

  const header = ws.getRow(1);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF2E7D32" },
  };
  header.alignment = { vertical: "middle" };

  for (const fila of filas) {
    const row = ws.addRow(fila);
    for (let i = 0; i < columnas.length; i++) {
      const col = columnas[i]!;
      if (col.tipo !== "url") continue;
      const valor = fila[col.key];
      if (typeof valor === "string" && valor.startsWith("http")) {
        const cell = row.getCell(i + 1);
        cell.value = { text: valor, hyperlink: valor };
        cell.font = { color: { argb: "FF1155CC" }, underline: true };
      }
    }
  }

  ws.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: columnas.length },
  };

  await wb.xlsx.writeFile(archivo);
}
