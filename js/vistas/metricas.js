// Métricas y finanzas: cuánto se vende, cuánto se gana de verdad y dónde se pierde.
import { icono } from "../iconos.js";
import {
  db, pesos, numero, porcentaje, escapar, fecha, inicioDia, DIA, metricas, porDia, porHora, porCategoria, topProductos,
  MEDIOS, usuario, gastoFijoMensual, categoria,
} from "../estado.js";
import { graficoDias, graficoHoras, dona, barrasH } from "../graficos.js";
import { exportarExcel } from "../ui.js";
import { delta } from "./inicio.js";

let periodo = "30";

function rangos() {
  const hoy = inicioDia();
  const h = new Date();
  const mesIni = new Date(h.getFullYear(), h.getMonth(), 1).getTime();
  const mesAntIni = new Date(h.getFullYear(), h.getMonth() - 1, 1).getTime();
  switch (periodo) {
    case "hoy":
      return { actual: [hoy, hoy + DIA], anterior: [hoy - 7 * DIA, Date.now() - 7 * DIA], texto: "hoy", ant: "mismo día de la semana pasada" };
    case "7":
      return { actual: [hoy - 6 * DIA, hoy + DIA], anterior: [hoy - 13 * DIA, hoy - 6 * DIA], texto: "últimos 7 días", ant: "7 días anteriores" };
    case "mes":
      return { actual: [mesIni, hoy + DIA], anterior: [mesAntIni, mesAntIni + (hoy + DIA - mesIni)], texto: "este mes", ant: "mismos días del mes pasado" };
    case "anterior":
      return { actual: [mesAntIni, mesIni], anterior: [mesAntIni - (mesIni - mesAntIni), mesAntIni], texto: "mes pasado", ant: "mes anterior" };
    default:
      return { actual: [hoy - 29 * DIA, hoy + DIA], anterior: [hoy - 59 * DIA, hoy - 29 * DIA], texto: "últimos 30 días", ant: "30 días anteriores" };
  }
}

