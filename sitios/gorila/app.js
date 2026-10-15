import { crearCuadros } from "./lib/cuadros.js";
import { escenario, bucle, amortiguar, mapear, reducido } from "./lib/motor-scroll.js";
import { puntero } from "./lib/puntero.js";

document.addEventListener("DOMContentLoaded", () => {
  // Elementos DOM
  const elCargador = document.getElementById("cargador");
  const elProgresoBarra = document.getElementById("progreso-barra");
  const elProgresoTexto = document.getElementById("progreso-texto");
  const elEscenario = document.querySelector("[data-escenario]");
  const elEscena = document.getElementById("escena");
  const elCanvasFondo = document.getElementById("canvas-fondo");
  const elCanvasGorila = document.getElementById("canvas-gorila");
  const elContenedorGorila = document.getElementById("contenedor-gorila");
  const elSombraPiso = document.getElementById("sombra-piso");
  const elVinieta = document.getElementById("vinieta");

  const elTexto1 = document.getElementById("texto-1");
  const elTexto2 = document.getElementById("texto-2");
  const elTexto3 = document.getElementById("texto-3");
  const elTexto4 = document.getElementById("texto-4");

  const ctxGorila = elCanvasGorila ? elCanvasGorila.getContext("2d") : null;

  // Selección de resolución de fondo
  const usa720 = window.innerWidth <= 768;
  const patronFondo = usa720
    ? "./medios/fondo-720/fondo-###.webp"
    : "./medios/fondo-1080/fondo-###.webp";

  // Instancia de fondo
  let pelFondo = null;

  /* -------------------------------------------------------------
     CARGA DE LIANA
  ------------------------------------------------------------- */
  let imgLiana = null;
  const lianaCargada = new Promise((resolve) => {
    const img = new Image();
    img.src = "./medios/liana.webp";
    img.decode().then(() => {
      imgLiana = img;
      resolve();
    }).catch(() => {
      if (img.complete && img.naturalWidth) {
        imgLiana = img;
      }
      resolve();
    });
  });

  /* -------------------------------------------------------------
     CARGADOR DE SECUENCIAS DE IMÁGENES ROBUSTO
  ------------------------------------------------------------- */
  function cargarSecuencia(patron, total, alProgreso) {
    const imagenes = new Array(total).fill(null);
    let cargados = 0;
    let ultimoValido = null;

    function urlDeCuadro(p, i) {
      return p.replace(/#+/, (m) => String(i + 1).padStart(m.length, "0"));
    }

    const promesa = new Promise((resolve) => {
      let finalizado = false;

      const alTerminar = () => {
        cargados++;
        if (alProgreso) alProgreso(cargados / total);
        if (cargados === total && !finalizado) {
          finalizado = true;
          resolve(imagenes);
        }
      };

      for (let i = 0; i < total; i++) {
        const img = new Image();
        img.decoding = "async";
        img.src = urlDeCuadro(patron, i);

        const guardar = () => {
          imagenes[i] = img;
          if (!ultimoValido) ultimoValido = img;
        };

        img.decode()
          .catch(() => (img.complete && img.naturalWidth ? null : Promise.reject()))
          .then(guardar)
          .catch(() => {})
          .finally(alTerminar);
      }
    });

    return {
      promesa,
      total,
      obtener(idx) {
        const i = Math.max(0, Math.min(total - 1, Math.floor(idx)));
        if (imagenes[i]) {
          ultimoValido = imagenes[i];
          return imagenes[i];
        }
        return ultimoValido || imagenes[0];
      }
    };
  }

  // Secuencias
  let seqBalanceo, seqGrito, seqMirada, seqBajada, seqSueloA, seqSueloB, seqSueloC;

  // Carga crítica
  const progresoCarga = {
    fondo: 0,
    balanceo: 0,
    grito: 0,
    mirada: 0
  };

  function actualizarCargador() {
    const total = (progresoCarga.fondo + progresoCarga.balanceo + progresoCarga.grito + progresoCarga.mirada) / 4;
    const pct = Math.min(100, Math.floor(total * 100));
    if (elProgresoBarra) elProgresoBarra.style.width = `${pct}%`;
    if (elProgresoTexto) elProgresoTexto.textContent = `${pct}%`;
  }

  pelFondo = crearCuadros(elCanvasFondo, {
    fuente: patronFondo,
    total: 63,
    encaje: "cubrir",
    foco: [0.5, 0.0],
    alCargar: (p) => { progresoCarga.fondo = p; actualizarCargador(); }
  });

  seqBalanceo = cargarSecuencia("./medios/balanceo/balanceo-###.webp", 122, (p) => {
    progresoCarga.balanceo = p; actualizarCargador();
  });

  seqGrito = cargarSecuencia("./medios/grito/grito-###.webp", 122, (p) => {
    progresoCarga.grito = p; actualizarCargador();
  });

  seqMirada = cargarSecuencia("./medios/mirada/mirada-###.webp", 61, (p) => {
    progresoCarga.mirada = p; actualizarCargador();
  });

  function cargarSecundarias() {
    seqBajada = cargarSecuencia("./medios/bajada/bajada-###.webp", 125);
    seqBajada.promesa.then(() => {
      seqSueloA = cargarSecuencia("./medios/suelo-a/suelo-a-###.webp", 102);
      seqSueloB = cargarSecuencia("./medios/suelo-b/suelo-b-###.webp", 102);
      seqSueloC = cargarSecuencia("./medios/suelo-c/suelo-c-###.webp", 102);
    });
  }

  Promise.all([
    pelFondo.lista,
    seqBalanceo.promesa,
    seqGrito.promesa,
    seqMirada.promesa,
    lianaCargada
  ]).then(() => {
    if (elCargador) elCargador.classList.add("oculto");
    iniciarExperiencia();
    cargarSecundarias();
  }).catch((err) => {
    console.error("Error al cargar recursos:", err);
    if (elCargador) elCargador.classList.add("oculto");
    iniciarExperiencia();
    cargarSecundarias();
  });

  /* -------------------------------------------------------------
     DETECCIÓN Y CACHEO DE ANCLA DE LA MANO EN SPRITE
  ------------------------------------------------------------- */
  const cacheAnclaMano = new WeakMap();

  function obtenerAnclaMano(img) {
    if (!img || !img.naturalWidth || !img.naturalHeight) return { x: 240, y: 0 };
    if (cacheAnclaMano.has(img)) return cacheAnclaMano.get(img);

    const tmpCanvas = document.createElement("canvas");
    tmpCanvas.width = img.naturalWidth;
    tmpCanvas.height = img.naturalHeight;
    const tCtx = tmpCanvas.getContext("2d");
    tCtx.drawImage(img, 0, 0);

    const scanRows = Math.min(20, img.naturalHeight);
    const imgData = tCtx.getImageData(0, 0, img.naturalWidth, scanRows).data;

    let sumaX = 0, cuenta = 0, minY = scanRows;

    for (let y = 0; y < scanRows; y++) {
      for (let x = 0; x < img.naturalWidth; x++) {
        const alpha = imgData[(y * img.naturalWidth + x) * 4 + 3];
        if (alpha > 40) {
          sumaX += x;
          cuenta++;
          if (y < minY) minY = y;
        }
      }
      if (cuenta > 5) break; // Usar las primeras filas detectadas
    }

    const res = cuenta > 0
      ? { x: sumaX / cuenta, y: Math.max(0, minY) }
      : { x: img.naturalWidth * 0.5, y: 0 };

    cacheAnclaMano.set(img, res);
    return res;
  }

  /* -------------------------------------------------------------
     MÁQUINA DE ESTADOS Y SCROLL CON VELOCIDAD MÁXIMA
  ------------------------------------------------------------- */
  let estadoActual = "BALANCEO";
  let progresoScroll = 0;
  let scrollSuave = 0;

  // Interacción
  const miPuntero = puntero(document.body, { suavizar: 0.12 });
  let inerciaRotacion = 0;
  let inerciaTranslateX = 0;
  let sueloOffsetX = 0;

  // Tiempos e índices
  let tiempoBalanceo = 0;
  let tiempoGrito = 0;
  let timerGrito30s = 0;

  // Suelo state
  let clipSueloActual = "a";
  let sueloSubEstado = "ANIMANDO";
  let sueloFrameIndex = 0;
  let sueloTiempoPausa = 0;

  // Crossfade state
  let crossfadeActivo = false;
  let crossfadeTiempo = 0;
  const CROSSFADE_DURACION = 0.25;
  let crossfadeFrameSalida = null;

  // Canvas gorila
  let cssW = 0, cssH = 0, dprActual = 1;
  function ajustarTamanoCanvasGorila() {
    if (!elCanvasGorila) return;
    cssW = elCanvasGorila.clientWidth || window.innerWidth;
    cssH = elCanvasGorila.clientHeight || window.innerHeight;
    dprActual = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(cssW * dprActual));
    const h = Math.max(1, Math.round(cssH * dprActual));
    if (elCanvasGorila.width !== w) elCanvasGorila.width = w;
    if (elCanvasGorila.height !== h) elCanvasGorila.height = h;
  }
  window.addEventListener("resize", ajustarTamanoCanvasGorila);

  /* --- DIBUJADO DE LIANA EN CANVAS --- */
  function dibujarLiana(ctx, xMano, yMano, opacidad = 1, escalaSprite = 1) {
    if (opacidad <= 0) return;
    ctx.save();
    ctx.globalAlpha = opacidad;

    if (imgLiana && imgLiana.naturalWidth) {
      const lianaW = 34 * escalaSprite;
      const lianaH = 160 * escalaSprite;
      const numTiles = Math.ceil(yMano / lianaH) + 1;

      for (let i = 0; i < numTiles; i++) {
        const tileY = yMano - (i + 1) * lianaH;
        ctx.drawImage(imgLiana, xMano - lianaW * 0.5, tileY, lianaW, lianaH);
      }
    } else {
      // Fallback: trazo con degradé marrón-beige
      const grad = ctx.createLinearGradient(xMano, 0, xMano, yMano);
      grad.addColorStop(0, "#3e2723");
      grad.addColorStop(0.5, "#6d4c41");
      grad.addColorStop(1, "#8d6e63");
      ctx.strokeStyle = grad;
      ctx.lineWidth = Math.max(2, 10 * escalaSprite);
      ctx.beginPath();
      ctx.moveTo(xMano, 0);
      ctx.lineTo(xMano, yMano);
      ctx.stroke();
    }

    ctx.restore();
  }

  function dibujarGorila(frame1, frame2 = null, alfa2 = 0, opcionesLiana = null) {
    if (!ctxGorila || !cssW || !cssH) return;
    ctxGorila.save();
    ctxGorila.setTransform(dprActual, 0, 0, dprActual, 0, 0);
    ctxGorila.clearRect(0, 0, cssW, cssH);
    ctxGorila.imageSmoothingEnabled = true;
    ctxGorila.imageSmoothingQuality = "high";

    const iw = 480, ih = 853;
    const esc = Math.min(cssW / iw, cssH / ih);
    const w = iw * esc;
    const h = ih * esc;
    const x = (cssW - w) * 0.5;
    const y = (cssH - h) * 0.5;

    // Dibujar liana detrás si aplica
    if (opcionesLiana && opcionesLiana.visible && frame1) {
      const ancla = obtenerAnclaMano(frame1);
      const xManoCanvas = x + ancla.x * esc;
      const yManoCanvas = y + ancla.y * esc;
      dibujarLiana(ctxGorila, xManoCanvas, yManoCanvas, opcionesLiana.opacidad || 1, esc);
    }

    if (frame1 && (frame1.width || frame1.naturalWidth)) {
      ctxGorila.globalAlpha = frame2 && alfa2 > 0 ? Math.max(0, 1 - alfa2) : 1;
      ctxGorila.drawImage(frame1, x, y, w, h);
    }
    if (frame2 && (frame2.width || frame2.naturalWidth) && alfa2 > 0) {
      ctxGorila.globalAlpha = Math.min(1, alfa2);
      ctxGorila.drawImage(frame2, x, y, w, h);
    }
    ctxGorila.restore();
  }

  function iniciarCrossfade(frameSalida) {
    if (!frameSalida) return;
    crossfadeActivo = true;
    crossfadeTiempo = 0;
    crossfadeFrameSalida = frameSalida;
  }

  /* --- Mapeo de bajada acelerando caída (cuadros 40-55) --- */
  function mapearFrameBajada(pBajada) {
    pBajada = Math.max(0, Math.min(1, pBajada));
    let frame = 0;
    if (pBajada <= 0.45) {
      frame = (pBajada / 0.45) * 39;
    } else if (pBajada <= 0.53) {
      frame = 39 + ((pBajada - 0.45) / 0.08) * 15;
    } else {
      frame = 54 + ((pBajada - 0.53) / 0.47) * 70;
    }
    return Math.min(124, Math.floor(frame));
  }

  function obtenerFrameSegunEstado() {
    if (estadoActual === "BALANCEO") {
      const idx = Math.floor(tiempoBalanceo * 24) % 122;
      return seqBalanceo ? seqBalanceo.obtener(idx) : null;
    } else if (estadoActual === "GRITO") {
      const idx = Math.min(121, Math.floor(tiempoGrito * 24));
      return seqGrito ? seqGrito.obtener(idx) : null;
    } else if (estadoActual === "MIRADA") {
      return seqMirada ? seqMirada.obtener(36) : null;
    } else if (estadoActual === "BAJADA") {
      const pBajada = Math.max(0, Math.min(1, (scrollSuave - 0.80) / 0.19));
      const idxBajada = mapearFrameBajada(pBajada);
      return seqBajada ? seqBajada.obtener(idxBajada) : null;
    } else if (estadoActual === "SUELO") {
      const seqActualSuelo =
        clipSueloActual === "a" ? seqSueloA :
        clipSueloActual === "b" ? seqSueloB : seqSueloC;
      return seqActualSuelo ? seqActualSuelo.obtener(Math.floor(sueloFrameIndex)) : null;
    }
    return seqMirada ? seqMirada.obtener(36) : null;
  }

  /* --- BUCLE PRINCIPAL --- */
  let bucleConsola = bucle((t, dt) => {
    ajustarTamanoCanvasGorila();

    if (reducido()) {
      if (pelFondo) {
        pelFondo.ir(0);
        pelFondo.foco(0.5, 0.0);
      }
      const imgP0 = seqBalanceo ? seqBalanceo.obtener(0) : null;
      dibujarGorila(imgP0, null, 0, { visible: true, opacidad: 1 });
      if (elContenedorGorila) {
        elContenedorGorila.style.left = window.innerWidth >= 900 ? "58%" : "50%";
        elContenedorGorila.style.transform = "translate(-50%, 0) scale(0.85)";
        elContenedorGorila.style.filter = "none";
      }
      return;
    }

    // Suavizado del scroll con velocidad máxima (alcanzar saltos grandes en <1s)
    const diffScroll = progresoScroll - scrollSuave;
    const maxVel = 2.5; // progreso por segundo máximo
    const paso = Math.sign(diffScroll) * Math.min(Math.abs(diffScroll) * 12 * dt, maxVel * dt);
    if (Math.abs(diffScroll) < 0.001) {
      scrollSuave = progresoScroll;
    } else {
      scrollSuave += paso;
    }

    // Fondo
    if (pelFondo) {
      pelFondo.ir(scrollSuave);
      let focoY = 0.0;
      if (scrollSuave < 0.35) {
        focoY = mapear(scrollSuave, 0, 0.35, 0.0, 0.55);
      } else {
        focoY = mapear(scrollSuave, 0.35, 1.0, 0.55, 0.75);
      }
      pelFondo.foco(0.5, focoY);
    }

    // Actualización de Textos
    actualizarTextos(scrollSuave);

    // Puntero X
    let pxActual = 0.5;
    if (miPuntero.tipo === "touch" || !miPuntero.dentro) {
      pxActual = 0.5 + 0.3 * Math.sin(t * 0.8);
    } else {
      pxActual = miPuntero.x;
    }

    // Inercia
    const rotObjetivo = (pxActual - 0.5) * 4;
    const transObjetivo = (pxActual - 0.5) * 3;
    inerciaRotacion = amortiguar(inerciaRotacion, rotObjetivo, 0.1, dt);
    inerciaTranslateX = amortiguar(inerciaTranslateX, transObjetivo, 0.1, dt);

    // Determinación del Estado según Scroll y Tiempos
    let frameGorilaActual = null;
    let opcionesLiana = { visible: false, opacidad: 1 };

    if (scrollSuave < 0.35) {
      // TRAMO 1: BALANCEO
      if (estadoActual !== "BALANCEO") {
        const frameActual = obtenerFrameSegunEstado();
        estadoActual = "BALANCEO";
        iniciarCrossfade(frameActual);
      }

      tiempoBalanceo += dt;
      const idxBalanceo = Math.floor(tiempoBalanceo * 24) % 122;
      frameGorilaActual = seqBalanceo ? seqBalanceo.obtener(idxBalanceo) : null;
      opcionesLiana = { visible: true, opacidad: 1 };

      if (elEscena) elEscena.classList.remove("temblor");
      if (elVinieta) elVinieta.classList.remove("cerrada");
      if (elSombraPiso) elSombraPiso.classList.remove("visible");

      const pTramo = scrollSuave / 0.35;
      const escala = 0.12 + (0.85 - 0.12) * pTramo;
      const desvioX = Math.sin(pTramo * Math.PI * 2) * 12;
      const blur = (1 - pTramo) * 3;
      const contrast = 0.8 + 0.2 * pTramo;

      const baseLeft = window.innerWidth >= 900 ? "58%" : "50%";
      if (elContenedorGorila) {
        elContenedorGorila.style.left = baseLeft;
        elContenedorGorila.style.top = "0px";
        elContenedorGorila.style.transform = `translate(calc(-50% + ${desvioX}vw), 0) scale(${escala})`;
        elContenedorGorila.style.filter = `blur(${blur}px) contrast(${contrast})`;
      }

    } else if (scrollSuave >= 0.35 && scrollSuave < 0.80) {
      // TRAMO 2: GRITO / MIRADA (~75-80% escala)
      const escalaGorila = 0.95; // Incrementada para ~75-80% alto sin cortar la cara
      const baseLeft = window.innerWidth >= 900 ? "58%" : "50%";
      if (elContenedorGorila) {
        elContenedorGorila.style.left = baseLeft;
        elContenedorGorila.style.top = "0px";
        elContenedorGorila.style.transform = `translate(calc(-50% + ${inerciaTranslateX}vw), 0) scale(${escalaGorila}) rotate(${inerciaRotacion}deg)`;
        elContenedorGorila.style.filter = "none";
      }
      if (elSombraPiso) elSombraPiso.classList.remove("visible");

      // Rebobinado desde BAJADA / SUELO
      if (estadoActual === "BAJADA" || estadoActual === "SUELO") {
        const frameActual = obtenerFrameSegunEstado();
        estadoActual = "MIRADA";
        iniciarCrossfade(frameActual);
      }

      opcionesLiana = { visible: true, opacidad: 1 };

      if (estadoActual === "BALANCEO") {
        tiempoBalanceo += dt;
        const idxBalanceo = Math.floor(tiempoBalanceo * 24) % 122;
        frameGorilaActual = seqBalanceo ? seqBalanceo.obtener(idxBalanceo) : null;

        if (idxBalanceo >= 121 || idxBalanceo === 0) {
          estadoActual = "GRITO";
          tiempoGrito = 0;
          timerGrito30s = 0;
        }
      } else if (estadoActual === "GRITO") {
        tiempoGrito += dt;
        const idxGrito = Math.floor(tiempoGrito * 24);

        if (idxGrito < 122) {
          frameGorilaActual = seqGrito ? seqGrito.obtener(idxGrito) : null;

          if (idxGrito >= 14 && idxGrito <= 74) {
            if (elEscena) elEscena.classList.add("temblor");
            if (elVinieta) elVinieta.classList.add("cerrada");
          } else {
            if (elEscena) elEscena.classList.remove("temblor");
            if (elVinieta) elVinieta.classList.remove("cerrada");
          }
        } else {
          estadoActual = "MIRADA";
          timerGrito30s = 0;
          if (elEscena) elEscena.classList.remove("temblor");
          if (elVinieta) elVinieta.classList.remove("cerrada");
        }
      }

      if (estadoActual === "MIRADA") {
        if (elEscena) elEscena.classList.remove("temblor");
        if (elVinieta) elVinieta.classList.remove("cerrada");

        timerGrito30s += dt;
        if (timerGrito30s >= 30) {
          const frameActual = obtenerFrameSegunEstado();
          estadoActual = "GRITO";
          tiempoGrito = 0;
          timerGrito30s = 0;
          iniciarCrossfade(frameActual);
        }

        let idxMirada = 36;
        if (pxActual <= 0.5) {
          idxMirada = 24 + (pxActual / 0.5) * (36 - 24);
        } else {
          idxMirada = 36 + ((pxActual - 0.5) / 0.5) * (45 - 36);
        }
        frameGorilaActual = seqMirada ? seqMirada.obtener(idxMirada) : null;
      }

    } else if (scrollSuave >= 0.80 && scrollSuave < 0.99) {
      // TRAMO 3: BAJADA
      if (elEscena) elEscena.classList.remove("temblor");
      if (elVinieta) elVinieta.classList.remove("cerrada");

      if (estadoActual !== "BAJADA") {
        const frameActual = obtenerFrameSegunEstado();
        estadoActual = "BAJADA";
        iniciarCrossfade(frameActual);
      }

      const pBajada = (scrollSuave - 0.80) / 0.19;
      const idxBajada = mapearFrameBajada(pBajada);
      frameGorilaActual = seqBajada ? seqBajada.obtener(idxBajada) : (seqMirada ? seqMirada.obtener(36) : null);

      // Manejo de liana en bajada (desaparece tras cuadro 40 con fundido de 200ms)
      if (idxBajada <= 40) {
        opcionesLiana = { visible: true, opacidad: 1 };
      } else if (idxBajada <= 45) {
        const op = Math.max(0, 1 - (idxBajada - 40) / 5);
        opcionesLiana = { visible: true, opacidad: op };
      } else {
        opcionesLiana = { visible: false, opacidad: 0 };
      }

      // Caída (cuadros 39-54): desenfoque vertical de movimiento
      let filtroBlur = "none";
      if (idxBajada >= 39 && idxBajada <= 54) {
        filtroBlur = "blur(2px)";
      }

      // Golpe de cámara y sombra de contacto al aterrizar (cuadros 115-124)
      if (idxBajada >= 115) {
        if (elSombraPiso) elSombraPiso.classList.add("visible");
        if (idxBajada >= 118 && idxBajada <= 122) {
          if (elEscena) elEscena.classList.add("temblor");
        } else {
          if (elEscena) elEscena.classList.remove("temblor");
        }
      } else {
        if (elSombraPiso) elSombraPiso.classList.remove("visible");
      }

      const baseLeft = window.innerWidth >= 900 ? "58%" : "50%";
      if (elContenedorGorila) {
        elContenedorGorila.style.left = baseLeft;
        elContenedorGorila.style.top = "0px";
        elContenedorGorila.style.transform = `translate(-50%, 0) scale(0.95)`;
        elContenedorGorila.style.filter = filtroBlur;
      }

    } else {
      // TRAMO 4: SUELO (100% scroll)
      if (elEscena) elEscena.classList.remove("temblor");
      if (elVinieta) elVinieta.classList.remove("cerrada");
      if (elSombraPiso) elSombraPiso.classList.add("visible");
      opcionesLiana = { visible: false, opacidad: 0 };

      if (estadoActual !== "SUELO") {
        estadoActual = "SUELO";
        clipSueloActual = "a";
        sueloSubEstado = "ANIMANDO";
        sueloFrameIndex = 0;
      }

      if (sueloSubEstado === "ANIMANDO") {
        sueloFrameIndex += dt * 20;
        if (sueloFrameIndex >= 101) {
          sueloFrameIndex = 101;
          sueloSubEstado = "PAUSA";
          sueloTiempoPausa = 1 + Math.random() * 3;
        }
      } else {
        sueloTiempoPausa -= dt;
        if (sueloTiempoPausa <= 0) {
          const opciones = ["a", "b", "c"].filter((x) => x !== clipSueloActual);
          clipSueloActual = opciones[Math.floor(Math.random() * opciones.length)];
          sueloSubEstado = "ANIMANDO";
          sueloFrameIndex = 0;
        }
      }

      const seqActualSuelo =
        clipSueloActual === "a" ? seqSueloA :
        clipSueloActual === "b" ? seqSueloB : seqSueloC;

      frameGorilaActual = seqActualSuelo
        ? seqActualSuelo.obtener(Math.floor(sueloFrameIndex))
        : (seqBajada ? seqBajada.obtener(124) : (seqMirada ? seqMirada.obtener(36) : null));

      const targetX = (pxActual - 0.5) * 8;
      sueloOffsetX = amortiguar(sueloOffsetX, targetX, 0.05, dt);

      const baseLeft = window.innerWidth >= 900 ? "58%" : "50%";
      if (elContenedorGorila) {
        elContenedorGorila.style.left = baseLeft;
        elContenedorGorila.style.top = "0px";
        elContenedorGorila.style.transform = `translate(calc(-50% + ${sueloOffsetX}vw), 0) scale(0.95)`;
        elContenedorGorila.style.filter = "none";
      }
    }

    // Dibujado con Crossfade si está activo
    if (crossfadeActivo) {
      crossfadeTiempo += dt;
      const alfa2 = Math.min(1.0, crossfadeTiempo / CROSSFADE_DURACION);
      dibujarGorila(crossfadeFrameSalida, frameGorilaActual, alfa2, opcionesLiana);
      if (crossfadeTiempo >= CROSSFADE_DURACION) {
        crossfadeActivo = false;
        crossfadeFrameSalida = null;
      }
    } else {
      dibujarGorila(frameGorilaActual, null, 0, opcionesLiana);
    }
  });

  /* --- Gestor de Textos --- */
  function actualizarTextos(p) {
    if (p < 0.30) {
      if (elTexto1) elTexto1.classList.add("visible");
      if (elTexto2) elTexto2.classList.remove("visible");
      if (elTexto3) elTexto3.classList.remove("visible");
      if (elTexto4) elTexto4.classList.remove("visible");
    } else if (p >= 0.30 && p < 0.55) {
      if (elTexto1) elTexto1.classList.remove("visible");
      if (elTexto2) elTexto2.classList.add("visible");
      if (elTexto3) elTexto3.classList.remove("visible");
      if (elTexto4) elTexto4.classList.remove("visible");
    } else if (p >= 0.55 && p < 0.80) {
      if (elTexto1) elTexto1.classList.remove("visible");
      if (elTexto2) elTexto2.classList.remove("visible");
      if (elTexto3) elTexto3.classList.add("visible");
      if (elTexto4) elTexto4.classList.remove("visible");
    } else {
      if (elTexto1) elTexto1.classList.remove("visible");
      if (elTexto2) elTexto2.classList.remove("visible");
      if (elTexto3) elTexto3.classList.remove("visible");
      if (elTexto4) elTexto4.classList.add("visible");
    }
  }

  /* --- Conexión con Scroll --- */
  function iniciarExperiencia() {
    escenario(elEscenario, (p) => {
      progresoScroll = p;
    }, { suavizar: 0.1 });
  }
});
