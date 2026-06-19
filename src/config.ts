/**
 * Configuración de la búsqueda.
 * Editá estas listas a gusto: el script recorre cada combinación rubro × ciudad.
 *
 * Para buscar en OTRA zona: cambiá UBICACION + CIUDADES (y si querés, RUBROS).
 * No hace falta tocar el código.
 */

// Zona de búsqueda. Se agrega a cada query ("<rubro> en <ciudad>, <region>, <pais>")
// y define el nombre del Excel de salida (cada región acumula en su propio archivo).
export const UBICACION = {
  region: "Misiones",
  pais: "Argentina",
};

// Ciudades/localidades de la región donde buscar.
export const CIUDADES: string[] = [
  "Posadas",
  "Garupá",
  "Oberá",
  "Eldorado",
  "Puerto Iguazú",
  "Apóstoles",
  "Leandro N. Alem",
  "Puerto Rico",
  "Montecarlo",
  "San Vicente",
  "Jardín América",
  "Wanda",
];

// Rubros a buscar. Pensados para PyMEs misioneras que suelen no tener web.
export const RUBROS: string[] = [
  // Turismo (fuerte en Misiones)
  "posadas",
  "cabañas",
  "hosterías",
  "agencias de turismo",
  "alojamientos",
  // Gastronomía
  "parrillas",
  "cafeterías",
  "rotiserías",
  "restaurantes",
  // Servicios personales
  "peluquerías",
  "barberías",
  "centros de estética",
  "gimnasios",
  // Comercio y oficios
  "ferreterías",
  "viveros",
  "talleres mecánicos",
  "veterinarias",
  "corralones",
  // Profesionales / salud
  "consultorios odontológicos",
  "estudios contables",
  "inmobiliarias",
  // Productivo regional
  "productos regionales",
];

// Parámetros de la API y del filtrado.
export const OPCIONES = {
  // Código de región (Argentina) e idioma para sesgar resultados.
  regionCode: "AR",
  languageCode: "es",
  // 🔒 TOPE DURO de llamadas a la API. El script cuenta CADA solicitud
  // (cada página de cada búsqueda) y frena al llegar a este número,
  // exportando lo que haya juntado. Subilo/bajalo según tu cupo gratis.
  // Ojo: nº de búsquedas (rubros × ciudades) puede ser hasta ×3 por la paginación.
  maxSolicitudes: 500,
  // Cuántas páginas pedir por query (cada página ~20 resultados, máx 3 = 60).
  // Poné 1 para gastar menos llamadas (20 resultados por búsqueda).
  paginasPorQuery: 2,
  // Pausa entre llamadas a la API, en milisegundos (para no saturar / respetar cuotas).
  pausaMs: 250,
  // Si true, solo exporta CANDIDATOS: sin web, "solo redes" (IG/FB como web)
  // y "google business". Excluye los que tienen web propia real.
  // Poné false para exportar todos (incluida la web propia) y analizar.
  soloCandidatos: true,
  // Filtra los que tengan al menos esta cantidad de reseñas (señal de negocio activo).
  // Poné 0 para no filtrar por reseñas.
  minResenas: 0,
};