export function render(el, ctx) {
  const r = rangos();
  const m = metricas(...r.actual);
  const a = metricas(...r.anterior);
  const dias = porDia(...r.actual);
  const cats = porCategoria(m.ventas);
  const top = topProductos(m.ventas, 10);
  const fijoMes = gastoFijoMensual();
  const equilibrioMes = m.margenBruto ? fijoMes / (m.margenBruto / 100) : 0;
  const ventaDiaria = m.ingresos / Math.max(1, Math.min(m.dias, Math.ceil((Date.now() - r.actual[0]) / DIA)));
  const avance = equilibrioMes ? Math.min(100, ((ventaDiaria * 30) / equilibrioMes) * 100) : 0;

  // Mercadería quieta: con stock y sin ventas en el período
  const vendidos = new Set(m.ventas.flatMap((v) => v.items.map((i) => i.p)));
  const quietos = db.productos.filter((p) => p.activo && p.stock > 0 && !vendidos.has(p.id)).sort((x, y) => y.stock * y.costo - x.stock * x.costo).slice(0, 6);

  // Por día de la semana (promedio)
  const semana = Array.from({ length: 7 }, (_, i) => ({ dia: i, total: 0, n: 0 }));
  for (const d of dias) {
    const s = semana[new Date(d.fecha).getDay()];
    s.total += d.ingresos;
    s.n++;
  }
  const NOMBRES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  const orden = [1, 2, 3, 4, 5, 6, 0];

  // Por empleado
  const emp = db.usuarios.map((u) => {
    const vs = m.ventas.filter((v) => v.usuario === u.id);
    const turnos = db.turnos.filter((t) => t.usuario === u.id && t.estado === "cerrado" && t.apertura >= r.actual[0] && t.apertura < r.actual[1]);
    return { u, ventas: vs.length, total: vs.reduce((s, v) => s + v.total, 0), diferencia: turnos.reduce((s, t) => s + t.diferencia, 0), turnos: turnos.length };
  }).filter((x) => x.ventas || x.turnos);

  ctx.acciones.innerHTML = `<button class="boton sec" id="excel">${icono("bajar")}<span class="txt">Exportar para el contador</span></button>`;
  ctx.acciones.querySelector("#excel").addEventListener("click", () => exportar(r, m, dias, cats, top));

  el.innerHTML = `
  <div class="filtros"><div class="segmentado" id="periodo">
    ${[["hoy", "Hoy"], ["7", "7 días"], ["30", "30 días"], ["mes", "Este mes"], ["anterior", "Mes pasado"]].map(([k, n]) => `<button data-p="${k}" class="${k === periodo ? "activo" : ""}">${n}</button>`).join("")}
  </div><span class="ayuda" style="margin:0">Comparado con: ${r.ant}</span></div>

  <div class="grilla g4">
    <div class="tarjeta kpi"><div class="etiqueta">${icono("ventas")} Ventas</div><div class="valor">${pesos(m.ingresos)}</div><div class="pie">${delta(m.ingresos, a.ingresos)} ${numero(m.cantidad)} tickets</div></div>
    <div class="tarjeta kpi"><div class="etiqueta">${icono("metricas")} Ganancia bruta</div><div class="valor">${pesos(m.bruta)}</div><div class="pie">${delta(m.bruta, a.bruta)} margen ${porcentaje(m.margenBruto)}</div></div>
    <div class="tarjeta kpi destacado"><div class="etiqueta">Resultado neto</div><div class="valor" style="color:${m.neta < 0 ? "#ff9b8f" : "#fff"}">${pesos(m.neta)}</div><div class="pie">${delta(m.neta, a.neta)} lo que queda después de todo</div></div>
    <div class="tarjeta kpi"><div class="etiqueta">${icono("caja")} Ticket promedio</div><div class="valor">${pesos(m.ticketPromedio)}</div><div class="pie">${delta(m.ticketPromedio, a.ticketPromedio)} por venta</div></div>
  </div>

  <div class="grilla g-3-2 mt">
    <div class="tarjeta">
      <div class="tarjeta-cab"><h3>Ventas y ganancia por día</h3><div class="der leyenda"><span><span class="punto" style="background:#e3127a"></span>Ventas</span><span><span class="punto" style="background:#1c171b"></span>Ganancia bruta</span></div></div>
      <div class="tarjeta-cuerpo">${dias.length > 1 ? graficoDias(dias, { alto: 260 }) : graficoHoras(porHora(m.ventas), { alto: 220 })}</div>
    </div>
    <div class="tarjeta">
      <div class="tarjeta-cab"><h3>Estado de resultados</h3><span class="nota">${r.texto}</span></div>
      <div class="tarjeta-cuerpo resultado">
        <div class="linea"><span>Ventas</span><span>${pesos(m.ingresos)}</span></div>
        ${m.descuentos ? `<div class="linea sangria"><span>incluye descuentos por promos</span><span>− ${pesos(m.descuentos)}</span></div>` : ""}
        <div class="linea resta"><span>Costo de la mercadería vendida</span><span>− ${pesos(m.cmv)}</span></div>
        <div class="linea sub"><span>Ganancia bruta</span><span>${pesos(m.bruta)}</span></div>
        <div class="linea resta"><span>Gastos fijos ${m.dias < 28 ? "(proporcional)" : ""}</span><span>− ${pesos(m.fijos)}</span></div>
        <div class="linea resta"><span>Gastos variables</span><span>− ${pesos(m.variables)}</span></div>
        <div class="linea resta"><span>Comisiones QR / posnet (0,8 %)</span><span>− ${pesos(m.comisiones)}</span></div>
        <div class="linea resta"><span>Pérdidas (roturas, vencidos, faltantes)</span><span>− ${pesos(m.perdidas)}</span></div>
        <div class="linea total"><span>Resultado neto</span><span>${pesos(m.neta)}</span></div>
        <p class="ayuda" style="margin-top:10px">Margen neto ${porcentaje(m.margenNeto)}: de cada $ 1.000 que vendés, te quedan ${pesos(m.margenNeto * 10)}.</p>
      </div>
    </div>
  </div>

  <div class="grilla g3 mt">
    <div class="tarjeta">
      <div class="tarjeta-cab"><h3>Punto de equilibrio</h3></div>
      <div class="tarjeta-cuerpo">
        <p style="margin:0 0 12px;color:var(--texto-2);font-size:14px">Para cubrir los gastos fijos (${pesos(fijoMes)} por mes) con tu margen actual necesitás vender:</p>
        <div style="font-family:var(--f-titulo);font-size:28px;font-weight:700" class="num">${pesos(equilibrioMes)} <span style="font-size:14px;color:var(--texto-3);font-weight:500">por mes</span></div>
        <div class="ayuda">≈ ${pesos(equilibrioMes / 30)} por día</div>
        <div class="barra mt" style="height:10px"><i style="width:${avance}%;background:${avance >= 100 ? "var(--verde)" : "var(--ambar)"}"></i></div>
        <p class="ayuda">${avance >= 100 ? `Al ritmo actual (${pesos(ventaDiaria)} por día) lo superás: todo lo que pasa de ahí es ganancia.` : `Al ritmo actual llegás al ${avance.toFixed(0)} %.`}</p>
      </div>
    </div>
    <div class="tarjeta">
      <div class="tarjeta-cab"><h3>Medios de pago</h3></div>
      <div class="tarjeta-cuerpo">${dona(
        Object.entries(m.porMedio).map(([k, v]) => ({ nombre: MEDIOS[k].nombre, valor: v, color: MEDIOS[k].color })),
        { centro: numero(m.cantidad), sub: "ventas" }
      )}</div>
    </div>
    <div class="tarjeta">
      <div class="tarjeta-cab"><h3>Días de la semana</h3><span class="nota">venta promedio</span></div>
      <div class="tarjeta-cuerpo">${barrasH(
        orden.filter((i) => semana[i].n).map((i) => ({ nombre: NOMBRES[i], valor: semana[i].total / semana[i].n, color: i === 5 || i === 6 ? "#e3127a" : "#2b2329" }))
      )}</div>
    </div>
  </div>

  <div class="grilla g2 mt siempre-1">
    <div class="tarjeta">
      <div class="tarjeta-cab"><h3>Ventas por categoría</h3><span class="nota">con margen de cada una</span></div>
      <div class="tarjeta-cuerpo">${barrasH(cats.map((c) => ({ nombre: c.cat?.nombre || c.id, valor: c.ingresos, color: c.cat?.color || "#999", extra: `margen ${porcentaje(((c.ingresos - c.costo) / c.ingresos) * 100, 0)}` })))}</div>
    </div>
    <div class="tarjeta">
      <div class="tarjeta-cab"><h3>Horarios de más venta</h3></div>
      <div class="tarjeta-cuerpo">${graficoHoras(porHora(m.ventas), { alto: 230 })}</div>
    </div>
  </div>

  <div class="grilla g-3-2 mt">
    <div class="tarjeta">
      <div class="tarjeta-cab"><h3>Los 10 productos que más venden</h3></div>
      <div class="tabla-caja"><table class="tabla"><thead><tr><th>#</th><th>Producto</th><th class="der">Unid.</th><th class="der">Ventas</th><th class="der ocultar-movil">Ganancia</th></tr></thead><tbody>
        ${top.map((p, i) => `<tr><td class="num" style="color:var(--texto-3)">${i + 1}</td><td class="celda-prod"><b>${escapar(p.nombre)}</b><span>${escapar(categoria(p.cat)?.nombre)}</span></td><td class="der num">${numero(p.unidades)}</td><td class="der num"><b>${pesos(p.ingresos)}</b></td><td class="der num ocultar-movil" style="color:var(--verde)">${pesos(p.ganancia)}</td></tr>`).join("")}
      </tbody></table></div>
    </div>
    <div class="tarjeta">
      <div class="tarjeta-cab"><h3>Mercadería quieta</h3><span class="nota">con stock y sin ventas ${r.texto}</span></div>
      <div class="tarjeta-cuerpo" style="padding-top:6px"><ul class="lista">
        ${quietos.map((p) => `<li><span class="icono-caja ambar">${icono("paquete", "chico")}</span><div class="texto"><b>${escapar(p.nombre)}</b><span>${p.stock} u. · ${pesos(p.stock * p.costo)} parados</span></div></li>`).join("") || `<li><div class="texto"><span>Todos los productos con stock tuvieron ventas.</span></div></li>`}
      </ul><p class="ayuda">Ideal para armar una promo o dejar de comprarlos.</p></div>
    </div>
  </div>

  <div class="tarjeta mt">
    <div class="tarjeta-cab"><h3>Rendimiento por empleado</h3><span class="nota">${r.texto}</span></div>
    <div class="tabla-caja"><table class="tabla"><thead><tr><th>Empleado</th><th class="der">Ventas</th><th class="der">Total vendido</th><th class="der ocultar-movil">Turnos cerrados</th><th class="der">Diferencias de caja</th></tr></thead><tbody>
      ${emp.map((x) => `<tr><td><b>${escapar(x.u.nombre)}</b></td><td class="der num">${numero(x.ventas)}</td><td class="der num"><b>${pesos(x.total)}</b></td><td class="der num ocultar-movil">${x.turnos}</td><td class="der num"><span class="chip ${x.diferencia < 0 ? "rojo" : x.diferencia > 0 ? "ambar" : "verde"}">${x.diferencia === 0 ? "Sin diferencias" : (x.diferencia > 0 ? "Sobró " : "Faltó ") + pesos(Math.abs(x.diferencia))}</span></td></tr>`).join("")}
    </tbody></table></div>
  </div>`;

  el.querySelector("#periodo").addEventListener("click", (e) => {
    const b = e.target.closest("[data-p]");
    if (!b) return;
    periodo = b.dataset.p;
    render(el, ctx);
  });
}

