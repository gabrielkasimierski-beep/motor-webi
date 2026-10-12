/* escena-mono.js — Generador procedimental de la escena del mono en la jungla.
   Genera 120 cuadros en un Canvas fuera de pantalla y se conecta con kit/cuadros.js
   sin modificar la pieza del kit ni requerir archivos externos. */

const TOTAL_CUADROS = 120;
const ANCHO_FRAME = 960;
const ALTO_FRAME = 540;

// Almacén de blobs en memoria para el interceptor de fetch
const mapaBlobs = new Map();
let fetchInterceptado = false;

function interceptarFetch() {
  if (fetchInterceptado || typeof window === "undefined") return;
  fetchInterceptado = true;
  const originalFetch = window.fetch;
  window.fetch = function (recurso, op) {
    const url = typeof recurso === "string" ? recurso : recurso && recurso.url;
    if (url && mapaBlobs.has(url)) {
      const blob = mapaBlobs.get(url);
      return Promise.resolve(new Response(blob, { status: 200, headers: { "content-type": "image/png" } }));
    }
    return originalFetch.apply(this, arguments);
  };
}

// Genera los 120 cuadros y devuelve la configuración para `crearCuadros`
export async function prepararCuadrosMono(alProgreso) {
  interceptarFetch();

  const canvas = document.createElement("canvas");
  canvas.width = ANCHO_FRAME;
  canvas.height = ALTO_FRAME;
  const ctx = canvas.getContext("2d");

  // Parámetros de la jungla y las 4 lianas
  const lianas = [
    { x: 160, yAnchor: -40, largo: 340 },
    { x: 400, yAnchor: -30, largo: 350 },
    { x: 650, yAnchor: -50, largo: 360 },
    { x: 840, yAnchor: -30, largo: 330 },
  ];

  // Partículas y hojas cayendo
  const hojas = Array.from({ length: 22 }, (_, i) => ({
    xBase: (i * 47) % ANCHO_FRAME,
    yVel: 120 + (i % 5) * 40,
    rotSpeed: 2 + (i % 4),
    tam: 8 + (i % 7),
    color: i % 2 === 0 ? "#22c55e" : "#eab308",
  }));

  for (let i = 0; i < TOTAL_CUADROS; i++) {
    const p = i / (TOTAL_CUADROS - 1);
    renderizarCuadro(ctx, p, lianas, hojas);

    // Convertir canvas a Blob
    const blob = await new Promise((res) => canvas.toBlob(res, "image/png"));
    const url = `procedural/mono-toma-${String(i + 1).padStart(4, "0")}.png`;
    mapaBlobs.set(url, blob);

    if (alProgreso) alProgreso((i + 1) / TOTAL_CUADROS);
  }

  return {
    fuente: "procedural/mono-toma-####.png",
    total: TOTAL_CUADROS,
  };
}

function renderizarCuadro(ctx, p, lianas, hojas) {
  const w = ANCHO_FRAME;
  const h = ALTO_FRAME;

  ctx.clearRect(0, 0, w, h);

  // 1. Fondo Selva Distante (Capa 0)
  dibujarFondoSiluetas(ctx, w, h, p);

  // 2. Rayos de Luz Solar (Capa 1)
  dibujarRayosLuz(ctx, w, h, p);

  // 3. Arboles & Niebla de Fondo (Capa 2)
  dibujarNieblaYArboles(ctx, w, h, p);

  // 4. Lianas & Follaje Colgante (Capa 3)
  const posMono = calcularPosicionMono(p, lianas);
  dibujarLianas(ctx, lianas, posMono, p);

  // 5. El Mono (Capa 4)
  dibujarMono(ctx, posMono, p);

  // 6. Hojas Cayendo & Luces en Primer Plano (Capa 5)
  dibujarPrimerPlano(ctx, w, h, p, hojas);
}

