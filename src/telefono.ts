/**
 * Normaliza un teléfono argentino al formato que usa WhatsApp:
 *   +549 + (código de área) + (número)  → ej. +5493764123456
 *
 * Asume el formato internacional limpio que devuelve Google (+54 ...).
 * Si el número no llega a 10 dígitos nacionales, devuelve "" (no es válido/seguro).
 */
export function aWhatsappAr(numero?: string): string {
  if (!numero) return "";

  let d = numero.replace(/\D/g, ""); // solo dígitos

  if (d.startsWith("54")) d = d.slice(2); // saco código de país
  if (d.startsWith("9")) d = d.slice(1); // saco el 9 de celular (lo re-agrego)
  d = d.replace(/^0/, ""); // saco el 0 inicial (prefijo nacional)

  // Número nacional argentino = 10 dígitos (área + abonado).
  if (d.length !== 10) return "";

  return "+549" + d;
}

/** Link clicable de WhatsApp (wa.me) a partir del número ya normalizado. */
export function linkWhatsapp(whatsapp: string): string {
  if (!whatsapp) return "";
  return "https://wa.me/" + whatsapp.replace(/\D/g, "");
}
