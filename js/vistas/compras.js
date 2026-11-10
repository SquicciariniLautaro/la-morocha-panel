// Compras y proveedores: lo que entra de mercadería y lo que se le debe a cada uno.
import { icono } from "../iconos.js";
import { db, guardar, pesos, escapar, fecha, proveedor, producto, saldoProveedor, nuevoId, buscarProductos, MEDIOS, DIA } from "../estado.js";
import { abrirModal, cerrarModal, aviso, leerForm } from "../ui.js";

let pestaña = "proveedores";

export function render(el, ctx) {
  ctx.acciones.innerHTML = `<button class="boton sec" id="pagar">${icono("efectivo")}<span class="txt">Pagar a proveedor</span></button>
    <button class="boton primario" id="compra">${icono("mas")}<span class="txt">Cargar compra</span></button>`;
  const repintar = () => render(el, ctx);
  ctx.acciones.querySelector("#compra").addEventListener("click", () => nuevaCompra(repintar));
  ctx.acciones.querySelector("#pagar").addEventListener("click", () => pagar(null, repintar));

  const deuda = db.proveedores.reduce((a, p) => a + Math.max(0, saldoProveedor(p.id)), 0);
  const mes = db.compras.filter((c) => c.fecha > Date.now() - 30 * DIA).reduce((a, c) => a + c.total, 0);
  el.innerHTML = `
    <div class="grilla g3">
      <div class="tarjeta kpi destacado"><div class="etiqueta">Le debés a proveedores</div><div class="valor">${pesos(deuda)}</div><div class="pie">${db.proveedores.filter((p) => saldoProveedor(p.id) > 0).length} con saldo pendiente</div></div>
      <div class="tarjeta kpi"><div class="etiqueta">${icono("compras")} Compras últimos 30 días</div><div class="valor">${pesos(mes)}</div><div class="pie">${db.compras.filter((c) => c.fecha > Date.now() - 30 * DIA).length} facturas cargadas</div></div>
      <div class="tarjeta kpi"><div class="etiqueta">${icono("clientes")} Proveedores</div><div class="valor">${db.proveedores.length}</div><div class="pie">Bebidas, golosinas, cigarrillos y más</div></div>
    </div>
    <div class="segmentado mt2" id="pestañas" style="margin-bottom:14px">
      <button data-t="proveedores" class="${pestaña === "proveedores" ? "activo" : ""}">Proveedores</button>
      <button data-t="compras" class="${pestaña === "compras" ? "activo" : ""}">Compras cargadas</button>
    </div>
    <div class="tarjeta"><div class="tabla-caja" id="tabla"></div></div>`;
  el.querySelector("#pestañas").addEventListener("click", (e) => {
    const b = e.target.closest("[data-t]");
    if (!b) return;
    pestaña = b.dataset.t;
    repintar();
  });

  const tabla = el.querySelector("#tabla");
  if (pestaña === "proveedores") {
    tabla.innerHTML = `<table class="tabla"><thead><tr><th>Proveedor</th><th class="ocultar-movil">Rubro</th><th class="ocultar-movil">Teléfono</th><th class="ocultar-movil">Última compra</th><th class="der">Saldo</th><th></th></tr></thead><tbody>
      ${db.proveedores
        .map((p) => {
          const s = saldoProveedor(p.id);
          const ult = db.compras.find((c) => c.proveedor === p.id);
          return `<tr><td><b>${escapar(p.nombre)}</b></td><td class="ocultar-movil">${escapar(p.rubro)}</td><td class="ocultar-movil num">${escapar(p.telefono)}</td>
            <td class="ocultar-movil num">${ult ? fecha(ult.fecha) : "—"}</td>
            <td class="der num">${s > 0 ? `<span class="chip rojo">Debés ${pesos(s)}</span>` : `<span class="chip verde">Al día</span>`}</td>
            <td><div class="acciones-fila">${s > 0 ? `<button class="boton sec chico" data-pagar="${p.id}">Pagar</button>` : ""}</div></td></tr>`;
        })
        .join("")}</tbody></table>`;
  } else {
    tabla.innerHTML = `<table class="tabla"><thead><tr><th>Fecha</th><th>Proveedor</th><th class="ocultar-movil">Factura</th><th class="ocultar-movil">Productos</th><th class="der">Total</th></tr></thead><tbody>
      ${db.compras
        .slice(0, 120)
        .map((c) => `<tr data-compra="${c.id}" style="cursor:pointer"><td class="num">${fecha(c.fecha)}</td><td>${escapar(proveedor(c.proveedor)?.nombre)}</td><td class="ocultar-movil num">${escapar(c.factura || "")}</td><td class="ocultar-movil">${c.items.length} productos · ${c.items.reduce((a, i) => a + i.c, 0)} u.</td><td class="der num"><b>${pesos(c.total)}</b></td></tr>`)
        .join("")}</tbody></table>`;
  }
  tabla.addEventListener("click", (e) => {
    const b = e.target.closest("[data-pagar]");
    if (b) return pagar(b.dataset.pagar, repintar);
    const tr = e.target.closest("[data-compra]");
    if (tr) verCompra(db.compras.find((c) => c.id === tr.dataset.compra));
  });
}

