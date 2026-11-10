// Cuentas corrientes: clientes que compran "fiado", cuánto deben y sus pagos.
import { icono } from "../iconos.js";
import { db, guardar, pesos, escapar, fecha, fechaHora, cliente, saldoCliente, nuevoId, MEDIOS } from "../estado.js";
import { abrirModal, cerrarModal, aviso, leerForm, exportarExcel } from "../ui.js";

export function render(el, ctx) {
  const repintar = () => render(el, ctx);
  ctx.acciones.innerHTML = `<button class="boton sec ocultar-movil" id="excel">${icono("bajar")}<span class="txt">Excel</span></button>
    <button class="boton primario" id="nuevo">${icono("mas")}<span class="txt">Nuevo cliente</span></button>`;
  ctx.acciones.querySelector("#nuevo").addEventListener("click", () => editarCliente(null, repintar));
  ctx.acciones.querySelector("#excel").addEventListener("click", exportar);

  const saldos = db.clientes.map((c) => ({ c, s: saldoCliente(c) }));
  const total = saldos.reduce((a, x) => a + Math.max(0, x.s), 0);
  const excedidos = saldos.filter((x) => x.s > x.c.limite).length;
  const cobrado30 = db.clientes.flatMap((c) => c.movimientos).filter((m) => m.tipo === "pago" && m.fecha > Date.now() - 30 * 86_400_000).reduce((a, m) => a + m.monto, 0);

  el.innerHTML = `
    <div class="grilla g3">
      <div class="tarjeta kpi destacado"><div class="etiqueta">Te deben en total</div><div class="valor">${pesos(total)}</div><div class="pie">${saldos.filter((x) => x.s > 0).length} clientes con saldo</div></div>
      <div class="tarjeta kpi"><div class="etiqueta">${icono("efectivo")} Cobrado últimos 30 días</div><div class="valor">${pesos(cobrado30)}</div><div class="pie">Pagos a cuenta</div></div>
      <div class="tarjeta kpi"><div class="etiqueta">${icono("alerta")} Pasados del límite</div><div class="valor" style="color:${excedidos ? "var(--rojo)" : "inherit"}">${excedidos}</div><div class="pie">La caja avisa antes de fiarles</div></div>
    </div>
    <div class="tarjeta mt"><div class="tabla-caja"><table class="tabla"><thead><tr><th>Cliente</th><th class="ocultar-movil">Teléfono</th><th class="ocultar-movil" style="width:200px">Uso del límite</th><th class="ocultar-movil">Último movimiento</th><th class="der">Debe</th><th></th></tr></thead><tbody>
      ${saldos
        .sort((a, b) => b.s - a.s)
        .map(({ c, s }) => {
          const uso = Math.min(100, (s / c.limite) * 100);
          const ult = c.movimientos[c.movimientos.length - 1];
          return `<tr data-ver="${c.id}" style="cursor:pointer">
            <td class="celda-prod"><b>${escapar(c.nombre)}</b><span>${escapar(c.nota || "")}</span></td>
            <td class="ocultar-movil num">${escapar(c.telefono)}</td>
            <td class="ocultar-movil"><div class="barra"><i style="width:${Math.max(0, uso)}%;background:${uso >= 100 ? "var(--rojo)" : uso > 70 ? "var(--ambar)" : "var(--verde)"}"></i></div><span class="ayuda">Límite ${pesos(c.limite)}</span></td>
            <td class="ocultar-movil num">${ult ? fecha(ult.fecha) : "—"}</td>
            <td class="der num"><b style="color:${s > c.limite ? "var(--rojo)" : "inherit"}">${pesos(s)}</b></td>
            <td><div class="acciones-fila"><button class="boton sec chico" data-pago="${c.id}">Registrar pago</button></div></td></tr>`;
        })
        .join("")}
    </tbody></table></div></div>`;
  el.querySelector("tbody").addEventListener("click", (e) => {
    const b = e.target.closest("[data-pago]");
    if (b) return registrarPago(cliente(b.dataset.pago), repintar);
    const tr = e.target.closest("[data-ver]");
    if (tr) verCliente(cliente(tr.dataset.ver), repintar);
  });
}

