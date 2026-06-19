# buscaEmpresas

Encuentra **PyMEs de Misiones que NO tienen sitio web** usando la Google Places API (New),
para ofrecerles desarrollo web. Recorre cada combinación de **rubro × ciudad**, filtra los
negocios sin `websiteUri` y exporta un CSV listo para abrir en Excel.

## 1. Obtener la API key de Google

1. Entrá a [Google Cloud Console](https://console.cloud.google.com/) e iniciá sesión.
2. Creá un proyecto (arriba a la izquierda → "Nuevo proyecto").
3. **Habilitá la API:** menú → "APIs y servicios" → "Biblioteca" → buscá **"Places API (New)"** → Habilitar.
4. **Facturación:** Google pide una tarjeta para activar, pero hay un **cupo mensual gratuito de llamadas**.
   Para este uso normalmente no se paga nada **si respetás el cupo** (ver sección "No pagar nunca").
5. **Credenciales:** "APIs y servicios" → "Credenciales" → "Crear credenciales" → "Clave de API".
   Copiá la clave. (Opcional pero recomendado: restringila a "Places API (New)").

## No pagar nunca (doble candado)

Google cobra **por solicitud** (cada llamada a la API), no por resultado. Una búsqueda que
trae 60 resultados son 3 solicitudes (pagina de a ~20). Como pedimos web + teléfono, las
llamadas usan el SKU más caro, así que el cupo gratis para este uso es más chico que el de
búsquedas básicas. El número exacto de llamadas gratis Google lo cambia seguido: revisá la
[página de precios](https://developers.google.com/maps/billing-and-pricing/pricing) vigente.
No hace falta adivinarlo, porque lo blindamos por dos lados:

1. **Tope en el script.** En [`src/config.ts`](src/config.ts), `OPCIONES.maxSolicitudes`
   limita cuántas llamadas hace el script. Cuenta CADA llamada y frena solo al llegar,
   exportando lo que juntó. Empezá conservador (ej. 300–500) y subilo si ves que no te cobran.
   Con `paginasPorQuery: 1` gastás 1 llamada por búsqueda (20 resultados); con `2`, hasta el doble.

2. **Tope en Google Cloud (el candado real).** Aunque el script fallara, esto hace que Google
   *rechace* las llamadas extra en vez de cobrarte:
   - **Límite de cuota diaria:** Consola → "APIs y servicios" → Places API (New) → pestaña
     "Cuotas y límites" → editá el límite de *requests por día* a un número seguro.
   - **Presupuesto/alerta:** Consola → "Facturación" → "Presupuestos y alertas" → creá un
     presupuesto bajo (ej. $1) con alertas al 50/90/100%.

## 2. Configurar el proyecto

```bash
pnpm install
cp .env.example .env       # en Windows/PowerShell: copy .env.example .env
```

Abrí `.env` y pegá tu key:

```
GOOGLE_MAPS_API_KEY=AIza...tu_clave...
```

## 3. Ajustar la búsqueda (opcional)

Editá [`src/config.ts`](src/config.ts):

- **`UBICACION`** — región y país. Se agrega a cada búsqueda y nombra el archivo de salida.
  **Para buscar en otra provincia, cambiá esto + `CIUDADES`** (ej. `region: "Córdoba"` →
  genera `salida/pymes-cordoba.xlsx`, separado del de Misiones).
- **`CIUDADES`** — localidades de la región a recorrer.
- **`RUBROS`** — tipos de negocio a buscar.
- **`OPCIONES`**:
  - `maxSolicitudes` → 🔒 tope duro de llamadas a la API (ver "No pagar nunca").
  - `soloCandidatos: true` → exporta solo candidatos (sin web, "solo redes" y "google business").
    `false` exporta todos, incluida la web propia.
  - `minResenas` → filtra por cantidad mínima de reseñas (señal de negocio activo).
  - `paginasPorQuery` → 1, 2 o 3 (≈20/40/60 resultados por consulta; más páginas = más llamadas).
  - `pausaMs` → pausa entre llamadas a la API.

## 4. Ejecutar

```bash
pnpm buscar
```

Genera/actualiza **un único archivo por región** `salida/pymes-<region>.xlsx` (Excel), ordenado
por reseñas, con encabezado fijo y filtros activados. Cerrá el archivo en Excel antes de correr,
o el guardado falla.

### Es acumulativo (no pisa lo de ayer)

Siempre escribe el mismo archivo y **acumula entre corridas, sin duplicar** (deduplica por `placeId`).
Si lo corrés mañana, los negocios nuevos **se suman** a los existentes; los que ya estaban no se repiten.
Las columnas **Estado** y **Notas** son tuyas (llenalas a mano, ej. "contactado") y **se preservan**
en cada corrida. También guarda **Detectado** = la fecha en que apareció por primera vez.
Para empezar de cero, borrá `salida/pymes-misiones.xlsx`.

### La columna "Web" clasifica el prospecto

- **sin web** → Google no tiene ningún sitio. Candidato.
- **solo redes** → puso su Instagram/Facebook como web. **Candidato ideal** (tiene presencia, le falta web).
- **google business** → página gratis autogenerada de Google. Candidato.
- **web propia** → ya tiene sitio real. Se excluye (salvo que pongas `soloCandidatos: false`).

La columna **Link web/red** te muestra ese enlace (su IG/FB) para que lo revises antes de contactar.

## Cómo usar la lista

1. Priorizá los de **más reseñas sin web**: son negocios vivos que claramente lo necesitan.
2. Tenés el teléfono para contactarlos directo.
3. Cruzá con Instagram: si están activos en IG pero sin web, es el pitch perfecto
   ("te paso de Instagram a una web propia").

## Notas

- El script clasifica solo: si el "sitio web" de Google es un Instagram/Facebook, lo marca
  **solo redes** y lo deja como candidato (no lo descarta). Solo excluye la **web propia** real.
- Priorizá los **solo redes** con muchas reseñas: están activos, tienen seguidores y solo les
  falta la web propia. Tenés el link de su red en la columna **Link web/red**.
- La columna **WhatsApp** ya viene en formato `+549...` (listo para wa.me). Si queda vacía es
  porque el número no era un teléfono argentino estándar de 10 dígitos.
- **Email:** Google Places API NO devuelve email, así que no está en la salida. Para conseguirlo
  habría que un paso aparte que visite la web/IG del negocio y lo extraiga (cobertura baja en
  negocios sin web). El canal realista de esta lista es WhatsApp/teléfono.
- Respetá los términos de uso de la API y no abuses de la cuota.
