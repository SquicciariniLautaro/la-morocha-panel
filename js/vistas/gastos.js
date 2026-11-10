// Gastos fijos (alquiler, sueldos, luz…) y variables (insumos, fletes, arreglos).
import { icono } from "../iconos.js";
import { db, guardar, pesos, escapar, fecha, nuevoId, MEDIOS, inicioDia } from "../estado.js";
import { abrirModal, cerrarModal, aviso, confirmar, leerForm, exportarExcel } from "../ui.js";
import { barrasH } from "../graficos.js";

let periodo = "mes";
const COLORES = ["#1c171b", "#e3127a", "#e89a0c", "#6c4bb5", "#2457c5", "#12804a", "#0e7490", "#c2410c", "#94a3b8"];

function rango() {
  const h = new Date();
  if (periodo === "mes") return [new Date(h.getFullYear(), h.getMonth(), 1).getTime(), Date.now() + 1];
  if (periodo === "anterior") return [new Date(h.getFullYear(), h.getMonth() - 1, 1).getTime(), new Date(h.getFullYear(), h.getMonth(), 1).getTime()];
  return [inicioDia() - 29 * 86_400_000, Date.now() + 1];
}

export function render(el, ctx) {
  const repintar = () => render(el, ctx);
  ctx.acciones.innerHTML = `<button class="boton sec ocultar-movil" id="excel">${icono("bajar")}<span class="txt">Excel</span></button>
    <button class="boton primario" id="nuevo">${icono("mas")}<span class="txt">Cargar gasto</span></button>`;
  ctx.acciones.querySelector("#nuevo").addEventListener("click", () => nuevoGasto(repintar));

  const [desde, hasta] = rango();
  const lista = db.gastos.filter((g) => g.fecha >= desde && g.fecha < hasta).sort((a, b) => b.fecha - a.fecha);
  ctx.acciones.querySelector("#excel").addEventListener("click", () =>
    exportarExcel("La Morocha - Gastos.xlsx", { Gastos: lista.map((g) => ({ Fecha: fecha(g.fecha), Tipo: g.tipo === "fijo" ? "Fijo" : "Variable", Categoría: g.categoria, Descripción: g.descripcion, Medio: MEDIOS[g.medio]?.nombre, Monto: g.monto })) })
  );
  const fijos = lista.filter((g) => g.tipo === "fijo").reduce((a, g) => a + g.monto, 0);
  const variables = lista.filter((g) => g.tipo === "variable").reduce((a, g) => a + g.monto, 0);
  const porDesc = new Map();
  for (const g of lista) porDesc.set(g.descripcion, (porDesc.get(g.descripcion) || 0) + g.monto);
  const filasBarras = [...porDesc.entries()].sort((a, b) => b[1] - a[1]).slice(0, 9).map(([nombre, valor], i) => ({ nombre, valor, color: COLORES[i % COLORES.length] }));

  el.innerHTML = `
    <div class="filtros"><div class="segmentado" id="periodo">
      ${[["mes", "Este mes"], ["anterior", "Mes pasado"], ["30", "Últimos 30 días"]].map(([k, n]) => `<button data-p="${k}" class="${k === periodo ? "activo" : ""}">${n}</button>`).join("")}
    </div></div>
    <div class="grilla g3">
      <div class="tarjeta kpi destacado"><div class="etiqueta">Total de gastos</div><div class="valor">${pesos(fijos + variables)}</div><div class="pie">${lista.length} movimientos</div></div>
      <div class="tarjeta kpi"><div class="etiqueta">${icono("calendario")} Fijos</div><div class="valor">${pesos(fijos)}</div><div class="pie">Alquiler, sueldos, servicios, impuestos</div></div>
      <div class="tarjeta kpi"><div class="etiqueta">${icono("gastos")} Variables</div><div class="valor">${pesos(variables)}</div><div class="pie">Insumos, fletes, arreglos, publicidad</div></div>
    </div>
    <div class="grilla g-3-2 mt">
      <div class="tarjeta"><div class="tabla-caja"><table class="tabla"><thead><tr><th>Fecha</th><th>Descripción</th><th class="ocultar-movil">Tipo</th><th class="ocultar-movil">Pago</th><th class="der">Monto</th><th></th></tr></thead><tbody>
        ${lista
          .map(
            (g) => `<tr><td class="num">${fecha(g.fecha)}</td><td class="celda-prod"><b>${escapar(g.descripcion)}</b><span>${escapar(g.categoria)}</span></td>
          <td class="ocultar-movil"><span class="chip ${g.tipo === "fijo" ? "negro" : "rosa"}">${g.tipo === "fijo" ? "Fijo" : "Variable"}</span></td>
          <td class="ocultar-movil">${MEDIOS[g.medio]?.nombre || ""}</td><td class="der num"><b>${pesos(g.monto)}</b></td>
          <td><button class="boton fantasma icono chico" data-borrar="${g.id}" title="Borrar">${icono("basura", "chico")}</button></td></tr>`
          )
          .join("") || `<tr><td colspan="6" class="vacio">No hay gastos en este período.</td></tr>`}
      </tbody></table></div></div>
      <div class="tarjeta"><div class="tarjeta-cab"><h3>¿En qué se va la plata?</h3></div><div class="tarjeta-cuerpo">${filasBarras.length ? barrasH(filasBarras) : ""}</div></div>
    </div>`;
  el.querySelector("#periodo").addEventListener("click", (e) => {
    const b = e.target.closest("[data-p]");
    if (!b) return;
    periodo = b.dataset.p;
    repintar();
  });
  el.querySelector("tbody").addEventListener("click", async (e) => {
    const b = e.target.closest("[data-borrar]");
    if (!b) return;
    const g = db.gastos.find((x) => x.id === b.dataset.borrar);
    if (!(await confirmar("Borrar gasto", `¿Borrar “${escapar(g.descripcion)}” por ${pesos(g.monto)}?`, { boton: "Borrar", peligro: true }))) return;
    db.gastos = db.gastos.filter((x) => x !== g);
    guardar();
    aviso("Gasto borrado");
    repintar();
  });
}