function verCliente(c, repintar) {
  let saldo = 0;
  const filas = c.movimientos.map((m) => {
    saldo += m.tipo === "compra" ? m.monto : -m.monto;
    return { m, saldo };
  });
  const m = abrirModal({
    titulo: escapar(c.nombre),
    sub: `${escapar(c.telefono)} · debe ${pesos(saldoCliente(c))} · límite ${pesos(c.limite)}`,
    clase: "ancho",
    cuerpo: `<div class="tabla-caja" style="max-height:420px;overflow:auto"><table class="tabla"><thead><tr><th>Fecha</th><th>Detalle</th><th class="der">Compra</th><th class="der">Pago</th><th class="der">Saldo</th></tr></thead><tbody>
      ${filas
        .reverse()
        .map(({ m, saldo }) => `<tr><td class="num">${fechaHora(m.fecha)}</td><td>${escapar(m.detalle || "")}${m.medio ? ` · ${MEDIOS[m.medio]?.nombre}` : ""}</td>
          <td class="der num">${m.tipo === "compra" ? pesos(m.monto) : ""}</td><td class="der num" style="color:var(--verde)">${m.tipo === "pago" ? pesos(m.monto) : ""}</td><td class="der num"><b>${pesos(saldo)}</b></td></tr>`)
        .join("")}</tbody></table></div>`,
    pie: `<button class="boton sec izq" id="editar">${icono("editar")} Editar cliente</button><button class="boton primario" id="pago">Registrar pago</button>`,
  });
  m.querySelector("#pago").addEventListener("click", () => registrarPago(c, repintar));
  m.querySelector("#editar").addEventListener("click", () => editarCliente(c, repintar));
}

function registrarPago(c, repintar) {
  const s = saldoCliente(c);
  const m = abrirModal({
    titulo: "Registrar pago",
    sub: `${escapar(c.nombre)} debe ${pesos(s)}`,
    clase: "angosto",
    cuerpo: `<form id="f-pago-cli" class="form-grilla" style="grid-template-columns:1fr">
      <div class="campo"><label>Monto que paga</label><input class="entrada num" name="monto" type="number" min="1" step="100" value="${Math.max(0, s)}" autofocus style="font-size:20px;height:50px" /></div>
      <div class="campo"><label>Cómo paga</label><select class="entrada" name="medio"><option value="efectivo">Efectivo</option><option value="transferencia">Transferencia</option><option value="qr">QR / Posnet</option></select></div>
    </form>`,
    pie: `<button class="boton sec" data-cerrar>Cancelar</button><button class="boton primario" form="f-pago-cli">Registrar</button>`,
  });
  m.querySelector("form").addEventListener("submit", (e) => {
    e.preventDefault();
    const d = leerForm(e.target);
    if (!d.monto) return;
    c.movimientos.push({ fecha: Date.now(), tipo: "pago", monto: d.monto, medio: d.medio, detalle: "Pago a cuenta" });
    guardar();
    cerrarModal();
    aviso(`Pago registrado. ${c.nombre} ahora debe ${pesos(saldoCliente(c))}`);
    repintar();
  });
}

function editarCliente(c, repintar) {
  const v = c || { nombre: "", telefono: "", limite: 50000, nota: "" };
  const m = abrirModal({
    titulo: c ? "Editar cliente" : "Nuevo cliente",
    clase: "angosto",
    cuerpo: `<form id="f-cli" class="form-grilla" style="grid-template-columns:1fr">
      <div class="campo"><label>Nombre</label><input class="entrada" name="nombre" value="${escapar(v.nombre)}" required autofocus /></div>
      <div class="campo"><label>Teléfono</label><input class="entrada" name="telefono" value="${escapar(v.telefono)}" /></div>
      <div class="campo"><label>Límite de la cuenta</label><input class="entrada num" name="limite" type="number" min="0" step="1000" value="${v.limite}" /><p class="ayuda">Hasta cuánto le podés fiar. La caja avisa si se pasa.</p></div>
      <div class="campo"><label>Nota</label><input class="entrada" name="nota" value="${escapar(v.nota)}" placeholder="Ej: paga los viernes" /></div>
    </form>`,
    pie: `<button class="boton sec" data-cerrar>Cancelar</button><button class="boton primario" form="f-cli">Guardar</button>`,
  });
  m.querySelector("form").addEventListener("submit", (e) => {
    e.preventDefault();
    const d = leerForm(e.target);
    if (c) Object.assign(c, d);
    else db.clientes.push({ id: nuevoId("c"), ...d, movimientos: [] });
    guardar();
    cerrarModal();
    aviso(c ? "Cliente actualizado" : "Cliente creado");
    repintar();
  });
}

function exportar() {
  exportarExcel("La Morocha - Cuentas corrientes.xlsx", {
    Saldos: db.clientes.map((c) => ({ Cliente: c.nombre, Teléfono: c.telefono, Límite: c.limite, Debe: saldoCliente(c) })),
    Movimientos: db.clientes.flatMap((c) => c.movimientos.map((m) => ({ Cliente: c.nombre, Fecha: fechaHora(m.fecha), Tipo: m.tipo === "compra" ? "Compra" : "Pago", Detalle: m.detalle || "", Monto: m.monto }))),
  });
}
