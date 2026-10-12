# Motor webi (este proyecto)

@MOTOR-WEBI.md

## Trabajar en el motor

- Esta carpeta **es** el motor: acá no vive ningún cliente. Los sitios de clientes se arman en la
  carpeta de cada cliente, copiando del kit.
- Antes de tocar una pieza del kit, leer `kit/CONTRATO.md`. Si cambia una firma, se actualiza el
  contrato, la página del banco y la skill que la usa, en el mismo cambio.
- Una pieza nueva entra con sus tres partes: código en `kit/`, página en `banco/` (y su tarjeta en
  `banco/index.html`) y su lugar en una skill.
- Para ver el banco: servidor `banco` de `.claude/launch.json` (puerto 5190).
- Carta Viva (`C:\Claude\Estudio\carta-viva`) se puede leer para aprender; **no se modifica** desde acá.
