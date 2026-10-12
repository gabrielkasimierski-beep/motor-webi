# Motor webi

El motor propio para armar sitios web con movimiento. Nació el 11-oct-2026 estudiando
[Scrolltide](referencias/scrolltide/analisis.md) y crece con cada sitio que se estudia.

## Qué hay

| Carpeta | Qué es |
|---|---|
| `.claude/skills/` | Las 15 skills: cómo decidir y en qué orden trabajar |
| `kit/` | El código base que las skills mandan usar (sin dependencias ni compilación) |
| `banco/` | Banco de pruebas: una página por pieza del kit |
| `herramientas/` | Video a cuadros, servidor local, sitio nuevo, lista de archivos |
| `referencias/` | El estudio de cada sitio |

El mapa completo y las reglas están en [MOTOR-WEBI.md](MOTOR-WEBI.md). El contrato del kit, en
[kit/CONTRATO.md](kit/CONTRATO.md).

## Cómo se usa

Abrir Claude Code en esta carpeta y pedir en palabras propias:

- *"Analizá este sitio y sumá lo que sirva al motor: {link}"* → `estudiar-sitio`
- *"Armemos el sitio de {cliente}"* → `dirigir-sitio` (concepto, pieza firma y guion)
- *"Quiero que el producto gire con el scroll"* → `pelicula-con-scroll`
- *"Necesito un fondo que se mueva con los colores de la marca"* → `fondos-shader`
- *"Revisá esta página antes de mostrarla"* → `revisar-sitio`

## Comandos

```bash
npm run banco
```
Abre el banco de pruebas en http://localhost:5190/banco/

```bash
node herramientas/video-a-cuadros.js medios/toma.mp4 --cuadros=120 --ancho=1280
```
Pasa un video a cuadros WebP, con póster, cuadro final y manifiesto.

```bash
node herramientas/nuevo-sitio.js ../Clientes/cliente/sitio --piezas=cuadros,fondo-shader
```
Arma la carpeta de un sitio nuevo con las piezas del kit que se pidan.
