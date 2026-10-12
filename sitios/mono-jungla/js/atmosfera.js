/* atmosfera.js — Manejador de la transición atmosférica de tiempo de día
   Integra kit/fondo-shader.js para pasar suavemente de Amanecer -> Mediodía -> Atardecer -> Noche. */

import { fondoShader } from "../kit/fondo-shader.js";

// Paletas en formato RGB normalizado para el shader [R, G, B]
const PALETAS_DIA = {
  amanecer: [
    "#0b1812", // Fondo jungla oscura
    "#592d19", // Terracota amanecer
    "#d97706", // Ámbar solar
    "#fef08a", // Luz dorada
    "#10b981"  // Verde follaje matutino
  ],
  mediodia: [
    "#062018", // Verde profundo
    "#047857", // Esmeralda vivo
    "#10b981", // Verde menta brillante
    "#6ee7b7", // Luz turquesa
    "#fef08a"  // Sol cenital
  ],
  atardecer: [
    "#180a1c", // Púrpura noche cayendo
    "#7c2d12", // Rojo atardecer
    "#ea580c", // Naranja encendido
    "#facc15", // Sol del poniente
    "#34d399"  // Contraluz selva
  ],
  noche: [
    "#030712", // Cielo nocturno profundo
    "#064e3b", // Follaje nocturno
    "#0284c7", // Azul estelar
    "#38bdf8", // Brillo místico
    "#a7f3d0"  // Destellos de luciérnagas
  ]
};

export function iniciarAtmosfera(canvasFondo) {
  // Iniciar shader con familia "aurora" / "malla" adaptativa
  const shader = fondoShader(canvasFondo, {
    familia: "aurora",
    paleta: PALETAS_DIA.amanecer,
    velocidad: 0.5,
    grano: 0.04,
    escala: 1.2
  });

  // Elemento para las luciérnagas flotantes en la noche
  let contenedorLuciernagas = document.getElementById("luciernagas");
  if (!contenedorLuciernagas) {
    contenedorLuciernagas = document.createElement("div");
    contenedorLuciernagas.id = "luciernagas";
    contenedorLuciernagas.className = "luciernagas-capa";
    canvasFondo.parentElement.appendChild(contenedorLuciernagas);
    crearLuciernagas(contenedorLuciernagas, 24);
  }

  return {
    actualizar(progreso) {
      // progreso de 0 a 1
      const paletaActual = calcularPaletaInterpolada(progreso);
      shader.cambiar({ paleta: paletaActual });

      // Luces de luciérnagas activas principalmente en la noche (progreso > 0.65)
      const opacidadLuciernagas = Math.max(0, (progreso - 0.65) / 0.35);
      if (contenedorLuciernagas) {
        contenedorLuciernagas.style.opacity = opacidadLuciernagas.toFixed(2);
      }
    },
    destruir() {
      shader.destruir();
      if (contenedorLuciernagas) contenedorLuciernagas.remove();
    }
  };
}

function parseHex(hex) {
  const c = hex.replace("#", "");
  return [
    parseInt(c.substring(0, 2), 16) / 255,
    parseInt(c.substring(2, 4), 16) / 255,
    parseInt(c.substring(4, 6), 16) / 255
  ];
}

function hexString(rgb) {
  const r = Math.round(rgb[0] * 255).toString(16).padStart(2, "0");
  const g = Math.round(rgb[1] * 255).toString(16).padStart(2, "0");
  const b = Math.round(rgb[2] * 255).toString(16).padStart(2, "0");
  return `#${r}${g}${b}`;
}

function mezclarColor(c1Hex, c2Hex, k) {
  const rgb1 = parseHex(c1Hex);
  const rgb2 = parseHex(c2Hex);
  const res = [
    rgb1[0] + (rgb2[0] - rgb1[0]) * k,
    rgb1[1] + (rgb2[1] - rgb1[1]) * k,
    rgb1[2] + (rgb2[2] - rgb1[2]) * k
  ];
  return hexString(res);
}

function calcularPaletaInterpolada(p) {
  // Tramos:
  // 0.00 - 0.30: Amanecer -> Mediodía
  // 0.30 - 0.65: Mediodía -> Atardecer
  // 0.65 - 1.00: Atardecer -> Noche
  let de, a, k;

  if (p < 0.30) {
    de = PALETAS_DIA.amanecer;
    a = PALETAS_DIA.mediodia;
    k = p / 0.30;
  } else if (p < 0.65) {
    de = PALETAS_DIA.mediodia;
    a = PALETAS_DIA.atardecer;
    k = (p - 0.30) / 0.35;
  } else {
    de = PALETAS_DIA.atardecer;
    a = PALETAS_DIA.noche;
    k = (p - 0.65) / 0.35;
  }

  return de.map((cHex, i) => mezclarColor(cHex, a[i], k));
}

function crearLuciernagas(contenedor, cantidad) {
  contenedor.innerHTML = "";
  for (let i = 0; i < cantidad; i++) {
    const l = document.createElement("span");
    l.className = "luciernaga";
    const x = Math.random() * 100;
    const y = Math.random() * 100;
    const dur = 3 + Math.random() * 4;
    const delay = Math.random() * 5;
    l.style.cssText = `left:${x}%; top:${y}%; animation-duration:${dur}s; animation-delay:${delay}s;`;
    contenedor.appendChild(l);
  }
}
