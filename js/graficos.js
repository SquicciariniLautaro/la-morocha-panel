// Gráficos en SVG hechos a mano (sin librerías). Cada uno devuelve HTML.
import { pesos, pesosCortos, fechaCorta, escapar } from "./estado.js";

const ROSA = "#e3127a";
const NEGRO = "#1c171b";
const REJILLA = "#eee8e4";

function escalaRedonda(max) {
  if (max <= 0) return 1;
  const pot = 10 ** Math.floor(Math.log10(max));
  const pasos = [1, 2, 2.5, 5, 10];
  for (const p of pasos) if (p * pot * 4 >= max) return p * pot;
  return 10 * pot;
}

// Información al pasar el mouse (data-info="titulo|texto")
let globo;
document.addEventListener("pointerover", (e) => {
  const el = e.target.closest?.("[data-info]");
  if (!el) return globo?.remove();
  const [titulo, texto] = el.dataset.info.split("|");
  globo ??= Object.assign(document.createElement("div"), { className: "info-grafico" });
  globo.innerHTML = `<b>${titulo}</b>${texto}`;
  document.body.append(globo);
  const r = el.getBoundingClientRect();
  const g = globo.getBoundingClientRect();
  globo.style.left = Math.min(window.innerWidth - g.width - 8, Math.max(8, r.left + r.width / 2 - g.width / 2)) + "px";
  globo.style.top = Math.max(8, r.top - g.height - 8) + "px";
});
document.addEventListener("scroll", () => globo?.remove(), true);

