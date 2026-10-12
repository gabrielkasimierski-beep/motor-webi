# Motor webi

El motor propio para armar sitios web que se mueven. Vive en `C:\Claude\Webs`.

Son tres cosas que trabajan juntas:

- **Skills** (`.claude/skills/`): cómo decidir y en qué orden trabajar.
- **Kit** (`kit/`): el código base ya probado que las skills mandan usar. Sin dependencias ni
  compilación. Su contrato está en `kit/CONTRATO.md`.
- **Banco de pruebas** (`banco/`): una página por pieza. Es la demostración y el ejemplo de uso.
  Se abre con `npm run banco` → http://localhost:5190/banco/

Crece estudiando sitios publicados: cada estudio queda en `referencias/<sitio>/analisis.md` y deja
técnicas nuevas en las skills y piezas nuevas en el kit (skill `estudiar-sitio`).

## Mapa de skills

| Cuándo | Skill | Pieza del kit |
|---|---|---|
| **Método** | | |
| Hay un sitio que queremos aprender | `estudiar-sitio` | — |
| Arranca un sitio: concepto, guion y fichas | `dirigir-sitio` | — |
| Hace falta una imagen, un video o cuadros | `fabricar-recursos` | `herramientas/video-a-cuadros.js` |
| Antes de mostrar o publicar | `revisar-sitio` | `herramientas/archivos-del-sitio.js` |
| **Base** | | |
| Color, tipografía, espacios, curvas | `sistema-visual` | `tokens.css` |
| Scroll, escenarios fijos, entradas | `motor-de-movimiento` | `motor-scroll.js` |
| **Escenas (la pieza firma)** | | |
| Un video que avanza con el scroll | `pelicula-con-scroll` | `cuadros.js` |
| Un video arriba de todo | `video-de-portada` | `video-portada.js` |
| Algo que sigue o revela con el puntero | `escena-con-puntero` | `cuadros.js`, `puntero.js` |
| Profundidad con imágenes planas | `profundidad-por-capas` | `capas.js` |
| Un objeto 3D | `escena-3d` | `escena3d.js` |
| **Estanterías** | | |
| Un fondo que se mueve | `fondos-shader` | `fondo-shader.js` |
| Un carrusel, un botón, un texto con efecto | `componentes-vivos` | `componentes/` |
| Una banda de página (precios, contacto, pie…) | `secciones-de-pagina` | `secciones.css`, `secciones.js` |
| Un panel o pantalla de aplicación | `pantallas-de-app` | `graficos.js`, `pantalla.css` |

## Cómo se arma un sitio

1. **Dirigir** (`dirigir-sitio`): del brief sale un concepto, **una** pieza firma y el guion de
   bandas, con una ficha por pieza.
2. **Sistema visual** (`sistema-visual`): la marca del cliente pisa los valores de `tokens.css`.
3. **Fabricar** (`fabricar-recursos`): los recursos de la pieza firma, antes que la página.
4. **Construir** banda por banda, quieta antes que en movimiento, copiando del kit lo que pida
   cada ficha (`node herramientas/nuevo-sitio.js <carpeta> --piezas=…`).
5. **Revisar** (`revisar-sitio`) y mostrar.

## Reglas del motor

1. **Una pieza firma por sitio.** El resto, parejo y quieto. Mejor cuatro bandas consistentes que
   una portada de cine arriba de cuatro bandas chatas.
2. **El recurso manda.** Sin un buen video o una buena imagen no hay técnica que salve la escena:
   primero el recurso, después el código.
3. **Todo funciona en el celular y con "reducir movimiento".** Si una pieza no tiene una versión
   digna para esos dos casos, no está terminada.
4. **El peso se cuenta.** Cada pieza declara cuánto baja y cuándo. Lo pesado llega tarde y solo si
   hace falta.
5. **Se aprende la técnica, no se copia la obra.** De un sitio ajeno se toman mecanismos y
   medidas; nunca sus textos, imágenes, videos, código ni material de pago.
6. **Opus dirige, Sonnet construye.** El diseño, la ficha y la revisión son de Opus; el código y
   lo mecánico van como encargo cerrado a un subagente Sonnet, que trabaja contra `kit/CONTRATO.md`.
7. **Nada se publica ni se manda a un tercero sin el OK de Gaby.** Generar recursos con una
   cuenta paga (Higgsfield) también se consulta antes.

## Sitios estudiados

| Sitio | Fecha | Qué dejó |
|---|---|---|
| [Scrolltide](referencias/scrolltide/analisis.md) | 11-oct-2026 | Los ocho mecanismos, las cinco estanterías y el método: la primera versión entera del motor |
