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
     CARGADOR DE SECUENCIAS DE IMÁGENES
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
      for (let i = 0; i < total; i++) {
        const img = new Image();
        img.decoding = "async";
        img.src = urlDeCuadro(patron, i);

        const alTerminar = () => {
          cargados++;
          if (alProgreso) alProgreso(cargados / total);
          if (cargados === total && !finalizado) {
            finalizado = true;
            resolve(imagenes);
          }
        };

        // decode() puede rechazar aunque la imagen ya haya cargado: si se espera
        // onload recién en el catch, ese evento ya pasó y el cargador queda colgado.
        img.decode().catch(() => (img.complete && img.naturalWidth ? null : Promise.reject()))
          .then(() => {
            imagenes[i] = img;
            if (!ultimoValido) ultimoValido = img;
          })
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

  // Seguimiento de carga crítica (fondo + balanceo + grito + mirada)
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

  // Secuencias secundarias
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
    seqMirada.promesa
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
     SISTEMA DE MÁQUINA DE ESTADOS Y RENDERIZADO
  ------------------------------------------------------------- */
  let estadoActual = "BALANCEO"; // "BALANCEO", "GRITO", "MIRADA", "BAJADA", "SUELO"
  let progresoScroll = 0;
  let scrollSuave = 0;

  // Interacción
  const miPuntero = puntero(document.body, { suavizar: 0.12 });
  let inerciaRotacion = 0;
  let inerciaTranslateX = 0;
  let sueloOffsetX = 0;

  // Tiempos e índices de animación
  let tiempoBalanceo = 0;
  let tiempoGrito = 0;
  let timerGrito30s = 0;

  // Suelo state
  let clipSueloActual = "a"; // "a", "b", "c"
  let sueloSubEstado = "ANIMANDO"; // "ANIMANDO", "PAUSA"
  let sueloFrameIndex = 0;
  let sueloTiempoPausa = 0;

  // Crossfade state
  let crossfadeActivo = false;
  let crossfadeTiempo = 0;
  const CROSSFADE_DURACION = 0.25; // 250ms
  let crossfadeFrameSalida = null;

  // Resize canvas gorila
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

  function dibujarGorila(frame1, frame2 = null, alfa2 = 0) {
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
      dibujarGorila(imgP0);
      if (elContenedorGorila) {
        elContenedorGorila.style.left = window.innerWidth >= 900 ? "58%" : "50%";
        elContenedorGorila.style.transform = "translate(-50%, 0) scale(0.85)";
        elContenedorGorila.style.filter = "none";
      }
      return;
    }

    // Suavizado de scroll
    scrollSuave = amortiguar(scrollSuave, progresoScroll, 0.12, dt);

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

      // Temblor/Viñeta apagados
      if (elEscena) elEscena.classList.remove("temblor");
      if (elVinieta) elVinieta.classList.remove("cerrada");
      if (elSombraPiso) elSombraPiso.classList.remove("visible");

      // Transformación Tramo 1
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
      // TRAMO 2: GRITO / MIRADA
      const baseLeft = window.innerWidth >= 900 ? "58%" : "50%";
      if (elContenedorGorila) {
        elContenedorGorila.style.left = baseLeft;
        elContenedorGorila.style.top = "0px";
        elContenedorGorila.style.transform = `translate(calc(-50% + ${inerciaTranslateX}vw), 0) scale(0.85) rotate(${inerciaRotacion}deg)`;
        elContenedorGorila.style.filter = "none";
      }
      if (elSombraPiso) elSombraPiso.classList.remove("visible");

      // Si se rebobina desde BAJADA o SUELO: volver a MIRADA
      if (estadoActual === "BAJADA" || estadoActual === "SUELO") {
        const frameActual = obtenerFrameSegunEstado();
        estadoActual = "MIRADA";
        iniciarCrossfade(frameActual);
      }

      // Si veníamos de BALANCEO: esperar a terminar el ciclo hasta el cuadro 122 (idx 121)
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

          // Golpe de pecho (cuadros ~15 a 75)
          if (idxGrito >= 14 && idxGrito <= 74) {
            if (elEscena) elEscena.classList.add("temblor");
            if (elVinieta) elVinieta.classList.add("cerrada");
          } else {
            if (elEscena) elEscena.classList.remove("temblor");
            if (elVinieta) elVinieta.classList.remove("cerrada");
          }
        } else {
          // Finalizó grito -> pasar a MIRADA
          estadoActual = "MIRADA";
          timerGrito30s = 0;
          if (elEscena) elEscena.classList.remove("temblor");
          if (elVinieta) elVinieta.classList.remove("cerrada");
        }
      }

      if (estadoActual === "MIRADA") {
        if (elEscena) elEscena.classList.remove("temblor");
        if (elVinieta) elVinieta.classList.remove("cerrada");

        // Timer de 30s para volver a gritar
        timerGrito30s += dt;
        if (timerGrito30s >= 30) {
          const frameActual = obtenerFrameSegunEstado();
          estadoActual = "GRITO";
          tiempoGrito = 0;
          timerGrito30s = 0;
          iniciarCrossfade(frameActual);
        }

        // Mapeo puntero 025 -> 046 (índices 24..45)
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

      const baseLeft = window.innerWidth >= 900 ? "58%" : "50%";
      if (elContenedorGorila) {
        elContenedorGorila.style.left = baseLeft;
        elContenedorGorila.style.top = "0px";
        elContenedorGorila.style.transform = `translate(-50%, 0) scale(0.85)`;
        elContenedorGorila.style.filter = "none";
      }

      if (pBajada > 0.8) {
        if (elSombraPiso) elSombraPiso.classList.add("visible");
      } else {
        if (elSombraPiso) elSombraPiso.classList.remove("visible");
      }

    } else {
      // TRAMO 4: SUELO (100% scroll)
      if (elEscena) elEscena.classList.remove("temblor");
      if (elVinieta) elVinieta.classList.remove("cerrada");
      if (elSombraPiso) elSombraPiso.classList.add("visible");

      if (estadoActual !== "SUELO") {
        estadoActual = "SUELO";
        clipSueloActual = "a";
        sueloSubEstado = "ANIMANDO";
        sueloFrameIndex = 0;
      }

      // Animación / Pausa en Suelo
      if (sueloSubEstado === "ANIMANDO") {
        sueloFrameIndex += dt * 20; // 20 fps
        if (sueloFrameIndex >= 101) {
          sueloFrameIndex = 101;
          sueloSubEstado = "PAUSA";
          sueloTiempoPausa = 1 + Math.random() * 3; // 1-4s
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
        elContenedorGorila.style.transform = `translate(calc(-50% + ${sueloOffsetX}vw), 0) scale(0.85)`;
        elContenedorGorila.style.filter = "none";
      }
    }

    // Dibujado con Crossfade si está activo
    if (crossfadeActivo) {
      crossfadeTiempo += dt;
      const alfa2 = Math.min(1.0, crossfadeTiempo / CROSSFADE_DURACION);
      dibujarGorila(crossfadeFrameSalida, frameGorilaActual, alfa2);
      if (crossfadeTiempo >= CROSSFADE_DURACION) {
        crossfadeActivo = false;
        crossfadeFrameSalida = null;
      }
    } else {
      dibujarGorila(frameGorilaActual);
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
