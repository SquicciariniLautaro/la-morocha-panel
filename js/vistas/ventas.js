// Registro de ventas: el dueño ve y corrige todas; el empleado solo las suyas de hoy.
import { icono } from "../iconos.js";
import {
  db, guardar, sesion, pesos, numero, escapar, fecha, hora, fechaHora, inicioDia, DIA, MEDIOS, usuario, cliente,
  producto, anularVenta,
} from "../estado.js";
import { abrirModal, cerrarModal, aviso, confirmar, exportarExcel } from "../ui.js";
import { ticketHTML } from "./caja.js";

const filtro = { periodo: "hoy", medio: "", usuario: "", texto: "", mostrar: 80 };

function rango() {
  const hoy = inicioDia();
  return {
    hoy: [hoy, hoy + DIA],
    ayer: [hoy - DIA, hoy],
    semana: [hoy - 6 * DIA, hoy + DIA],
    mes: [hoy - 29 * DIA, hoy + DIA],
  }[filtro.periodo];
}

function lista(admin, u) {
  const [desde, hasta] = rango();
  const t = filtro.texto.trim().toLowerCase();
  return db.ventas
    .filter(
      (v) =>
        v.fecha >= desde &&
        v.fecha < hasta &&
        (admin || v.usuario === u.id) &&
        (!filtro.medio || v.medio === filtro.medio) &&
        (!filtro.usuario || v.usuario === filtro.usuario) &&
        (!t || String(v.numero) === t.replace(/\D/g, "") || v.items.some((i) => i.n.toLowerCase().includes(t)))
    )
    .sort((a, b) => b.fecha - a.fecha);
}

