/* Motor webi · cuadros.js
   Película por cuadros sobre canvas: con scroll (conScroll) o con el puntero (conPuntero).
   El canvas tiene que traer su tamaño por CSS (width/height: 100% del contenedor):
   acá solo se ajusta su resolución interna, nunca su tamaño en pantalla. */

import { escenario, alScroll, bucle, amortiguar, limitar, mapear, reducido } from "./motor-scroll.js";

const hayDom = typeof window !== "undefined" && typeof document !== "undefined";
const nada = () => ({ destruir() {} });
const PARALELOS = 6; // tope de pedidos simultáneos que HTTP/1.1 acepta por servidor

/* ---------- Carga ---------- */

function urlDeCuadro(patron, indice) {
  return patron.replace(/#+/, (m) => String(indice + 1).padStart(m.length, "0"));
}

function ordenProgresivo(total) {
  const visto = new Uint8Array(total);
  const orden = [];
  const poner = (i) => {
    if (i >= 0 && i < total && !visto[i]) {
      visto[i] = 1;
      orden.push(i);
    }
  };
  poner(0);
  for (let i = 0; i < total; i += 8) poner(i);
  poner(total - 1);
  for (const paso of [4, 2, 1]) for (let i = 0; i < total; i += paso) poner(i);
  return orden;
}

async function decodificarConImg(src) {
  const img = new Image();
  img.decoding = "async";
  img.src = src;
  await img.decode();
  return img;
}

async function cargarImagen(url, senal, alProgresoBytes) {
  let blob;
  try {
    const r = await fetch(url, { signal: senal });
    if (!r.ok) {
      const e = new Error(r.status + " " + url);
      e.definitivo = true;
      throw e;
    }
    const largo = Number(r.headers.get("content-length")) || 0;
    if (alProgresoBytes && r.body && largo) {
      const lector = r.body.getReader();
      const partes = [];
      let recibido = 0;
      for (;;) {
        const { done, value } = await lector.read();
        if (done) break;
        partes.push(value);
        recibido += value.length;
        alProgresoBytes(Math.min(recibido / largo, 0.98));
      }
      blob = new Blob(partes, { type: r.headers.get("content-type") || "" });
    } else {
      blob = await r.blob();
    }
  } catch (e) {
    if (e.definitivo || (senal && senal.aborted)) throw e;
    return decodificarConImg(url);
  }
  try {
    return await createImageBitmap(blob);
  } catch {
    const u = URL.createObjectURL(blob);
    try {
      return await decodificarConImg(u);
    } finally {
      URL.revokeObjectURL(u);
    }
  }
}

const anchoDe = (img) => img.naturalWidth || img.width;
const altoDe = (img) => img.naturalHeight || img.height;

/* ---------- Película ---------- */

export function crearCuadros(canvas, { fuente, total, encaje = "cubrir", foco = [0.5, 0.5], mezclar = true, dprMax = 2, alCargar } = {}) {
  const esHoja = fuente && typeof fuente === "object";
  const columnas = esHoja ? Math.max(1, fuente.columnas | 0) : 0;
  const filas = esHoja ? Math.max(1, fuente.filas | 0) : 0;
  if (esHoja) total = total || columnas * filas;
  if (!(total >= 1)) throw new Error("crearCuadros: falta `total` (cantidad de cuadros)");
  if (!esHoja && (typeof fuente !== "string" || !fuente.includes("#"))) {
    throw new Error('crearCuadros: `fuente` es un patrón con # ("toma-####.webp") o { hoja, columnas, filas }');
  }
  total = Math.floor(total);

  const ctx = canvas.getContext("2d");
  let fx = limitar(foco[0] ?? 0.5);
  let fy = limitar(foco[1] ?? 0.5);

  const cuadros = new Array(total).fill(null);
  let hojaImg = null;
  let srcW = 0;
  let srcH = 0;
  let cargados = 0;
  let muerto = false;
  const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;

  /* --- tamaño del canvas --- */
  let cssW = 0;
  let cssH = 0;
  let dprActual = 0;
  let versionTamano = 0;
  const dprDeseado = () => Math.min((hayDom && window.devicePixelRatio) || 1, dprMax);

  function aplicarTamano() {
    dprActual = dprDeseado();
    const w = Math.max(1, Math.round(cssW * dprActual));
    const h = Math.max(1, Math.round(cssH * dprActual));
    if (canvas.width !== w) canvas.width = w;
    if (canvas.height !== h) canvas.height = h;
    versionTamano++;
  }

  /* --- encaje dinamico con foco --- */
  function geometria() {
    const cw = cssW;
    const ch = cssH;
    const iw = srcW || cw;
    const ih = srcH || ch;
    const contener = encaje === "contener";
    const esc = contener ? Math.min(cw / iw, ch / ih) : Math.max(cw / iw, ch / ih);
    const w = iw * esc;
    const h = ih * esc;
    return { x: (cw - w) * (contener ? 0.5 : fx), y: (ch - h) * (contener ? 0.5 : fy), w, h };
  }

  /* --- dibujo --- */
  let indice = 0;
  let ultimaClave = "";

  function cercano(i) {
    if (esHoja) return hojaImg ? Math.min(Math.max(i, 0), total - 1) : -1;
    if (cuadros[i]) return i;
    for (let d = 1; d < total; d++) {
      if (i - d >= 0 && cuadros[i - d]) return i - d;
      if (i + d < total && cuadros[i + d]) return i + d;
    }
    return -1;
  }

  function pintar(idx, g) {
    if (esHoja) {
      const cw = anchoDe(hojaImg) / columnas;
      const ch = altoDe(hojaImg) / filas;
      ctx.drawImage(hojaImg, (idx % columnas) * cw, Math.floor(idx / columnas) * ch, cw, ch, g.x, g.y, g.w, g.h);
    } else {
      ctx.drawImage(cuadros[idx], g.x, g.y, g.w, g.h);
    }
  }

  function dibujar(forzar) {
    if (muerto || !ctx || !cssW || !cssH) return;
    if (dprDeseado() !== dprActual) aplicarTamano();
    const base = mezclar ? Math.floor(indice) : Math.round(indice);
    const frac = mezclar ? indice - base : 0;
    const a = cercano(base);
    if (a < 0) return;
    let b = mezclar && frac > 0.004 && base + 1 < total ? cercano(base + 1) : -1;
    if (b === a) b = -1;
    const alfa = b >= 0 ? Math.round(frac * 255) : 0;
    const clave = a + "|" + b + "|" + alfa + "|" + versionTamano + "|" + fx.toFixed(2) + "|" + fy.toFixed(2);
    if (!forzar && clave === ultimaClave) return;
    ultimaClave = clave;

    const g = geometria();
    ctx.setTransform(dprActual, 0, 0, dprActual, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, cssW, cssH);
    pintar(a, g);
    if (b >= 0) {
      ctx.globalAlpha = alfa / 255;
      pintar(b, g);
      ctx.globalAlpha = 1;
    }
  }

  /* --- observar tamaño --- */
  let ro = null;
  if (hayDom) {
    cssW = canvas.clientWidth;
    cssH = canvas.clientHeight;
    if (cssW && cssH) aplicarTamano();
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver((entradas) => {
        const r = entradas[entradas.length - 1].contentRect;
        if (Math.abs(r.width - cssW) < 0.5 && Math.abs(r.height - cssH) < 0.5 && cssW) return;
        cssW = r.width;
        cssH = r.height;
        aplicarTamano();
        dibujar(true);
      });
      ro.observe(canvas);
    }
  }

  /* --- carga --- */
  let hechos = 0;
  let fallidos = 0;
  const informar = (p) => {
    if (!alCargar) return;
    try {
      alCargar(limitar(p));
    } catch (err) {
      console.error(err);
    }
  };

  async function cargarTodo() {
    await null;
    informar(0);
    if (esHoja) {
      try {
        hojaImg = await cargarImagen(fuente.hoja, ctrl && ctrl.signal, (p) => !muerto && informar(p));
      } catch (err) {
        if (!muerto) console.warn("cuadros: no se pudo cargar la hoja", fuente.hoja, err);
        throw new Error("no se cargó la hoja " + fuente.hoja);
      }
      if (muerto) return;
      srcW = anchoDe(hojaImg) / columnas;
      srcH = altoDe(hojaImg) / filas;
      cargados = total;
      dibujar();
      informar(1);
      return;
    }

    const orden = ordenProgresivo(total);
    let siguiente = 0;
    const trabajador = async () => {
      while (!muerto && siguiente < orden.length) {
        const i = orden[siguiente++];
        try {
          const img = await cargarImagen(urlDeCuadro(fuente, i), ctrl && ctrl.signal);
          if (muerto) {
            if (img.close) img.close();
            return;
          }
          cuadros[i] = img;
          cargados++;
          if (!srcW) {
            srcW = anchoDe(img);
            srcH = altoDe(img);
          }
          dibujar();
        } catch (err) {
          if (muerto) return;
          fallidos++;
          console.warn("cuadros: falló el cuadro", i + 1, err.message || err);
        }
        hechos++;
        if (hechos < total) informar(hechos / total);
      }
    };
    await Promise.all(Array.from({ length: Math.min(PARALELOS, total) }, trabajador));
    if (muerto) return;
    if (!cargados) throw new Error("no se cargó ningún cuadro de " + fuente);
    informar(1);
  }

  const lista = cargarTodo().then(() => ({ cargados, fallidos, total }));
  lista.catch(() => {});

  /* --- API --- */
  const irA = (i) => {
    indice = limitar(i, 0, total - 1);
    dibujar();
  };

  return {
    lista,
    total,
    irA,
    ir: (p) => irA(limitar(p) * (total - 1)),
    foco: (x, y) => {
      fx = limitar(x);
      fy = limitar(y);
      dibujar(true);
    },
    punto(x, y) {
      const g = geometria();
      return { x: g.x + x * g.w, y: g.y + y * g.h };
    },
    destruir() {
      muerto = true;
      if (ctrl) ctrl.abort();
      if (ro) ro.disconnect();
      for (let i = 0; i < cuadros.length; i++) {
        if (cuadros[i] && cuadros[i].close) cuadros[i].close();
        cuadros[i] = null;
      }
      if (hojaImg && hojaImg.close) hojaImg.close();
      hojaImg = null;
    },
  };
}

