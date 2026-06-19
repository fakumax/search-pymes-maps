/**
 * Cliente mínimo de la Google Places API (New) — Text Search.
 * Docs: https://developers.google.com/maps/documentation/places/web-service/text-search
 */

const ENDPOINT = "https://places.googleapis.com/v1/places:searchText";

// Campos que pedimos. El FieldMask define el costo (SKU): pedimos solo lo necesario.
const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.websiteUri",
  "places.nationalPhoneNumber",
  "places.internationalPhoneNumber",
  "places.formattedAddress",
  "places.rating",
  "places.userRatingCount",
  "places.primaryTypeDisplayName",
  "places.googleMapsUri",
  "nextPageToken",
].join(",");

export interface Lugar {
  id: string;
  displayName?: { text?: string };
  websiteUri?: string;
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  formattedAddress?: string;
  rating?: number;
  userRatingCount?: number;
  primaryTypeDisplayName?: { text?: string };
  googleMapsUri?: string;
}

interface RespuestaBusqueda {
  places?: Lugar[];
  nextPageToken?: string;
}

export interface ParamsBusqueda {
  apiKey: string;
  textQuery: string;
  regionCode: string;
  languageCode: string;
  pageToken?: string;
}

export async function buscarTexto(
  params: ParamsBusqueda
): Promise<RespuestaBusqueda> {
  const body: Record<string, unknown> = {
    textQuery: params.textQuery,
    regionCode: params.regionCode,
    languageCode: params.languageCode,
    pageSize: 20,
  };
  if (params.pageToken) body.pageToken = params.pageToken;

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": params.apiKey,
      "X-Goog-FieldMask": FIELD_MASK,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const texto = await res.text();
    throw new Error(`Places API ${res.status}: ${texto}`);
  }

  return (await res.json()) as RespuestaBusqueda;
}