// Ventas y ganancia por día (área + línea)
export function graficoDias(dias, { alto = 240 } = {}) {
  const ancho = 720;
  const m = { i: 52, d: 8, a: 12, b: 26 };
  const W = ancho - m.i - m.d;
  const H = alto - m.a - m.b;
  const max = Math.max(...dias.map((d) => d.ingresos), 1);
  const paso = escalaRedonda(max);
  const tope = Math.ceil(max / paso) * paso;
  const x = (i) => m.i + (dias.length === 1 ? W / 2 : (i * W) / (dias.length - 1));
  const y = (v) => m.a + H - (v / tope) * H;
  const linea = (k) => dias.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(d[k]).toFixed(1)}`).join("");
  const area = `${linea("ingresos")}L${x(dias.length - 1)},${m.a + H}L${x(0)},${m.a + H}Z`;
  let ejes = "";
  for (let v = 0; v <= tope; v += paso) {
    ejes += `<line x1="${m.i}" x2="${ancho - m.d}" y1="${y(v)}" y2="${y(v)}" stroke="${REJILLA}"/>`;
    ejes += `<text x="${m.i - 8}" y="${y(v) + 4}" text-anchor="end">${pesosCortos(v).replace("$ ", "")}</text>`;
  }
  const cadaEtiqueta = Math.ceil(dias.length / 8);
  const etiquetas = dias
    .map((d, i) => (i % cadaEtiqueta === 0 || i === dias.length - 1 ? `<text x="${x(i)}" y="${alto - 6}" text-anchor="middle">${fechaCorta(d.fecha)}</text>` : ""))
    .join("");
  const ancho1 = W / Math.max(1, dias.length - 1);
  const zonas = dias
    .map(
      (d, i) =>
        `<rect x="${x(i) - ancho1 / 2}" y="${m.a}" width="${ancho1}" height="${H}" fill="transparent" data-info="${fechaCorta(d.fecha)} · ${d.cantidad} ventas|Ventas ${pesos(d.ingresos)}<br>Ganancia ${pesos(d.ganancia)}"/>`
    )
    .join("");
  return `<svg class="grafico" viewBox="0 0 ${ancho} ${alto}" role="img" aria-label="Ventas y ganancia por día">
    <defs><linearGradient id="gArea" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${ROSA}" stop-opacity=".22"/><stop offset="1" stop-color="${ROSA}" stop-opacity="0"/></linearGradient></defs>
    ${ejes}
    <path d="${area}" fill="url(#gArea)"/>
    <path d="${linea("ingresos")}" fill="none" stroke="${ROSA}" stroke-width="2.2" stroke-linejoin="round"/>
    <path d="${linea("ganancia")}" fill="none" stroke="${NEGRO}" stroke-width="1.8" stroke-dasharray="5 4" stroke-linejoin="round"/>
    ${etiquetas}${zonas}
  </svg>`;
}

// Barras verticales (ventas por hora)
export function graficoHoras(horas, { alto = 200 } = {}) {
  const ancho = 520;
  const m = { i: 8, d: 8, a: 10, b: 22 };
  const W = ancho - m.i - m.d;
  const H = alto - m.a - m.b;
  const max = Math.max(...horas.map((h) => h.ingresos), 1);
  const bw = W / horas.length;
  const pico = horas.reduce((a, h) => (h.ingresos > a.ingresos ? h : a), horas[0]);
  return `<svg class="grafico" viewBox="0 0 ${ancho} ${alto}" role="img" aria-label="Ventas por hora">
    ${horas
      .map((h, i) => {
        const bh = Math.max(2, (h.ingresos / max) * H);
        const color = h === pico ? ROSA : "#2b2329";
        return `<rect x="${m.i + i * bw + 3}" y="${m.a + H - bh}" width="${bw - 6}" height="${bh}" rx="4" fill="${color}" opacity="${h === pico ? 1 : 0.82}" data-info="${h.hora}:00 a ${h.hora + 1}:00|${h.cantidad} ventas · ${pesos(h.ingresos)}"/>
        <text x="${m.i + i * bw + bw / 2}" y="${alto - 6}" text-anchor="middle">${h.hora}</text>`;
      })
      .join("")}
  </svg>`;
}

// Dona con lista al costado
export function dona(partes, { centro = "", sub = "" } = {}) {
  const total = partes.reduce((a, p) => a + p.valor, 0) || 1;
  const R = 60;
  const r = 42;
  let ang = -Math.PI / 2;
  const arcos = partes
    .filter((p) => p.valor > 0)
    .map((p) => {
      const a = (p.valor / total) * Math.PI * 2;
      const a2 = ang + a - 0.02;
      const largo = a > Math.PI ? 1 : 0;
      const pt = (rad, t) => `${(70 + rad * Math.cos(t)).toFixed(2)},${(70 + rad * Math.sin(t)).toFixed(2)}`;
      const d = `M${pt(R, ang)}A${R},${R} 0 ${largo} 1 ${pt(R, a2)}L${pt(r, a2)}A${r},${r} 0 ${largo} 0 ${pt(r, ang)}Z`;
      ang += a;
      return `<path d="${d}" fill="${p.color}" data-info="${escapar(p.nombre)}|${pesos(p.valor)} · ${((p.valor / total) * 100).toFixed(1)} %"/>`;
    })
    .join("");
  const lista = partes
    .map(
      (p) => `<div class="fila"><span class="punto" style="background:${p.color}"></span><span>${escapar(p.nombre)}</span><b>${((p.valor / total) * 100).toFixed(0)} %</b><small>${pesos(p.valor)}</small></div>`
    )
    .join("");
  return `<div class="dona-caja">
    <svg class="grafico" viewBox="0 0 140 140" role="img" aria-label="Distribución">
      ${arcos}
      <text x="70" y="68" text-anchor="middle" style="font-size:15px;font-weight:700;fill:${NEGRO};font-family:var(--f-titulo)">${centro}</text>
      <text x="70" y="85" text-anchor="middle" style="font-size:10px">${sub}</text>
    </svg>
    <div class="dona-lista">${lista}</div>
  </div>`;
}

// Barras horizontales con valor (categorías, gastos)
export function barrasH(filas) {
  const max = Math.max(...filas.map((f) => f.valor), 1);
  return `<div style="display:grid;gap:12px">${filas
    .map(
      (f) => `<div>
        <div style="display:flex;justify-content:space-between;gap:10px;font-size:13.5px;margin-bottom:5px">
          <span style="display:flex;align-items:center;gap:7px"><span class="punto" style="background:${f.color}"></span>${escapar(f.nombre)}</span>
          <span class="num"><b>${pesos(f.valor)}</b>${f.extra ? ` <span style="color:var(--texto-3)">· ${f.extra}</span>` : ""}</span>
        </div>
        <div class="barra"><i style="width:${(f.valor / max) * 100}%;background:${f.color}"></i></div>
      </div>`
    )
    .join("")}</div>`;
}

// Línea mínima para tarjetas
export function mini(valores, color = ROSA) {
  const max = Math.max(...valores, 1);
  const min = Math.min(...valores, 0);
  const pts = valores.map((v, i) => `${((i / (valores.length - 1)) * 100).toFixed(1)},${(28 - ((v - min) / (max - min || 1)) * 26).toFixed(1)}`).join(" ");
  return `<svg viewBox="0 0 100 30" preserveAspectRatio="none" style="width:90px;height:28px;display:block"><polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round"/></svg>`;
}
