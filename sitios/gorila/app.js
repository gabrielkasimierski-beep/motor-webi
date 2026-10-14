import { crearCuadros } from "./lib/cuadros.js";
import { escenario, alScroll, bucle, amortiguar, limitar, mapear, reducido } from "./lib/motor-scroll.js";
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

  // Selección de resolución de fondo
  const usa720 = window.innerWidth <= 768;
  const patronFondo = usa720
    ? "./medios/fondo-720/fondo-###.webp"
    : "./medios/fondo-1080/fondo-###.webp";

  // Instancias de películas por cuadros
  let pelFondo = null;
  let pelBalanceo = null;
  let pelMirada = null;
  let pelGrito = null;
  let pelBajada = null;
  let pelSuelo = null;

  // Película activa actual en el canvas del gorila para evitar que cargas en background pisen el dibujo
  let peliculaActivaGorila = null;

  // Wrapper para llamar a irA / ir en la película activa sin colisiones
  function mostrarCuadroGorila(pel, indice) {
    peliculaActivaGorila = pel;
    pel.irA(indice);
  }

  // Estado global de carga
  const cargas = {
    fondo: 0,
    balanceo: 0,
    mirada: 0,
    grito: 0
  };

  function actualizarProgresoCarga() {
    const totalCritico = (cargas.fondo + cargas.balanceo + cargas.mirada + cargas.grito) / 4;
    const porcentaje = Math.min(100, Math.floor(totalCritico * 100));
    if (elProgresoBarra) elProgresoBarra.style.width = `${porcentaje}%`;
    if (elProgresoTexto) elProgresoTexto.textContent = `${porcentaje}%`;
  }

  // Interceptar alCargar para que si una película no activa se carga en background, no pise el canvas si no es la activa
  function crearConGuardia(canvas, opciones, clavePelicula) {
    const origAlCargar = opciones.alCargar;
    return crearCuadros(canvas, {
      ...opciones,
      alCargar: (p) => {
        if (origAlCargar) origAlCargar(p);
      }
    });
  }

  // Inicializar películas críticas
  pelFondo = crearCuadros(elCanvasFondo, {
    fuente: patronFondo,
    total: 63,
    encaje: "cubrir",
    alCargar: (p) => { cargas.fondo = p; actualizarProgresoCarga(); }
  });

  pelBalanceo = crearCuadros(elCanvasGorila, {
    fuente: "./medios/balanceo/balanceo-###.webp",
    total: 61,
    encaje: "contener",
    alCargar: (p) => { cargas.balanceo = p; actualizarProgresoCarga(); }
  });

  pelMirada = crearCuadros(elCanvasGorila, {
    fuente: "./medios/mirada/mirada-###.webp",
    total: 61,
    encaje: "contener",
    alCargar: (p) => { cargas.mirada = p; actualizarProgresoCarga(); }
  });

  pelGrito = crearCuadros(elCanvasGorila, {
    fuente: "./medios/grito/grito-###.webp",
    total: 63,
    encaje: "contener",
    alCargar: (p) => { cargas.grito = p; actualizarProgresoCarga(); }
  });

  // Carga secundaria (después de desbloquear vista)
  let peliculasSecundariasCargadas = false;
  function cargarSecundarias() {
    if (peliculasSecundariasCargadas) return;
    peliculasSecundariasCargadas = true;

    pelBajada = crearCuadros(elCanvasGorila, {
      fuente: "./medios/bajada/bajada-###.webp",
      total: 78,
      encaje: "contener"
    });

    pelSuelo = crearCuadros(elCanvasGorila, {
      fuente: "./medios/suelo/suelo-###.webp",
      total: 63,
      encaje: "contener"
    });
  }

  // Esperar a que la carga crítica se complete
  Promise.all([pelFondo.lista, pelBalanceo.lista, pelMirada.lista, pelGrito.lista])
    .then(() => {
      if (elCargador) elCargador.classList.add("oculto");
      iniciarExperiencia();
      cargarSecundarias();
    })
    .catch((err) => {
      console.error("Error cargando cuadros críticos:", err);
      if (elCargador) elCargador.classList.add("oculto");
      iniciarExperiencia();
      cargarSecundarias();
    });

  /* -------------------------------------------------------------
     LÓGICA DE INTERACCIÓN Y ESTADOS
  ------------------------------------------------------------- */
  let estadoActual = "tramo1"; // "tramo1", "llegada", "tramo2", "tramo3", "final"
  let progresoScroll = 0;

  // Timers y animación de grito
  let gritoEnEjecucion = false;
  let timerGritoRepetitivo = null;
  let gritoTiempoInicio = 0;

  // Interacción con Puntero (Tramo 2)
  const miPuntero = puntero(document.body, { suavizar: 0.12 });

  // Pauta para animación de `suelo` en bumerán (Final)
  let sueloDireccion = 1; // 1 = adelante, -1 = atrás
  let sueloIndiceActual = 0;
  let sueloTiempoPausa = 0;
  let sueloEspejado = false;
  let sueloOffsetX = 0;

  // Bucle principal de render / actualización
  let bucleConsola = bucle((t, dt) => {
    if (reducido()) {
      // Modo movimiento reducido
      pelFondo.ir(0);
      mostrarCuadroGorila(pelMirada, 0);
      if (elContenedorGorila) {
        elContenedorGorila.style.transform = "translate(-50%, -50%) scale(0.85)";
        elContenedorGorila.style.filter = "none";
      }
      return;
    }

    // Actualizar fondo según scroll (0..1 -> 0..62)
    pelFondo.ir(progresoScroll);

    // Gestor de Textos
    actualizarTextos(progresoScroll);

    // Determinación de Tramo
    if (progresoScroll < 0.35) {
      // TRAMO 1 (0 - 35%)
      estadoActual = "tramo1";
      elSombraPiso.classList.remove("visible");
      ejecutarTramo1(t, dt, progresoScroll);
    } else if (progresoScroll >= 0.35 && progresoScroll < 0.80) {
      // TRAMO 2 (35% - 80%)
      if (estadoActual === "tramo1") {
        // Recién llegado al 35%
        estadoActual = "tramo2";
        dispararGrito();
        iniciarTimerGrito();
      } else {
        estadoActual = "tramo2";
      }
      elSombraPiso.classList.remove("visible");
      ejecutarTramo2(t, dt, progresoScroll);
    } else if (progresoScroll >= 0.80 && progresoScroll < 1.0) {
      // TRAMO 3 (80% - 100%)
      estadoActual = "tramo3";
      limpiarTimerGrito();
      ejecutarTramo3(t, dt, progresoScroll);
    } else {
      // FINAL (100%)
      estadoActual = "final";
      limpiarTimerGrito();
      ejecutarFinal(t, dt);
    }
  });

  /* --- TRAMO 1: Aparición y péndulo --- */
  function ejecutarTramo1(t, dt, p) {
    if (gritoEnEjecucion) {
      detenerGrito();
    }

    const pTramo = mapear(p, 0, 0.35, 0, 1);
    const cuadroBalanceo = (Math.floor(t * 12) % 61);
    mostrarCuadroGorila(pelBalanceo, cuadroBalanceo);

    const escala = 0.15 + (0.85 - 0.15) * pTramo;
    const desvioX = Math.sin(pTramo * Math.PI * 2) * 15;
    const desenfoque = (1 - pTramo) * 3;
    const contraste = 0.8 + 0.2 * pTramo;

    elContenedorGorila.style.transform = `translate(calc(-50% + ${desvioX}vw), -50%) scale(${escala})`;
    elContenedorGorila.style.filter = `blur(${desenfoque}px) contrast(${contraste})`;
  }

  /* --- TRAMO 2: Mirada / Puntero / Grito ocasional --- */
  function ejecutarTramo2(t, dt, p) {
    elContenedorGorila.style.transform = `translate(-50%, -50%) scale(0.85)`;
    elContenedorGorila.style.filter = "none";

    if (gritoEnEjecucion) {
      const tiempoTranscurrido = t - gritoTiempoInicio;
      const cuadroGrito = Math.floor(tiempoTranscurrido * 12);

      if (cuadroGrito < 63) {
        mostrarCuadroGorila(pelGrito, cuadroGrito);

        if (cuadroGrito >= 25 && cuadroGrito <= 50) {
          elEscena.classList.add("temblor");
          elVinieta.classList.add("cerrada");
        } else {
          elEscena.classList.remove("temblor");
          elVinieta.classList.remove("cerrada");
        }
      } else {
        detenerGrito();
      }
    } else {
      let frameMirada = 0;

      if (miPuntero.tipo === "touch" || !miPuntero.dentro) {
        const oscilacion = 0.5 + 0.5 * Math.sin(t * 0.8);
        frameMirada = calcularFrameMirada(oscilacion);
      } else {
        frameMirada = calcularFrameMirada(miPuntero.x);
      }

      mostrarCuadroGorila(pelMirada, frameMirada);
    }
  }

  function calcularFrameMirada(x) {
    if (x < 0.45) {
      return Math.round(mapear(x, 0, 0.45, 22, 1));
    } else if (x > 0.55) {
      return Math.round(mapear(x, 0.55, 1, 1, 42));
    } else {
      return 0;
    }
  }

  /* --- TRAMO 3: Bajada al piso --- */
  function ejecutarTramo3(t, dt, p) {
    detenerGrito();

    const pTramo = mapear(p, 0.80, 1.0, 0, 1);
    const cuadroBajada = Math.min(77, Math.floor(pTramo * 78));

    if (pelBajada) {
      mostrarCuadroGorila(pelBajada, cuadroBajada);
    } else {
      mostrarCuadroGorila(pelMirada, 0);
    }

    elContenedorGorila.style.transform = `translate(-50%, -50%) scale(0.85)`;
    elContenedorGorila.style.filter = "none";

    if (pTramo > 0.95) {
      elSombraPiso.classList.add("visible");
    } else {
      elSombraPiso.classList.remove("visible");
    }
  }

  /* --- FINAL: Suelo en bumerán --- */
  function ejecutarFinal(t, dt) {
    elSombraPiso.classList.add("visible");

    if (sueloTiempoPausa > 0) {
      sueloTiempoPausa -= dt;
    } else {
      sueloIndiceActual += sueloDireccion * (dt * 12);

      if (sueloIndiceActual >= 62) {
        sueloIndiceActual = 62;
        sueloDireccion = -1;
        sueloTiempoPausa = 0.5 + Math.random() * 1.5;
        sueloEspejado = Math.random() > 0.5;
      } else if (sueloIndiceActual <= 0) {
        sueloIndiceActual = 0;
        sueloDireccion = 1;
        sueloTiempoPausa = 0.5 + Math.random() * 1.5;
      }
    }

    if (pelSuelo) {
      mostrarCuadroGorila(pelSuelo, Math.floor(sueloIndiceActual));
    }

    const targetX = (miPuntero.x - 0.5) * 10;
    sueloOffsetX = amortiguar(sueloOffsetX, targetX, 0.05, dt);

    const transformEspejo = sueloEspejado ? "scaleX(-1)" : "scaleX(1)";
    elContenedorGorila.style.transform = `translate(calc(-50% + ${sueloOffsetX}vw), -50%) scale(0.85) ${transformEspejo}`;
  }

  /* --- Funciones Auxiliares de Grito --- */
  function dispararGrito() {
    if (gritoEnEjecucion) return;
    gritoEnEjecucion = true;
    gritoTiempoInicio = performance.now() / 1000;
  }

  function detenerGrito() {
    gritoEnEjecucion = false;
    elEscena.classList.remove("temblor");
    elVinieta.classList.remove("cerrada");
  }

  function iniciarTimerGrito() {
    limpiarTimerGrito();
    timerGritoRepetitivo = setInterval(() => {
      if (estadoActual === "tramo2") {
        dispararGrito();
      }
    }, 30000);
  }

  function limpiarTimerGrito() {
    if (timerGritoRepetitivo) {
      clearInterval(timerGritoRepetitivo);
      timerGritoRepetitivo = null;
    }
  }

  /* --- Gestor de Textos --- */
  function actualizarTextos(p) {
    if (p < 0.30) {
      elTexto1.classList.add("visible");
      elTexto2.classList.remove("visible");
      elTexto3.classList.remove("visible");
    } else if (p >= 0.30 && p < 0.75) {
      elTexto1.classList.remove("visible");
      elTexto2.classList.add("visible");
      elTexto3.classList.remove("visible");
    } else {
      elTexto1.classList.remove("visible");
      elTexto2.classList.remove("visible");
      elTexto3.classList.add("visible");
    }
  }

  /* --- Conexión con Scroll de Motor WebI --- */
  function iniciarExperiencia() {
    escenario(elEscenario, (p) => {
      progresoScroll = p;
    }, { suavizar: 0.1 });
  }
});