function nuevoGasto(repintar) {
  const hoy = new Date().toISOString().slice(0, 10);
  const m = abrirModal({
    titulo: "Cargar gasto",
    cuerpo: `<form id="f-gasto" class="form-grilla">
      <div class="campo"><label>Tipo</label><select class="entrada" name="tipo"><option value="variable">Variable</option><option value="fijo">Fijo (todos los meses)</option></select></div>
      <div class="campo"><label>Categoría</label><select class="entrada" name="categoria"><option>Insumos</option><option>Logística</option><option>Mantenimiento</option><option>Marketing</option><option>Fijos</option><option>Impuestos</option><option>Otros</option></select></div>
      <div class="campo ancho"><label>Descripción</label><input class="entrada" name="descripcion" required autofocus placeholder="Ej: Bolsas camiseta x 1000" /></div>
      <div class="campo"><label>Monto</label><input class="entrada num" name="monto" type="number" min="1" step="100" required /></div>
      <div class="campo"><label>Fecha</label><input class="entrada" name="fecha" type="date" value="${hoy}" /></div>
      <div class="campo"><label>Cómo se pagó</label><select class="entrada" name="medio"><option value="efectivo">Efectivo</option><option value="transferencia">Transferencia</option></select></div>
    </form>`,
    pie: `<button class="boton sec" data-cerrar>Cancelar</button><button class="boton primario" form="f-gasto">Guardar gasto</button>`,
  });
  m.querySelector("form").addEventListener("submit", (e) => {
    e.preventDefault();
    const d = leerForm(e.target);
    const [a, mes, dia] = d.fecha.split("-").map(Number);
    const esHoy = d.fecha === hoy;
    db.gastos.unshift({ id: nuevoId("g"), ...d, fecha: esHoy ? Date.now() : new Date(a, mes - 1, dia, 12).getTime() });
    guardar();
    cerrarModal();
    aviso("Gasto guardado");
    repintar();
  });
}
