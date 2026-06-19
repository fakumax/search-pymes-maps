/**
 * Clasifica el "sitio web" que Google tiene de un negocio.
 * Muchos comercios ponen su Instagram/Facebook como web → siguen siendo
 * candidatos perfectos (tienen presencia online pero no una web propia).
 */

// Dominios que NO son una web propia, sino redes/enlaces.
const REDES = [
  "instagram.com",
  "facebook.com",
  "fb.com",
  "fb.me",
  "wa.me",
  "whatsapp.com",
  "api.whatsapp.com",
  "linktr.ee",
  "linktree.ee",
  "beacons.ai",
  "tiktok.com",
  "twitter.com",
  "x.com",
  "t.me",
  "telegram.me",
  "telegram.org",
];

export interface ClasificacionWeb {
  clasificacion: "sin web" | "solo redes" | "google business" | "web propia";
  esCandidato: boolean;
}

export function clasificarWeb(url?: string): ClasificacionWeb {
  if (!url || !url.trim()) {
    return { clasificacion: "sin web", esCandidato: true };
  }

  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    // URL inválida → la tratamos como si no tuviera web.
    return { clasificacion: "sin web", esCandidato: true };
  }

  const esRed = REDES.some((d) => host === d || host.endsWith("." + d));
  if (esRed) return { clasificacion: "solo redes", esCandidato: true };

  // Páginas autogeneradas gratis de Google (no es una web real).
  if (host.endsWith("business.site") || host.endsWith("negocio.site")) {
    return { clasificacion: "google business", esCandidato: true };
  }

  return { clasificacion: "web propia", esCandidato: false };
}