export function render(el, ctx) {
  const { admin, usuario: u } = ctx;
  if (!admin) filtro.periodo = "hoy";
  el.innerHTML = `
    <div class="filtros">
      <div class="segmentado" id="periodo">
        ${[["hoy", "Hoy"], ["ayer", "Ayer"], ...(admin ? [["semana", "7 días"], ["mes", "30 días"]] : [])]
          .map(([k, n]) => `<button class="${filtro.periodo === k ? "activo" : ""}" data-p="${k}">${n}</button>`)
          .join("")}
      </div>
      <div class="entrada-ico crece">${icono("buscar")}<input class="entrada" id="texto" placeholder="Buscar por N° de venta o producto" value="${escapar(filtro.texto)}" style="width:100%" /></div>
      <select class="entrada" id="medio"><option value="">Todos los pagos</option>${Object.entries(MEDIOS).map(([k, m]) => `<option value="${k}" ${filtro.medio === k ? "selected" : ""}>${m.nombre}</option>`).join("")}</select>
      ${admin ? `<select class="entrada" id="usuario"><option value="">Todos los empleados</option>${db.usuarios.map((x) => `<option value="${x.id}" ${filtro.usuario === x.id ? "selected" : ""}>${escapar(x.nombre)}</option>`).join("")}</select>` : ""}
    </div>
    <div class="grilla g4" id="resumen"></div>
    <div class="tarjeta mt"><div class="tabla-caja" id="tabla"></div></div>`;

  if (admin) {
    ctx.acciones.innerHTML = `<button class="boton sec" id="excel">${icono("bajar")}<span class="txt">Exportar a Excel</span></button>`;
    ctx.acciones.querySelector("#excel").addEventListener("click", () => exportar(lista(admin, u)));
  }

  const pintarTabla = () => {
    const vs = lista(admin, u);
    const ok = vs.filter((v) => v.estado === "ok");
    const total = ok.reduce((a, v) => a + v.total, 0);
    const porMedio = (k) => ok.filter((v) => v.medio === k).reduce((a, v) => a + v.total, 0);
    el.querySelector("#resumen").innerHTML = `
      <div class="tarjeta kpi destacado"><div class="etiqueta">Total vendido</div><div class="valor">${pesos(total)}</div><div class="pie">${numero(ok.length)} ventas${vs.length - ok.length ? ` · ${vs.length - ok.length} anuladas` : ""}</div></div>
      ${admin ? `<div class="tarjeta kpi"><div class="etiqueta">${icono("efectivo")} Efectivo</div><div class="valor">${pesos(porMedio("efectivo"))}</div></div>
      <div class="tarjeta kpi"><div class="etiqueta">${icono("qr")} QR y transferencias</div><div class="valor">${pesos(porMedio("qr") + porMedio("transferencia"))}</div></div>
      <div class="tarjeta kpi"><div class="etiqueta">${icono("cuenta")} En cuenta corriente</div><div class="valor">${pesos(porMedio("cuenta"))}</div></div>` : ""}`;
    const filas = vs
      .slice(0, filtro.mostrar)
      .map(
        (v) => `<tr class="${v.estado === "anulada" ? "apagado" : ""}" data-id="${v.id}" style="cursor:pointer">
        <td class="num"><b>${numero(v.numero)}</b></td>
        <td class="num">${filtro.periodo === "hoy" ? hora(v.fecha) : fechaHora(v.fecha)}</td>
        <td class="ocultar-movil">${escapar(usuario(v.usuario)?.nombre || "")}</td>
        <td class="ocultar-movil" style="max-width:340px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapar(v.items.map((i) => (i.c > 1 ? i.c + "× " : "") + i.n).join(", "))}</td>
        <td><span class="chip">${icono(MEDIOS[v.medio].icono, "chico")} ${v.medio === "cuenta" ? escapar(cliente(v.cliente)?.nombre.split(" ")[0] || "Cta. cte.") : MEDIOS[v.medio].nombre}</span></td>
        <td class="der num"><b>${pesos(v.total)}</b></td>
        <td class="cent">${v.estado === "anulada" ? `<span class="chip rojo">Anulada</span>` : v.ediciones.length ? `<span class="chip ambar" title="Tiene cambios registrados">Editada</span>` : `<span class="chip verde">OK</span>`}</td>
      </tr>`
      )
      .join("");
    el.querySelector("#tabla").innerHTML = vs.length
      ? `<table class="tabla"><thead><tr><th>N°</th><th>${filtro.periodo === "hoy" ? "Hora" : "Fecha"}</th><th class="ocultar-movil">Atendió</th><th class="ocultar-movil">Productos</th><th>Pago</th><th class="der">Total</th><th class="cent">Estado</th></tr></thead><tbody>${filas}</tbody></table>
        ${vs.length > filtro.mostrar ? `<div style="padding:14px;text-align:center"><button class="boton sec" id="mas">Ver más (${vs.length - filtro.mostrar} restantes)</button></div>` : ""}`
      : `<div class="vacio">No hay ventas con estos filtros.</div>`;
    el.querySelector("#mas")?.addEventListener("click", () => {
      filtro.mostrar += 150;
      pintarTabla();
    });
  };

  el.querySelector("#periodo").addEventListener("click", (e) => {
    const b = e.target.closest("[data-p]");
    if (!b) return;
    filtro.periodo = b.dataset.p;
    filtro.mostrar = 80;
    el.querySelectorAll("#periodo button").forEach((x) => x.classList.toggle("activo", x === b));
    pintarTabla();
  });
  el.querySelector("#texto").addEventListener("input", (e) => {
    filtro.texto = e.target.value;
    pintarTabla();
  });
  el.querySelector("#medio").addEventListener("change", (e) => {
    filtro.medio = e.target.value;
    pintarTabla();
  });
  el.querySelector("#usuario")?.addEventListener("change", (e) => {
    filtro.usuario = e.target.value;
    pintarTabla();
  });
  el.querySelector("#tabla").addEventListener("click", (e) => {
    const tr = e.target.closest("[data-id]");
    if (tr) detalle(db.ventas.find((v) => v.id === tr.dataset.id), admin, pintarTabla);
  });
  pintarTabla();
}