export function conScroll(pelicula, elEscenario, { tramo = [0, 1], suavizar = 0.12 } = {}) {
  const alProgreso = (p) => {
    pelicula.ir(reducido() ? 1 : mapear(p, tramo[0], tramo[1], 0, 1));
  };
  const esEscenario = elEscenario.hasAttribute("data-escenario") || elEscenario.querySelector(":scope > [data-escena]");
  return esEscenario
    ? escenario(elEscenario, alProgreso, { suavizar })
    : alScroll(elEscenario, alProgreso, { tramo: "cruza", suavizar });
}

const VUELTA = (Math.PI * 2) / 9;

export function conPuntero(pelicula, zona, { eje = "x", suavizar = 0.14, reposo = { tras: 6000, modo: "barrido" } } = {}) {
  if (!hayDom || !zona) return nada();
  const esX = eje !== "y";
  const tras = (reposo && reposo.tras) ?? 6000;
  const barrer = !reposo || reposo.modo !== "quieto";
  const touchAntes = zona.style.touchAction;
  zona.style.touchAction = esX ? "pan-y" : "pan-x";

  let objetivo = 0.5;
  let actual = 0.5;
  let enviado = NaN;
  let ultimaActividad = performance.now();
  let barrido = null;
  let arrastre = null;
  let quieto = false;
  let sub = null;

  const marcar = () => {
    ultimaActividad = performance.now();
  };
  const coord = (e) => (esX ? e.clientX : e.clientY);
  const largo = (r) => (esX ? r.width : r.height);

  function alMover(e) {
    const r = zona.getBoundingClientRect();
    if (e.pointerType === "touch") {
      if (!arrastre || e.pointerId !== arrastre.id) return;
      objetivo = limitar(arrastre.p0 + (coord(e) - arrastre.c0) / Math.max(1, largo(r)));
    } else {
      objetivo = limitar((coord(e) - (esX ? r.left : r.top)) / Math.max(1, largo(r)));
    }
    marcar();
  }
  function alBajar(e) {
    if (e.pointerType !== "touch") return;
    arrastre = { id: e.pointerId, c0: coord(e), p0: objetivo };
    marcar();
  }
  function alSoltar(e) {
    if (arrastre && e.pointerId === arrastre.id) arrastre = null;
    marcar();
  }

  function tick(t, dt) {
    if (reducido()) {
      if (!quieto) {
        quieto = true;
        pelicula.ir(0.5);
      }
      return;
    }
    quieto = false;
    if (barrer && !arrastre && performance.now() - ultimaActividad > tras) {
      if (!barrido) barrido = { t0: t, fase0: Math.asin(limitar((objetivo - 0.5) * 2, -1, 1)) };
      objetivo = 0.5 + 0.5 * Math.sin(barrido.fase0 + (t - barrido.t0) * VUELTA);
    } else {
      barrido = null;
    }
    actual = amortiguar(actual, objetivo, suavizar, dt);
    if (Math.abs(objetivo - actual) < 0.0002) actual = objetivo;
    if (actual !== enviado) {
      enviado = actual;
      pelicula.ir(actual);
    }
  }

  let io = null;
  const encender = () => {
    marcar();
    barrido = null;
    if (!sub) sub = bucle(tick);
  };
  const apagar = () => {
    if (sub) sub.destruir();
    sub = null;
  };
  if ("IntersectionObserver" in window) {
    io = new IntersectionObserver((es) => (es[es.length - 1].isIntersecting ? encender() : apagar()), { rootMargin: "10% 0px" });
    io.observe(zona);
  } else {
    encender();
  }

  zona.addEventListener("pointermove", alMover);
  zona.addEventListener("pointerdown", alBajar);
  zona.addEventListener("pointerup", alSoltar);
  zona.addEventListener("pointercancel", alSoltar);

  return {
    destruir() {
      apagar();
      if (io) io.disconnect();
      zona.removeEventListener("pointermove", alMover);
      zona.removeEventListener("pointerdown", alBajar);
      zona.removeEventListener("pointerup", alSoltar);
      zona.removeEventListener("pointercancel", alSoltar);
      zona.style.touchAction = touchAntes;
    },
  };
}