function verCompra(c) {
  abrirModal({
    titulo: `Compra a ${escapar(proveedor(c.proveedor)?.nombre)}`,
    sub: `${fecha(c.fecha)} · Factura ${escapar(c.factura || "s/n")}`,
    cuerpo: `<table class="tabla"><thead><tr><th>Producto</th><th class="der">Cant.</th><th class="der">Costo</th><th class="der">Subtotal</th></tr></thead><tbody>
      ${c.items.map((i) => `<tr><td>${escapar(i.n)}</td><td class="der num">${i.c}</td><td class="der num">${pesos(i.co)}</td><td class="der num">${pesos(i.c * i.co)}</td></tr>`).join("")}
      </tbody></table><div class="resultado mt"><div class="linea total"><span>Total</span><span>${pesos(c.total)}</span></div></div>`,
  });
}

function nuevaCompra(alGuardar) {
  const items = [];
  const m = abrirModal({
    titulo: "Cargar compra",
    sub: "Lo que cargues suma al stock y actualiza el costo de cada producto.",
    clase: "ancho",
    cuerpo: `<form id="f-compra" class="form-grilla">
      <div class="campo"><label>Proveedor</label><select class="entrada" name="proveedor">${db.proveedores.map((p) => `<option value="${p.id}">${escapar(p.nombre)}</option>`).join("")}</select></div>
      <div class="campo"><label>N° de factura o remito</label><input class="entrada" name="factura" placeholder="A-0003-00012345" /></div>
      <div class="campo ancho"><label>Agregar producto</label><div class="entrada-ico">${icono("codigo")}<input class="entrada" id="buscar-compra" placeholder="Leé el código o escribí el nombre" autofocus /></div>
        <div class="resultados-busqueda tarjeta oculto" id="res-compra" style="margin-top:6px;box-shadow:var(--sombra)"></div></div>
      <div class="campo ancho"><label>Cómo la pagás</label><select class="entrada" name="pago"><option value="total">Pago todo ahora</option><option value="nada">Queda a cuenta (le debo al proveedor)</option></select></div>
    </form>
    <div class="tabla-caja mt"><table class="tabla"><thead><tr><th>Producto</th><th style="width:100px">Cant.</th><th style="width:140px">Costo unit.</th><th class="der">Subtotal</th><th></th></tr></thead><tbody id="items-compra"></tbody></table></div>
    <div class="resultado mt"><div class="linea total"><span>Total de la compra</span><span id="total-compra">$ 0</span></div></div>`,
    pie: `<button class="boton sec" data-cerrar>Cancelar</button><button class="boton primario" id="guardar-compra">Guardar compra</button>`,
  });
  const f = m.querySelector("form");
  const buscar = m.querySelector("#buscar-compra");
  const res = m.querySelector("#res-compra");
  const pintarItems = () => {
    m.querySelector("#items-compra").innerHTML = items.length
      ? items
          .map(
            (i, k) => `<tr><td>${escapar(i.n)}</td><td><input class="entrada num" type="number" min="1" value="${i.c}" data-c="${k}" style="height:36px" /></td>
          <td><input class="entrada num" type="number" min="0" step="10" value="${i.co}" data-co="${k}" style="height:36px" /></td>
          <td class="der num"><b>${pesos(i.c * i.co)}</b></td><td><button class="boton fantasma icono chico" data-q="${k}">${icono("basura", "chico")}</button></td></tr>`
          )
          .join("")
      : `<tr><td colspan="5" class="vacio" style="padding:20px">Todavía no agregaste productos.</td></tr>`;
    m.querySelector("#total-compra").textContent = pesos(items.reduce((a, i) => a + i.c * i.co, 0));
  };
  const sumar = (p) => {
    const ya = items.find((i) => i.p === p.id);
    if (ya) ya.c += 1;
    else items.push({ p: p.id, n: p.nombre, c: Math.max(1, p.minimo), co: p.costo });
    buscar.value = "";
    res.classList.add("oculto");
    pintarItems();
  };
  buscar.addEventListener("input", () => {
    const l = buscarProductos(buscar.value, 6);
    res.classList.toggle("oculto", !l.length);
    res.innerHTML = l.map((p) => `<button type="button" class="res-item" data-id="${p.id}"><div class="texto"><b>${escapar(p.nombre)}</b><span>Stock ${p.stock} · costo ${pesos(p.costo)}</span></div></button>`).join("");
  });
  buscar.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const t = buscar.value.trim();
    const p = db.productos.find((x) => x.codigo === t) || buscarProductos(t, 1)[0];
    if (p) sumar(p);
  });
  res.addEventListener("click", (e) => {
    const b = e.target.closest("[data-id]");
    if (b) sumar(producto(b.dataset.id));
  });
  m.querySelector("#items-compra").addEventListener("input", (e) => {
    const k = e.target.dataset.c ?? e.target.dataset.co;
    if (k === undefined) return;
    if (e.target.dataset.c !== undefined) items[k].c = Number(e.target.value);
    else items[k].co = Number(e.target.value);
    m.querySelector("#total-compra").textContent = pesos(items.reduce((a, i) => a + i.c * i.co, 0));
    e.target.closest("tr").children[3].innerHTML = `<b>${pesos(items[k].c * items[k].co)}</b>`;
  });
  m.querySelector("#items-compra").addEventListener("click", (e) => {
    const b = e.target.closest("[data-q]");
    if (!b) return;
    items.splice(b.dataset.q, 1);
    pintarItems();
  });
  pintarItems();
  m.querySelector("#guardar-compra").addEventListener("click", () => {
    if (!items.length) return aviso("Agregá al menos un producto", "error");
    const d = leerForm(f);
    const total = items.reduce((a, i) => a + i.c * i.co, 0);
    const compra = { id: nuevoId("cp"), fecha: Date.now(), proveedor: d.proveedor, factura: d.factura, items, total };
    db.compras.unshift(compra);
    let cambiaronCostos = 0;
    for (const i of items) {
      const p = producto(i.p);
      p.stock += i.c;
      if (p.costo !== i.co) cambiaronCostos++;
      p.costo = i.co;
    }
    if (d.pago === "total") db.pagosProveedores.push({ id: nuevoId("pp"), fecha: Date.now(), proveedor: d.proveedor, monto: total, medio: "transferencia" });
    guardar();
    cerrarModal();
    aviso(`Compra guardada: ${items.reduce((a, i) => a + i.c, 0)} u. sumadas al stock${cambiaronCostos ? ` · ${cambiaronCostos} costos actualizados` : ""}`);
    alGuardar();
  });
}