function detalle(v, admin, alCambiar) {
  const historial = v.ediciones.length
    ? `<div class="mt"><h4 style="font-size:14px;margin-bottom:6px">Registro de cambios</h4><ul class="lista">${v.ediciones
        .map((e) => `<li><span class="icono-caja ambar">${icono("historial", "chico")}</span><div class="texto"><b style="white-space:normal">${escapar(e.detalle)}</b><span>${escapar(usuario(e.usuario)?.nombre)} · ${fechaHora(e.fecha)}</span></div></li>`)
        .join("")}</ul></div>`
    : "";
  const m = abrirModal({
    titulo: `Venta N° ${numero(v.numero)}`,
    sub: `${fechaHora(v.fecha)} · atendió ${escapar(usuario(v.usuario)?.nombre || "")}${v.estado === "anulada" ? " · ANULADA" : ""}`,
    clase: "angosto",
    cuerpo: ticketHTML(v) + historial,
    pie: `${admin && v.estado === "ok" ? `<button class="boton peligro izq" id="anular">${icono("basura")} Anular</button><button class="boton sec" id="editar">${icono("editar")} Editar</button>` : ""}<button class="boton sec" id="imprimir">${icono("imprimir")} Imprimir</button>`,
  });
  m.querySelector("#imprimir").addEventListener("click", () => window.print());
  m.querySelector("#anular")?.addEventListener("click", async () => {
    if (!(await confirmar("Anular venta", `La venta N° ${numero(v.numero)} por ${pesos(v.total)} queda anulada y la mercadería vuelve al stock. Queda registrado quién la anuló.`, { boton: "Anular venta", peligro: true }))) return;
    anularVenta(v, "");
    aviso("Venta anulada y stock devuelto");
    alCambiar();
  });
  m.querySelector("#editar")?.addEventListener("click", () => editar(v, alCambiar));
}