function exportar(r, m, dias, cats, top) {
  exportarExcel(`La Morocha - Finanzas ${r.texto}.xlsx`, {
    "Estado de resultados": [
      { Concepto: "Ventas", Monto: Math.round(m.ingresos) },
      { Concepto: "Costo de mercadería vendida", Monto: -Math.round(m.cmv) },
      { Concepto: "Ganancia bruta", Monto: Math.round(m.bruta) },
      { Concepto: "Gastos fijos", Monto: -Math.round(m.fijos) },
      { Concepto: "Gastos variables", Monto: -Math.round(m.variables) },
      { Concepto: "Comisiones QR / posnet", Monto: -Math.round(m.comisiones) },
      { Concepto: "Pérdidas por mermas", Monto: -Math.round(m.perdidas) },
      { Concepto: "Resultado neto", Monto: Math.round(m.neta) },
    ],
    "Ventas por día": dias.map((d) => ({ Fecha: fecha(d.fecha), Tickets: d.cantidad, Ventas: d.ingresos, "Ganancia bruta": d.ganancia })),
    "Por categoría": cats.map((c) => ({ Categoría: c.cat?.nombre, Unidades: c.unidades, Ventas: c.ingresos, Costo: c.costo, Ganancia: c.ingresos - c.costo })),
    "Por medio de pago": Object.entries(m.porMedio).map(([k, v]) => ({ Medio: MEDIOS[k].nombre, Total: v })),
    "Top productos": top.map((p) => ({ Producto: p.nombre, Unidades: p.unidades, Ventas: p.ingresos, Ganancia: p.ganancia })),
    Gastos: db.gastos.filter((g) => g.fecha >= r.actual[0] && g.fecha < r.actual[1]).map((g) => ({ Fecha: fecha(g.fecha), Tipo: g.tipo, Descripción: g.descripcion, Monto: g.monto })),
    Mermas: db.mermas.filter((x) => x.fecha >= r.actual[0] && x.fecha < r.actual[1]).map((x) => ({ Fecha: fecha(x.fecha), Producto: x.nombre, Cantidad: x.cantidad, Motivo: x.motivo, Pérdida: x.costo, Registró: usuario(x.usuario)?.nombre })),
  });
}