function pagar(provId, alGuardar) {
  const m = abrirModal({
    titulo: "Pagar a proveedor",
    clase: "angosto",
    cuerpo: `<form id="f-pago" class="form-grilla" style="grid-template-columns:1fr">
      <div class="campo"><label>Proveedor</label><select class="entrada" name="proveedor">${db.proveedores.map((p) => `<option value="${p.id}" ${p.id === provId ? "selected" : ""}>${escapar(p.nombre)} · debés ${pesos(Math.max(0, saldoProveedor(p.id)))}</option>`).join("")}</select></div>
      <div class="campo"><label>Monto</label><input class="entrada num" name="monto" type="number" min="1" step="100" autofocus /></div>
      <div class="campo"><label>Medio</label><select class="entrada" name="medio"><option value="transferencia">Transferencia</option><option value="efectivo">Efectivo</option></select></div>
    </form>`,
    pie: `<button class="boton sec" data-cerrar>Cancelar</button><button class="boton primario" form="f-pago">Registrar pago</button>`,
  });
  const f = m.querySelector("form");
  const llenar = () => (f.monto.value = Math.max(0, saldoProveedor(f.proveedor.value)) || "");
  llenar();
  f.proveedor.addEventListener("change", llenar);
  f.addEventListener("submit", (e) => {
    e.preventDefault();
    const d = leerForm(f);
    if (!d.monto) return;
    db.pagosProveedores.push({ id: nuevoId("pp"), fecha: Date.now(), ...d });
    guardar();
    cerrarModal();
    aviso(`Pago de ${pesos(d.monto)} a ${proveedor(d.proveedor).nombre} registrado (${MEDIOS[d.medio].nombre})`);
    alGuardar();
  });
}