// Edición por el administrador: cantidades, precios, medio de pago. Todo queda registrado.
function editar(v, alCambiar) {
  const items = v.items.map((i) => ({ ...i }));
  let medio = v.medio;
  let clienteId = v.cliente || "";
  const pintar = (m) => {
    m.querySelector("#items-editar").innerHTML = items
      .map(
        (i, k) => `<tr><td>${escapar(i.n)}</td>
        <td style="width:90px"><input class="entrada num" type="number" min="0" value="${i.c}" data-c="${k}" style="height:36px" /></td>
        <td style="width:130px"><input class="entrada num" type="number" min="0" step="10" value="${i.pr}" data-pr="${k}" style="height:36px" /></td>
        <td class="der num"><b>${pesos(i.c * i.pr)}</b></td></tr>`
      )
      .join("");
    const sub = items.reduce((a, i) => a + i.c * i.pr, 0);
    m.querySelector("#total-editar").textContent = pesos(sub - (v.descuento || 0));
  };
  const m = abrirModal({
    titulo: `Editar venta N° ${numero(v.numero)}`,
    sub: "Los cambios ajustan el stock y quedan registrados con tu usuario.",
    clase: "ancho",
    cuerpo: `<div class="tabla-caja"><table class="tabla"><thead><tr><th>Producto</th><th>Cant.</th><th>Precio</th><th class="der">Importe</th></tr></thead><tbody id="items-editar"></tbody></table></div>
      <div class="form-grilla mt">
        <div class="campo"><label>Medio de pago</label><select class="entrada" id="medio-editar">${Object.entries(MEDIOS).map(([k, x]) => `<option value="${k}" ${k === medio ? "selected" : ""}>${x.nombre}</option>`).join("")}</select></div>
        <div class="campo" id="campo-cliente" ${medio === "cuenta" ? "" : 'style="display:none"'}><label>Cliente</label><select class="entrada" id="cliente-editar"><option value="">Elegí…</option>${db.clientes.map((c) => `<option value="${c.id}" ${c.id === clienteId ? "selected" : ""}>${escapar(c.nombre)}</option>`).join("")}</select></div>
        <div class="campo ancho"><label>Motivo del cambio</label><input class="entrada" id="motivo" placeholder="Ej: se cobró mal la cantidad" /></div>
      </div>
      <div class="resultado mt"><div class="linea total"><span>Nuevo total</span><span id="total-editar"></span></div></div>`,
    pie: `<button class="boton sec" data-cerrar>Cancelar</button><button class="boton primario" id="guardar">Guardar cambios</button>`,
  });
  pintar(m);
  m.querySelector("#items-editar").addEventListener("input", (e) => {
    const k = e.target.dataset.c ?? e.target.dataset.pr;
    if (k === undefined) return;
    if (e.target.dataset.c !== undefined) items[k].c = Math.max(0, Number(e.target.value));
    else items[k].pr = Math.max(0, Number(e.target.value));
    const sub = items.reduce((a, i) => a + i.c * i.pr, 0);
    m.querySelector("#total-editar").textContent = pesos(sub - (v.descuento || 0));
    e.target.closest("tr").lastElementChild.innerHTML = `<b>${pesos(items[k].c * items[k].pr)}</b>`;
  });
  m.querySelector("#medio-editar").addEventListener("change", (e) => {
    medio = e.target.value;
    m.querySelector("#campo-cliente").style.display = medio === "cuenta" ? "" : "none";
  });
  m.querySelector("#cliente-editar").addEventListener("change", (e) => (clienteId = e.target.value));
  m.querySelector("#guardar").addEventListener("click", () => {
    if (medio === "cuenta" && !clienteId) return aviso("Elegí el cliente de la cuenta corriente", "error");
    const cambios = [];
    items.forEach((i, k) => {
      const antes = v.items[k];
      if (antes.c !== i.c) {
        cambios.push(`cantidad de ${i.n} (${antes.c} a ${i.c})`);
        const p = producto(i.p);
        if (p) p.stock += antes.c - i.c;
      }
      if (antes.pr !== i.pr) cambios.push(`precio de ${i.n} (${pesos(antes.pr)} a ${pesos(i.pr)})`);
    });
    if (medio !== v.medio) cambios.push(`medio de pago (${MEDIOS[v.medio].nombre} a ${MEDIOS[medio].nombre})`);
    if (!cambios.length && (clienteId || null) === (v.cliente || null)) return cerrarModal();
    // cuenta corriente: sacar el movimiento viejo y anotar el nuevo
    if (v.cliente) {
      const c = cliente(v.cliente);
      c.movimientos = c.movimientos.filter((x) => x.venta !== v.id);
    }
    v.items = items.filter((i) => i.c > 0);
    v.subtotal = v.items.reduce((a, i) => a + i.c * i.pr, 0);
    v.total = v.subtotal - (v.descuento || 0);
    v.medio = medio;
    v.cliente = medio === "cuenta" ? clienteId : null;
    if (v.cliente) cliente(v.cliente).movimientos.push({ fecha: v.fecha, tipo: "compra", monto: v.total, venta: v.id, detalle: `Venta N° ${v.numero}` });
    const motivo = m.querySelector("#motivo").value.trim();
    v.ediciones.push({ fecha: Date.now(), usuario: sesion().id, detalle: "Cambió " + (cambios.join(", ") || "el cliente") + (motivo ? `. Motivo: ${motivo}` : "") });
    guardar();
    cerrarModal();
    aviso("Venta corregida. El cambio quedó registrado.");
    alCambiar();
  });
}

function exportar(vs) {
  const ventas = vs.map((v) => ({
    "N°": v.numero,
    Fecha: fecha(v.fecha),
    Hora: hora(v.fecha),
    Atendió: usuario(v.usuario)?.nombre,
    Productos: v.items.map((i) => `${i.c} x ${i.n}`).join(" | "),
    Subtotal: v.subtotal,
    Descuento: v.descuento || 0,
    Total: v.total,
    "Medio de pago": MEDIOS[v.medio].nombre,
    Cliente: v.cliente ? cliente(v.cliente)?.nombre : "",
    Estado: v.estado === "ok" ? (v.ediciones.length ? "Editada" : "OK") : "Anulada",
  }));
  const detalle = vs.flatMap((v) =>
    v.items.map((i) => ({ "N° venta": v.numero, Fecha: fecha(v.fecha), Producto: i.n, Cantidad: i.c, "Precio unitario": i.pr, "Costo unitario": i.co, Importe: i.c * i.pr, Ganancia: i.c * (i.pr - i.co) }))
  );
  exportarExcel(`La Morocha - Ventas ${filtro.periodo}.xlsx`, { Ventas: ventas, "Detalle por producto": detalle });
}