// ----- Capa 0: Fondo & Siluetas -----
function dibujarFondoSiluetas(ctx, w, h, p) {
  // Gradiente base de cielo/jungla profunda
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, "#091a13");
  grad.addColorStop(0.5, "#0f2e22");
  grad.addColorStop(1, "#07140e");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Siluetas lejanas de árboles montañosos
  ctx.fillStyle = "#091f16";
  ctx.beginPath();
  ctx.moveTo(0, h);
  for (let x = 0; x <= w; x += 20) {
    const y = h - 140 - Math.sin(x * 0.01 + p * 2) * 30 - Math.cos(x * 0.02) * 20;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();
}

// ----- Capa 1: Rayos de Luz -----
function dibujarRayosLuz(ctx, w, h, p) {
  ctx.save();
  ctx.globalCompositeOperation = "screen";

  const numRayos = 5;
  for (let r = 0; r < numRayos; r++) {
    const rx = 100 + r * 180 + Math.sin(p * Math.PI + r) * 20;
    const gradRay = ctx.createLinearGradient(rx, 0, rx + 120, h);
    gradRay.addColorStop(0, "rgba(253, 224, 71, 0.12)");
    gradRay.addColorStop(0.7, "rgba(52, 211, 153, 0.05)");
    gradRay.addColorStop(1, "rgba(0, 0, 0, 0)");

    ctx.fillStyle = gradRay;
    ctx.beginPath();
    ctx.moveTo(rx, 0);
    ctx.lineTo(rx + 60, 0);
    ctx.lineTo(rx + 220, h);
    ctx.lineTo(rx + 110, h);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

// ----- Capa 2: Arboles Intermedios & Niebla -----
function dibujarNieblaYArboles(ctx, w, h, p) {
  // Troncos lejanos
  ctx.fillStyle = "#123829";
  const troncos = [80, 260, 520, 780, 910];
  troncos.forEach((tx) => {
    ctx.fillRect(tx, 0, 35, h);
  });

  // Capa de niebla suave
  const nieblaGrad = ctx.createLinearGradient(0, h * 0.4, 0, h);
  nieblaGrad.addColorStop(0, "rgba(20, 60, 45, 0)");
  nieblaGrad.addColorStop(0.6, "rgba(30, 80, 58, 0.25)");
  nieblaGrad.addColorStop(1, "rgba(10, 30, 22, 0.5)");
  ctx.fillStyle = nieblaGrad;
  ctx.fillRect(0, h * 0.3, w, h * 0.7);
}

// ----- Cálculo de Trayectoria del Mono -----
function calcularPosicionMono(p, lianas) {
  // Hay 3 tramos de salto entre 4 lianas
  const tramos = 3;
  const progresoTramo = p * tramos;
  const indiceTramo = Math.min(Math.floor(progresoTramo), tramos - 1);
  const u = progresoTramo - indiceTramo; // 0..1 dentro del tramo

  const L1 = lianas[indiceTramo];
  const L2 = lianas[indiceTramo + 1];

  // Fase 1: Pendulo en L1 (u: 0 -> 0.72)
  // Fase 2: Vuelo libre a L2 (u: 0.72 -> 0.90)
  // Fase 3: Agarre/absorción en L2 (u: 0.90 -> 1.0)

  if (u < 0.72) {
    const tPend = u / 0.72; // 0..1
    const maxAng = 0.55 - indiceTramo * 0.05;
    const ang = -maxAng + tPend * (maxAng * 1.8);
    const x = L1.x + Math.sin(ang) * L1.largo;
    const y = L1.yAnchor + Math.cos(ang) * L1.largo;
    const vx = Math.cos(ang) * L1.largo * 0.8;
    const vy = -Math.sin(ang) * L1.largo * 0.8;

    return {
      x,
      y,
      ang,
      enVuelo: false,
      lianaActiva: indiceTramo,
      progresoLiana: tPend,
      vx,
      vy,
      alcanzado: false,
    };
  } else if (u < 0.9) {
    const tVuelo = (u - 0.72) / (0.9 - 0.72); // 0..1
    const angSalida = 0.5 - indiceTramo * 0.05;
    const x1 = L1.x + Math.sin(angSalida) * L1.largo;
    const y1 = L1.yAnchor + Math.cos(angSalida) * L1.largo;

    const angLlegada = -0.45;
    const x2 = L2.x + Math.sin(angLlegada) * L2.largo;
    const y2 = L2.yAnchor + Math.cos(angLlegada) * L2.largo;

    // Arco de parábola en el aire
    const x = x1 + (x2 - x1) * tVuelo;
    const caidaParabola = Math.sin(tVuelo * Math.PI) * -65;
    const y = y1 + (y2 - y1) * tVuelo + caidaParabola;

    return {
      x,
      y,
      ang: (tVuelo - 0.5) * 0.4,
      enVuelo: true,
      lianaOrigen: indiceTramo,
      lianaDestino: indiceTramo + 1,
      progresoVuelo: tVuelo,
      vx: (x2 - x1) / 0.18,
      vy: (y2 - y1) / 0.18,
      alcanzado: false,
    };
  } else {
    const tLlegada = (u - 0.9) / 0.1; // 0..1
    const angLlegada = -0.45 + tLlegada * 0.15;
    const x = L2.x + Math.sin(angLlegada) * L2.largo;
    const y = L2.yAnchor + Math.cos(angLlegada) * L2.largo;

    return {
      x,
      y,
      ang: angLlegada,
      enVuelo: false,
      lianaActiva: indiceTramo + 1,
      progresoLiana: 0,
      vx: 20,
      vy: -10,
      alcanzado: true,
    };
  }
}

// ----- Capa 3: Dibujo de Lianas -----
function dibujarLianas(ctx, lianas, posMono, p) {
  lianas.forEach((liana, idx) => {
    ctx.save();
    ctx.strokeStyle = "#2d5a3f";
    ctx.lineWidth = 6;
    ctx.lineCap = "round";

    let xEnd = liana.x;
    let yEnd = liana.yAnchor + liana.largo;

    if (!posMono.enVuelo && posMono.lianaActiva === idx) {
      xEnd = posMono.x;
      yEnd = posMono.y - 30; // Se engancha de las manos del mono
    } else {
      // Balanceo libre suave
      const osc = Math.sin(p * Math.PI * 4 + idx) * 15;
      xEnd = liana.x + osc;
    }

    // Dibujo de la liana curva con catenaria suave
    const cx = (liana.x + xEnd) / 2 + Math.sin(idx + p) * 12;
    const cy = (liana.yAnchor + yEnd) / 2;

    ctx.beginPath();
    ctx.moveTo(liana.x, liana.yAnchor);
    ctx.quadraticCurveTo(cx, cy, xEnd, yEnd);
    ctx.stroke();

    // Hojas pequeñas brotando de la liana
    ctx.fillStyle = "#34d399";
    for (let k = 0.2; k < 0.9; k += 0.2) {
      const hx = liana.x + (xEnd - liana.x) * k;
      const hy = liana.yAnchor + (yEnd - liana.yAnchor) * k;
      ctx.beginPath();
      ctx.ellipse(hx + 6, hy, 8, 4, Math.PI / 4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  });
}

// ----- Capa 4: Dibujo del Mono Vectorial -----
function dibujarMono(ctx, pos, p) {
  ctx.save();
  ctx.translate(pos.x, pos.y);
  ctx.rotate(pos.ang);

  // Paleta del mono
  const cPiel = "#f3a362";
  const cPelaje = "#7c3a00";
  const cPelajeOsc = "#522600";
  const cDetalle = "#fff";

  // Cola curvada y expresiva (Bezier)
  ctx.strokeStyle = cPelaje;
  ctx.lineWidth = 7;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-10, 15);
  const tailCurl = Math.sin(p * Math.PI * 8) * 30;
  ctx.bezierCurveTo(-35, 30, -45 + tailCurl, -10, -30 + tailCurl, -35);
  ctx.stroke();

  // Cuerpo / Torso
  ctx.fillStyle = cPelaje;
  ctx.beginPath();
  ctx.ellipse(0, 5, 20, 26, 0, 0, Math.PI * 2);
  ctx.fill();

  // Pecho / Panza clara
  ctx.fillStyle = cPiel;
  ctx.beginPath();
  ctx.ellipse(2, 8, 12, 17, 0, 0, Math.PI * 2);
  ctx.fill();

  // Cabeza
  ctx.fillStyle = cPelaje;
  ctx.beginPath();
  ctx.arc(0, -28, 18, 0, Math.PI * 2);
  ctx.fill();

  // Orejas
  ctx.fillStyle = cPiel;
  ctx.beginPath();
  ctx.arc(-16, -30, 6, 0, Math.PI * 2);
  ctx.arc(16, -30, 6, 0, Math.PI * 2);
  ctx.fill();

  // Cara
  ctx.fillStyle = cPiel;
  ctx.beginPath();
  ctx.ellipse(2, -26, 12, 11, 0, 0, Math.PI * 2);
  ctx.fill();

  // Ojos con brillo de vida
  ctx.fillStyle = "#1e1b18";
  ctx.beginPath();
  ctx.arc(-3, -29, 2.8, 0, Math.PI * 2);
  ctx.arc(7, -29, 2.8, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = cDetalle;
  ctx.beginPath();
  ctx.arc(-4, -30, 1, 0, Math.PI * 2);
  ctx.arc(6, -30, 1, 0, Math.PI * 2);
  ctx.fill();

  // Hocico & Sonrisa alegre
  ctx.strokeStyle = cPelajeOsc;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(2, -24, 4, 0.1, Math.PI - 0.1);
  ctx.stroke();

  // Brazos & Piernas
  ctx.strokeStyle = cPelaje;
  ctx.lineWidth = 7;
  ctx.lineCap = "round";

  if (pos.enVuelo) {
    // Pose de vuelo extasiado: brazos extendidos hacia adelante
    ctx.beginPath();
    ctx.moveTo(-8, -15);
    ctx.lineTo(25, -45); // Arm 1
    ctx.moveTo(8, -15);
    ctx.lineTo(35, -40); // Arm 2
    ctx.stroke();

    // Piernas recogidas
    ctx.beginPath();
    ctx.moveTo(-10, 20);
    ctx.lineTo(-22, 35);
    ctx.moveTo(5, 20);
    ctx.lineTo(-5, 38);
    ctx.stroke();
  } else {
    // Pose de agarre a la liana arriba
    ctx.beginPath();
    ctx.moveTo(-8, -15);
    ctx.lineTo(-5, -52); // Arm 1 arriba sujetando
    ctx.moveTo(8, -15);
    ctx.lineTo(5, -50); // Arm 2
    ctx.stroke();

    // Manos agrupadas en la liana
    ctx.fillStyle = cPiel;
    ctx.beginPath();
    ctx.arc(0, -53, 5, 0, Math.PI * 2);
    ctx.fill();

    // Piernas relajadas en movimiento
    ctx.beginPath();
    ctx.moveTo(-10, 20);
    ctx.lineTo(-18, 42);
    ctx.moveTo(8, 20);
    ctx.lineTo(12, 40);
    ctx.stroke();
  }

  ctx.restore();
}

// ----- Capa 5: Primer Plano & Partículas -----
function dibujarPrimerPlano(ctx, w, h, p, hojas) {
  // Marco de follaje gigante en esquinas
  ctx.fillStyle = "#05170f";

  // Esquina superior izquierda
  ctx.beginPath();
  ctx.ellipse(0, 0, 160, 90, Math.PI / 6, 0, Math.PI * 2);
  ctx.fill();

  // Esquina superior derecha
  ctx.beginPath();
  ctx.ellipse(w, 0, 180, 100, -Math.PI / 6, 0, Math.PI * 2);
  ctx.fill();

  // Esquina inferior izquierda
  ctx.beginPath();
  ctx.ellipse(0, h, 140, 80, -Math.PI / 4, 0, Math.PI * 2);
  ctx.fill();

  // Hojas cayendo con rotación y deriva
  hojas.forEach((hoja, idx) => {
    const yDist = (hoja.yVel * p * 3.5 + idx * 40) % (h + 60);
    const y = yDist - 30;
    const x = hoja.xBase + Math.sin(p * Math.PI * 4 + idx) * 35;
    const rot = p * Math.PI * hoja.rotSpeed;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.fillStyle = hoja.color;
    ctx.globalAlpha = 0.75;
    ctx.beginPath();
    ctx.ellipse(0, 0, hoja.tam, hoja.tam * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}
