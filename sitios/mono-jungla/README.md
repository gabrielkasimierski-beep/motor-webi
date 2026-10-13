# Mono en la Jungla — El Descenso Interactivo (Motor webi)

Experiencia inmersiva e interactiva guiada por scroll para **Mono en la Jungla**, construida sobre el **Motor webi** (`kit/`) sin dependencias ni paso de compilación.

---

## Concepto

El usuario desciende por un árbol de la selva amazónica junto a un mono araña a lo largo de un **escenario fijo de 520vh** sticky a pantalla completa:

- **Inicio (Scroll 0.0):** Copa del árbol, cielo claro entre las hojas y aves a lo lejos.
- **Tramo Medio (Scroll 0.35 – 0.80):** Interior del árbol con troncos musgosos, lianas, vida silvestre (guacamayo y mariposas cruzando) y rayos de luz filtrados.
- **Final (Scroll 0.88 – 1.0):** Claro de pasto a nivel del suelo. Al llegar al pasto, el mono aterriza y ejecuta un **golpe de pecho** ritual.
- **Rebobinado:** Al subir el scroll, todo el viaje retrocede de forma sincronizada.

---

## Arquitectura y Componentes del Kit

Se emplean módulos reutilizables del kit (`kit/`) como ES Modules nativos:

1. **`motor-scroll.js` (`escenario`, `bucle`, `amortiguar`, `reducido`):**
   - Controla el escenario fijo `<section data-escenario style="--largo: 520vh"><div data-escena>`.
   - Ejecuta un único bucle a 60 fps sincronizado para actualizar transformaciones y opacidades.
2. **`cuadros.js` (`crearCuadros`, `conScroll`):**
   - Reproduce los 96 cuadros de `medios/descenso/descenso-####.webp` (1280x720) sobre `<canvas id="canvas-fondo">` con encaje `"cubrir"` y foco `[0.5, 0.45]`.
   - Sincroniza el fotograma exacto con la posición del scroll con inercia suave.
   - Incluye indicador de progreso de carga inicial.
3. **`puntero.js` (`puntero`):**
   - Lee la posición relativa del cursor/dedo con inercia suave.
   - Aplica un desplazamiento horizontal y leve rotación de vaivén al mono (como si se hamacara en la liana).
   - Sin interacción activa del cursor, genera un vaivén automático en reposo.

---

## Estructura de Capas en HTML/CSS

- **Z-Index 1:** `<canvas id="canvas-fondo">` (Película del descenso).
- **Z-Index 3:** `.capa-vida` (Fauna: `guacamayo.webp` y `mariposa.webp` con animación de cruce continuo y parallax del puntero, visibles solo en el tramo medio).
- **Z-Index 4:** `#mono-scroll > #mono-puntero > #mono-cuerpo` (Mono protagonista en `mono-recorte.webp` con jerarquía de wrappers independientes para separar `translateY`/`scale` por scroll del `translateX`/`rotate` por puntero).
- **Z-Index 5:** `.capa-atmosfera` (Vignette radial oscura en bordes + rayo de luz en degradé + textura `.grano`).
- **Z-Index 6:** `.capa-textos` (3 bandas de texto cinematográfico en crema/dorado: *El Descenso*, *La vida en el árbol*, *A tierra firme*).
- **Z-Index 10:** Nav superior transparente y barra inferior de progreso de scroll.

---

## Pendiente: Reemplazo del Golpe de Pecho Real

Actualmente, al llegar al final del scroll (último ~8%, progreso ≥ 0.92) se activa la clase CSS `.golpe-pecho` en `#mono-cuerpo`. Esta animación es un **placeholder por código** (pulso de escala + ritmo rápido de toque de pecho) mientras se produce el video final.

### Cómo reemplazarlo cuando esté listo el video real:
1. Agregar el clip de video (formato MP4/WebM con canal alfa o video recortado) en `medios/mono-golpe-pecho.mp4`.
2. En `index.html`, instanciar un elemento `<video>` transparente dentro de `#mono-cuerpo` (o reemplazar la etiqueta `<img>` al llegar al progreso ≥ 0.92).
3. Reproducir el video con bucle o mediante `videoPortada` / `videoConScroll`.

---

## Reducción de Movimiento (`prefers-reduced-motion`)

Si el usuario tiene activada la preferencia de movimiento reducido:
- Se inhabilita el scrub y el movimiento interactivo.
- Se muestra la imagen estática de respaldo (`medios/suelo.jpg`).
- Los textos permanecen visibles y legibles en flujo natural.

---

## Cómo Ejecutar

1. Iniciar el servidor local del motor:
   ```bash
   node herramientas/servidor.js sitios/mono-jungla 5191
   ```
2. Abrir en el navegador: `http://localhost:5191/` o mediante el banco de pruebas: `npm run banco` en `http://localhost:5190/sitios/mono-jungla/`.
