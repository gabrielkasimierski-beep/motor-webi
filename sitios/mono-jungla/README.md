# Mono en la Jungla — Portada Fotorrealista con Video Congelado y Recorte Alfa

Página editorial y experiencia inmersiva para **Mono en la Jungla**, construida sobre el **Motor webi** (`kit/`) sin dependencias ni paso de compilación.

Inspirada en el nivel de pulido editorial y dinamismo de la plantilla "Eagle" de Scrolltide.

---

## Concepto y Técnica

La experiencia presenta una **PORTADA** (Hero) a pantalla completa (`100svh`, mín. `600px`) dominada por un video fotorrealista a sangre de un mono araña balanceándose en la selva.

### Técnica de Capas y Recorte Alfa
A través del módulo `kit/video-portada.js` con el modo `"una-vez"`, se logra un título monumental que queda posicionado **DETRÁS** del animal sin interrupciones de reproducción:

1. **Video (`mono-web.mp4`):** Se reproduce una sola vez (6.6 s).
2. **Empalme Invisible:** Al finalizar, el video se congela y oculta mostrando `mono-final.jpg` (último fotograma exacto).
3. **Revelación del Título y Recorte:** En el callback `alTerminar`, el título gigante **"MONO"** se anima e ingresa, al tiempo que se activa la capa `mono-recorte.webp` (imagen con canal alfa del mono y la liana) por encima del título.
4. **Calce Perfecto:** Video, fotograma final y recorte alfa comparten la misma caja CSS, con `object-fit: cover` y `object-position: 50% 40%` para un encaje pixel a pixel en cualquier resolución.
5. **Efecto Parallax:** Tras congelar, mover el cursor aplica un leve desplazamiento al título opuesto al puntero (máx. 10px), mientras el mono permanece estático para no descalzarse.

---

## Paleta de Color y Tipografías

- **Fondo Oscuro:** `#0B140C` (verde selva profundo / casi negro)
- **Texto Principal / Crema:** `#F4EFE1`
- **Acento Dorado:** `#E0B04A`
- **Tipografías:**
  - `Archivo Black` (Título gigante "MONO" de 80vw)
  - `Instrument Serif` (Titulares principales e itálicas de acento)
  - `Instrument Sans` (Texto de lectura y navegación)
  - `JetBrains Mono` (Etiquetas y datos numéricos)

---

## Estructura de Secciones

1. **Portada Inmersiva:**
   - Nav transparente con marca, enlaces de navegación y CTA.
   - Bloque editorial inferior izquierdo con titular serif y CTAs de acción.
   - Bloque derecho con avatares en CSS clip y tarjetas de vidrio (`backdrop-filter`) con datos del mono araña.
   - Botón discreto "Repetir" para volver a reproducir la travesía.
2. **Tres Datos Fundamentales:**
   - Banda en `#0B140C` con tres columnas informativas sobre la física, braquiación y alimentación del mono araña, encabezadas por números serif monumentales.
3. **Cierre y Pie de Página:**
   - Titular serif de llamada a la acción, botón dorado de reserva y footer con copyright e isotipo.

---

## Recursos en `medios/`

- `mono-web.mp4`: Clip 1080p a 6.6 s (mono araña entrando en liana).
- `mono-poster.jpg`: Fotograma inicial.
- `mono-final.jpg`: Fotograma final exacto.
- `mono-recorte.webp`: Recorte alfa del mono y la liana del fotograma final.

---

## Cómo Ejecutar

1. Iniciar el servidor local del motor:
   ```bash
   node herramientas/servidor.js sitios/mono-jungla 5191
   ```
2. Abrir en el navegador: `http://localhost:5191/` o mediante `npm run banco` en `http://localhost:5190/sitios/mono-jungla/`.
