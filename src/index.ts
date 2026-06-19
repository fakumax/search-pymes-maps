import "dotenv/config";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { CIUDADES, RUBROS, OPCIONES, UBICACION } from "./config.ts";
import { buscarTexto, type Lugar } from "./places.ts";
import { clasificarWeb } from "./clasificar.ts";
import { aWhatsappAr } from "./telefono.ts";
import { escribirExcel, leerPrevios, type ColumnaExcel } from "./excel.ts";

// Convierte "Misiones" → "misiones", "Buenos Aires" → "buenos-aires".
function slug(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// El archivo es ÚNICO por región y se acumula entre corridas (dedupe por placeId).
const ARCHIVO = `pymes-${slug(UBICACION.region)}.xlsx`;

const COLUMNAS: ColumnaExcel[] = [
  { key: "estado", header: "Estado", width: 14 }, // manual: lo llenás vos (ej. "contactado")
  { key: "notas", header: "Notas", width: 24 }, // manual
  { key: "nombre", header: "Nombre", width: 34 },
  { key: "clasificacion", header: "Web", width: 16 }, // sin web / solo redes / google business
  { key: "web", header: "Link web/red", width: 26, tipo: "url" },
  { key: "telefono", header: "Teléfono", width: 18 },
  { key: "whatsapp", header: "WhatsApp", width: 18 },
  { key: "rubro", header: "Rubro", width: 22 },
  { key: "ciudad", header: "Ciudad", width: 16 },
  { key: "rating", header: "Rating", width: 9 },
  { key: "resenas", header: "Reseñas", width: 10 },
  { key: "tipo", header: "Tipo (Google)", width: 22 },
  { key: "direccion", header: "Dirección", width: 40 },
  { key: "googleMaps", header: "Google Maps", width: 22, tipo: "url" },
  { key: "fechaDetectado", header: "Detectado", width: 12 },
  { key: "placeId", header: "Place ID", width: 30 },
];

const pausa = (ms: number) => new Promise((r) => setTimeout(r, ms));

function obtenerApiKey(): string {
  const key = process.env.GOOGLE_MAPS_API_KEY?.trim();
  if (!key || key === "tu_api_key_aca") {
    console.error(
      "\n❌ Falta GOOGLE_MAPS_API_KEY.\n" +
        "   1) Copiá .env.example a .env\n" +
        "   2) Pegá tu API key de Google Cloud (con Places API New habilitada)\n"
    );
    process.exit(1);
  }
  return key;
}

async function main() {
  const apiKey = obtenerApiKey();
  const hoy = new Date().toISOString().slice(0, 10);

  const dir = join(process.cwd(), "salida");
  await mkdir(dir, { recursive: true });
  const ruta = join(dir, ARCHIVO);

  // Cargo lo que ya había para acumular y preservar estado/notas/fecha.
  const previos = await leerPrevios(ruta, COLUMNAS);
  console.log(`📂 Registros previos en el Excel: ${previos.size}`);

  const totalQueries = RUBROS.length * CIUDADES.length;
  console.log(
    `🔎 ${RUBROS.length} rubros × ${CIUDADES.length} ciudades = ${totalQueries} búsquedas.`
  );
  console.log(`🔒 Tope de solicitudes: ${OPCIONES.maxSolicitudes}\n`);

  // Filas finales empiezan con TODO lo previo; vamos haciendo upsert por placeId.
  const finales = new Map<string, Record<string, unknown>>(previos);
  const vistos = new Set<string>(); // negocios analizados en ESTA corrida
  let consultas = 0;
  let solicitudes = 0;
  let conWebPropia = 0;
  let candidatos = 0;
  let nuevos = 0;
  let topeAlcanzado = false;

  for (const rubro of RUBROS) {
    if (topeAlcanzado) break;
    for (const ciudad of CIUDADES) {
      if (topeAlcanzado) break;
      consultas++;
      const textQuery = `${rubro} en ${ciudad}, ${UBICACION.region}, ${UBICACION.pais}`;
      let pageToken: string | undefined;

      try {
        for (let pagina = 0; pagina < OPCIONES.paginasPorQuery; pagina++) {
          if (solicitudes >= OPCIONES.maxSolicitudes) {
            topeAlcanzado = true;
            break;
          }

          solicitudes++;
          const resp = await buscarTexto({
            apiKey,
            textQuery,
            regionCode: OPCIONES.regionCode,
            languageCode: OPCIONES.languageCode,
            pageToken,
          });

          for (const lugar of resp.places ?? []) {
            if (!lugar.id || vistos.has(lugar.id)) continue;
            vistos.add(lugar.id);

            const { clasificacion, esCandidato } = clasificarWeb(lugar.websiteUri);
            esCandidato ? candidatos++ : conWebPropia++;

            if (OPCIONES.soloCandidatos && !esCandidato) continue;
            if ((lugar.userRatingCount ?? 0) < OPCIONES.minResenas) continue;

            const previo = previos.get(lugar.id);
            if (!previo) nuevos++;
            finales.set(lugar.id, construirFila(lugar, rubro, ciudad, clasificacion, previo, hoy));
          }

          pageToken = resp.nextPageToken;
          if (!pageToken) break;
          await pausa(OPCIONES.pausaMs);
        }
      } catch (err) {
        console.error(`\n   ⚠️  Error en "${textQuery}": ${(err as Error).message}`);
      }

      process.stdout.write(
        `\r[${consultas}/${totalQueries}] llamadas: ${solicitudes}/${OPCIONES.maxSolicitudes}` +
          ` · candidatos: ${finales.size} (nuevos: ${nuevos})   `
      );
      await pausa(OPCIONES.pausaMs);
    }
  }

  if (topeAlcanzado) {
    console.log(
      `\n\n⏸️  Tope de ${OPCIONES.maxSolicitudes} solicitudes alcanzado. Guardo lo que hay.`
    );
  }

  // Ordeno por reseñas desc (los más activos primero).
  const filas = [...finales.values()].sort(
    (a, b) => Number(b.resenas || 0) - Number(a.resenas || 0)
  );

  await escribirExcel(ruta, filas, COLUMNAS);

  console.log("\n");
  console.log("✅ Listo.");
  console.log(`   Llamadas a la API usadas: ${solicitudes}`);
  console.log(`   Negocios analizados esta corrida: ${vistos.size}`);
  console.log(`   Con web propia (excluidos): ${conWebPropia}  |  Candidatos vistos: ${candidatos}`);
  console.log(`   Nuevos agregados al Excel: ${nuevos}`);
  console.log(`   Total acumulado en el Excel: ${filas.length}`);
  console.log(`   Archivo: ${ruta}\n`);
}

function construirFila(
  lugar: Lugar,
  rubro: string,
  ciudad: string,
  clasificacion: string,
  previo: Record<string, unknown> | undefined,
  hoy: string
): Record<string, unknown> {
  return {
    // Columnas manuales: se preservan entre corridas.
    estado: previo?.estado ?? "",
    notas: previo?.notas ?? "",
    // Datos de la API (se refrescan).
    nombre: lugar.displayName?.text ?? "",
    clasificacion,
    web: lugar.websiteUri ?? "",
    telefono: lugar.nationalPhoneNumber ?? "",
    whatsapp: aWhatsappAr(lugar.internationalPhoneNumber ?? lugar.nationalPhoneNumber),
    rubro,
    ciudad,
    rating: lugar.rating ?? "",
    resenas: lugar.userRatingCount ?? "",
    tipo: lugar.primaryTypeDisplayName?.text ?? "",
    direccion: lugar.formattedAddress ?? "",
    googleMaps: lugar.googleMapsUri ?? "",
    // Primera vez que lo detectamos: si ya existía, conservamos su fecha.
    fechaDetectado: (previo?.fechaDetectado as string) || hoy,
    placeId: lugar.id,
  };
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
