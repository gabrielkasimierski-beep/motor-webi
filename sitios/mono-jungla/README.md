# Mono en la Jungla — Prueba Interactiva con Motor webi

Página interactiva inspirada conceptualmente en el nivel de pulido y dinamismo de Scrolltide (ej. plantilla Eagle), construida enteramente sobre el **Motor webi** (`kit/`) y sin dependencias externas.

## Concepto
Un mono vectorial en la jungla profunda que cruza de liana en liana con un balanceo pendular natural a medida que el usuario navega con el scroll. La experiencia simula el transcurso de un día en la selva, desde la primera luz del amanecer hasta la noche estrellada con luciérnagas.

## Guion de Bandas (en español)

1. **Escenario Fijo - La Travesía del Mono (Hero & Capítulos 1 a 3)**
   - *Progreso 0% - Amanecer (Hero):* "El Guardián del Dosel" — Título monumental sobre el follaje matutino.
   - *Progreso 25% - Mediodía (Capítulo 1):* "Impulso en las Alturas" — El mono engancha la segunda liana en pleno vuelo. Ficha de dato curioso sobre la física y agarre de los primates.
   - *Progreso 50% - Atardecer (Capítulo 2):* "Navegantes Silenciosos" — El mono surca la tercera liana bajo el resplandor cálido del sol cayendo. Datos sobre la biodiversidad de la selva tropical.
   - *Progreso 75% - Noche (Capítulo 3):* "Luces en la Penumbra" — Llegada a la cuarta liana. Luces de luciérnagas titilantes y hábitos nocturnos de la jungla.

2. **Banda 2 - La Ciencia del Balanceo (Sección Quieta)**
   - Explicación de la biomecánica del mono (braquiación), distribución del peso y cómo el pendulo perfecto le permite ahorrar energía.

3. **Banda 3 - El Ecosistema Latente (Mosaico de Datos Curiosos)**
   - Mosaico interactivo con 3 datos clave de la jungla:
     - 40 metros de altura en el dosel.
     - 85% de la biodiversidad habita los estratos superiores.
     - 300 lianas por hectárea creando puentes naturales.

4. **Banda 4 - La Noche en el Dosel (Llamado & Contraste)**
   - Banda con fondo oscuro de estrellas y luciérnagas activas, destacando el silencio nocturno de la selva.

5. **Banda 5 - Cierre & CTA Ficticio**
   - "Unite a la Expedición" — Formulario/Botón con efecto de vidrio (`componentes/boton-vidrio`) para explorar más expediciones en la selva.

---

## Ficha Técnica de la Pieza Firma

- **Pieza:** `pelicula-con-scroll` + `cuadros.js` + `motor-scroll.js`.
- **Recurso:** Generación procedimental por código (120 cuadros renderizados en Canvas de alta resolución).
- **Proporción & Pista:** Escenario fijo (`data-escenario`, `--largo: 450vh`).
- **Movimiento:**
  - Mono vectorial articulado balanceándose sobre 4 lianas fijas.
  - Arco pendular físico ($y = y_0 + \text{caída} \cdot \sin^2(\theta)$).
  - Jungla multicapa en fondo y primer plano (hojas, árboles lejanos, rayos de luz, niebla ambiental, hojas cayendo).
- **Acompañamiento:** `fondo-shader.js` (familia `malla` / `aurora` adaptativa) cuya paleta muta suavemente del amanecer a la noche según el progreso del scroll.
- **Táctil:** Respuesta directa en dispositivos móviles sin trabar el scroll vertical.
- **Reducir movimiento:** Respetado en todo el sitio (`prefers-reduced-motion`).

---

## Recursos Multimedia y Versión Final

Actualmente, la escena se renderiza por código mediante canvas procedimental en `js/escena-mono.js` para cumplir con la regla de no incluir imágenes con derechos de autor ni dependencias externas.

Para sustituir los cuadros procedimentales por un video filmado o rendered 3D profesional en la versión final:
1. Grabar o exportar un video MP4 de 8 a 10 segundos con un único movimiento continuo (ej: `mono-travesia.mp4`).
2. Ejecutar la herramienta del motor para desarmar el video en cuadros WebP optimizados:
   ```bash
   node herramientas/video-a-cuadros.js mono-travesia.mp4 --salida=sitios/mono-jungla/medios/cuadros --nombre=toma
   ```
3. En `index.html`, la fuente pasará a ser `"./medios/cuadros/toma-####.webp"`.

---

## Cómo Ejecutar el Sitio

1. Iniciar el servidor local del motor:
   ```bash
   node herramientas/servidor.js sitios/mono-jungla 5191
   ```
2. Abrir en el navegador:
   `http://127.0.0.1:5191/`
