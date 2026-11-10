// Productos y stock: alta, edición, baja, aumento masivo de precios y mermas.
import { icono } from "../iconos.js";
import {
  db, guardar, sesion, pesos, numero, porcentaje, escapar, fecha, fechaHora, estadoStock, diasParaVencer, categoria,
  proveedor, producto, nuevoId, usuario, buscarProductos,
} from "../estado.js";
import { abrirModal, cerrarModal, aviso, confirmar, leerForm, exportarExcel } from "../ui.js";

const filtro = { texto: "", categoria: "", estado: "", pestaña: "productos" };

export function render(el, ctx) {
  const { admin } = ctx;
  const q = new URLSearchParams(location.hash.split("?")[1] || "");
  if (q.get("filtro")) filtro.estado = q.get("filtro");

  if (admin) {
    ctx.acciones.innerHTML = `
      <button class="boton sec ocultar-movil" id="excel">${icono("bajar")}<span class="txt">Excel</span></button>
      <button class="boton sec" id="aumento">${icono("porcentaje")}<span class="txt">Aumentar precios</span></button>
      <button class="boton primario" id="nuevo">${icono("mas")}<span class="txt">Nuevo producto</span></button>`;
    ctx.acciones.querySelector("#nuevo").addEventListener("click", () => editarProducto(null, () => pintar()));
    ctx.acciones.querySelector("#aumento").addEventListener("click", () => aumentoMasivo(() => pintar()));
    ctx.acciones.querySelector("#excel").addEventListener("click", exportar);
  }

  el.innerHTML = `
    ${admin ? `<div class="segmentado" id="pestañas" style="margin-bottom:14px"><button data-t="productos">Productos</button><button data-t="mermas">Mermas y pérdidas</button><button data-t="precios">Historial de precios</button></div>` : ""}
    <div id="cuerpo"></div>`;

  const pintar = () => {
    el.querySelectorAll("#pestañas button").forEach((b) => b.classList.toggle("activo", b.dataset.t === filtro.pestaña));
    const cuerpo = el.querySelector("#cuerpo");
    if (admin && filtro.pestaña === "mermas") return pintarMermas(cuerpo, pintar);
    if (admin && filtro.pestaña === "precios") return pintarHistorial(cuerpo);
    pintarProductos(cuerpo, admin, pintar);
  };
  el.querySelector("#pestañas")?.addEventListener("click", (e) => {
    const b = e.target.closest("[data-t]");
    if (!b) return;
    filtro.pestaña = b.dataset.t;
    pintar();
  });
  pintar();
}

function pintarProductos(cuerpo, admin, repintar) {
  const valorStock = db.productos.filter((p) => p.activo).reduce((a, p) => a + Math.max(0, p.stock) * p.costo, 0);
  const valorVenta = db.productos.filter((p) => p.activo).reduce((a, p) => a + Math.max(0, p.stock) * p.precio, 0);
  const bajos = db.productos.filter((p) => p.activo && estadoStock(p) !== "ok").length;
  const vencen = db.productos.filter((p) => p.activo && diasParaVencer(p) !== null && diasParaVencer(p) <= 15).length;
  cuerpo.innerHTML = `
    ${admin ? `<div class="grilla g4" style="margin-bottom:16px">
      <div class="tarjeta kpi destacado"><div class="etiqueta">Mercadería en el local (a costo)</div><div class="valor">${pesos(valorStock)}</div><div class="pie">Vendida a precio actual: ${pesos(valorVenta)}</div></div>
      <div class="tarjeta kpi"><div class="etiqueta">${icono("productos")} Productos activos</div><div class="valor">${numero(db.productos.filter((p) => p.activo).length)}</div><div class="pie">${db.categorias.length} categorías</div></div>
      <div class="tarjeta kpi"><div class="etiqueta">${icono("alerta")} Para reponer</div><div class="valor" style="color:var(--rojo)">${bajos}</div><div class="pie">Debajo del stock mínimo</div></div>
      <div class="tarjeta kpi"><div class="etiqueta">${icono("calendario")} Vencen en 15 días</div><div class="valor" style="color:#a46a00">${vencen}</div><div class="pie">Conviene ponerlos en promo</div></div>
    </div>` : ""}
    <div class="filtros">
      <div class="entrada-ico crece">${icono("buscar")}<input class="entrada" id="buscar" placeholder="Buscar por nombre o código de barras" value="${escapar(filtro.texto)}" style="width:100%" /></div>
      <select class="entrada" id="categoria"><option value="">Todas las categorías</option>${db.categorias.map((c) => `<option value="${c.id}" ${filtro.categoria === c.id ? "selected" : ""}>${escapar(c.nombre)}</option>`).join("")}</select>
      <select class="entrada" id="estado">
        <option value="">Todo el stock</option>
        <option value="bajo" ${filtro.estado === "bajo" ? "selected" : ""}>Para reponer</option>
        <option value="vence" ${filtro.estado === "vence" ? "selected" : ""}>Próximos a vencer</option>
      </select>
    </div>
    <div class="tarjeta"><div class="tabla-caja" id="tabla"></div></div>`;

  const pintarTabla = () => {
    const t = filtro.texto.trim();
    let lista = t ? buscarProductos(t, 500) : db.productos.filter((p) => p.activo);
    if (filtro.categoria) lista = lista.filter((p) => p.categoria === filtro.categoria);
    if (filtro.estado === "bajo") lista = lista.filter((p) => estadoStock(p) !== "ok");
    if (filtro.estado === "vence") lista = lista.filter((p) => diasParaVencer(p) !== null && diasParaVencer(p) <= 15).sort((a, b) => diasParaVencer(a) - diasParaVencer(b));
    const filas = lista
      .map((p) => {
        const est = estadoStock(p);
        const d = diasParaVencer(p);
        const margen = ((p.precio - p.costo) / p.precio) * 100;
        const cat = categoria(p.categoria);
        return `<tr>
          <td class="celda-prod"><b>${escapar(p.nombre)}</b><span class="num">${p.codigo}</span></td>
          <td class="ocultar-movil"><span class="chip"><span class="punto" style="background:${cat?.color}"></span>${escapar(cat?.nombre)}</span></td>
          ${admin ? `<td class="der num ocultar-movil">${pesos(p.costo)}</td>` : ""}
          <td class="der num"><b>${pesos(p.precio)}</b></td>
          ${admin ? `<td class="der num ocultar-movil"><span style="color:${margen < 20 ? "var(--rojo)" : "var(--verde)"};font-weight:600">${porcentaje(margen, 0)}</span></td>` : ""}
          <td class="der"><span class="chip ${est === "sin" ? "rojo" : est === "bajo" ? "ambar" : ""}">${p.stock} u.</span></td>
          <td class="ocultar-movil">${d === null ? `<span style="color:var(--texto-3)">—</span>` : `<span class="chip ${d <= 3 ? "rojo" : d <= 15 ? "ambar" : ""}">${d < 0 ? "Vencido" : d === 0 ? "Hoy" : fecha(p.vence + "T12:00")}</span>`}</td>
          ${
            admin
              ? `<td><div class="acciones-fila">
                <button class="boton fantasma icono chico" data-stock="${p.id}" title="Ajustar stock">${icono("paquete", "chico")}</button>
                <button class="boton fantasma icono chico" data-merma="${p.id}" title="Registrar merma (rotura, vencido)">${icono("merma", "chico")}</button>
                <button class="boton fantasma icono chico" data-editar="${p.id}" title="Editar">${icono("editar", "chico")}</button>
                <button class="boton fantasma icono chico" data-borrar="${p.id}" title="Borrar">${icono("basura", "chico")}</button>
              </div></td>`
              : ""
          }
        </tr>`;
      })
      .join("");
    cuerpo.querySelector("#tabla").innerHTML = lista.length
      ? `<table class="tabla"><thead><tr><th>Producto</th><th class="ocultar-movil">Categoría</th>${admin ? `<th class="der ocultar-movil">Costo</th>` : ""}<th class="der">Precio</th>${admin ? `<th class="der ocultar-movil">Margen</th>` : ""}<th class="der">Stock</th><th class="ocultar-movil">Vence</th>${admin ? "<th></th>" : ""}</tr></thead><tbody>${filas}</tbody></table>`
      : `<div class="vacio">No hay productos con estos filtros.</div>`;
  };
  cuerpo.querySelector("#buscar").addEventListener("input", (e) => {
    filtro.texto = e.target.value;
    pintarTabla();
  });
  cuerpo.querySelector("#categoria").addEventListener("change", (e) => {
    filtro.categoria = e.target.value;
    pintarTabla();
  });
  cuerpo.querySelector("#estado").addEventListener("change", (e) => {
    filtro.estado = e.target.value;
    pintarTabla();
  });
  cuerpo.querySelector("#tabla").addEventListener("click", async (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.editar) editarProducto(producto(b.dataset.editar), repintar);
    if (b.dataset.stock) ajustarStock(producto(b.dataset.stock), repintar);
    if (b.dataset.merma) registrarMerma(producto(b.dataset.merma), repintar);
    if (b.dataset.borrar) {
      const p = producto(b.dataset.borrar);
      if (!(await confirmar("Borrar producto", `¿Borrar <b>${escapar(p.nombre)}</b>? Deja de aparecer en la caja y en el stock. Las ventas anteriores no se modifican.`, { boton: "Borrar", peligro: true }))) return;
      p.activo = false;
      guardar();
      aviso("Producto borrado");
      repintar();
    }
  });
  pintarTabla();
}

export function editarProducto(p, alGuardar, inicial = {}) {
  const nuevo = !p;
  const v = p || { nombre: "", codigo: inicial.codigo || "", categoria: "bebidas", proveedor: "centro", costo: "", precio: "", stock: 0, minimo: 5, vence: "" };
  const m = abrirModal({
    titulo: nuevo ? "Nuevo producto" : "Editar producto",
    sub: nuevo ? "Con la pistola podés leer el código directo en el campo." : escapar(v.nombre),
    cuerpo: `<form id="f-prod" class="form-grilla">
      <div class="campo ancho"><label>Nombre</label><input class="entrada" name="nombre" value="${escapar(v.nombre)}" required ${nuevo && !v.codigo ? "" : "autofocus"} placeholder="Ej: Coca-Cola 2,25 L" /></div>
      <div class="campo"><label>Código de barras</label><div class="entrada-ico">${icono("codigo")}<input class="entrada num" name="codigo" value="${escapar(v.codigo)}" ${nuevo && !v.codigo ? "autofocus" : ""} placeholder="Leé el código con la pistola" /></div></div>
      <div class="campo"><label>Categoría</label><select class="entrada" name="categoria">${db.categorias.map((c) => `<option value="${c.id}" ${c.id === v.categoria ? "selected" : ""}>${escapar(c.nombre)}</option>`).join("")}</select></div>
      <div class="campo"><label>Costo (lo que te sale)</label><input class="entrada num" name="costo" type="number" min="0" step="10" value="${v.costo}" required /></div>
      <div class="campo"><label>Precio de venta</label><input class="entrada num" name="precio" type="number" min="0" step="10" value="${v.precio}" required /></div>
      <div class="campo"><label>Margen de ganancia</label><div class="entrada-ico">${icono("porcentaje")}<input class="entrada num" id="margen" type="number" step="1" placeholder="%" /></div><p class="ayuda">Escribí un % y se calcula el precio.</p></div>
      <div class="campo"><label>Proveedor</label><select class="entrada" name="proveedor">${db.proveedores.map((x) => `<option value="${x.id}" ${x.id === v.proveedor ? "selected" : ""}>${escapar(x.nombre)}</option>`).join("")}</select></div>
      <div class="campo"><label>Stock actual</label><input class="entrada num" name="stock" type="number" step="1" value="${v.stock}" /></div>
      <div class="campo"><label>Stock mínimo (alerta)</label><input class="entrada num" name="minimo" type="number" min="0" step="1" value="${v.minimo}" /></div>
      <div class="campo"><label>Vencimiento (opcional)</label><input class="entrada" name="vence" type="date" value="${v.vence || ""}" /></div>
    </form>`,
    pie: `<button class="boton sec" data-cerrar>Cancelar</button><button class="boton primario" form="f-prod">${nuevo ? "Crear producto" : "Guardar cambios"}</button>`,
  });
  const f = m.querySelector("form");
  const margen = m.querySelector("#margen");
  const calcMargen = () => {
    const c = Number(f.costo.value);
    const pr = Number(f.precio.value);
    margen.value = c && pr ? Math.round(((pr - c) / pr) * 100) : "";
  };
  calcMargen();
  f.costo.addEventListener("input", calcMargen);
  f.precio.addEventListener("input", calcMargen);
  margen.addEventListener("input", () => {
    const c = Number(f.costo.value);
    const mg = Number(margen.value);
    if (c && mg < 100) f.precio.value = Math.round(c / (1 - mg / 100) / 10) * 10;
  });
  f.codigo.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      f.nombre.focus();
    }
  });
  f.addEventListener("submit", (e) => {
    e.preventDefault();
    const d = leerForm(f);
    if (d.codigo && db.productos.some((x) => x.activo && x.codigo === d.codigo && x !== p)) return aviso("Ya hay otro producto con ese código", "error");
    d.vence = d.vence || null;
    if (nuevo) {
      db.productos.push({ id: nuevoId("pr"), ...d, codigo: d.codigo || String(Date.now()).slice(-13), pop: 1, activo: true });
    } else {
      if (p.precio !== d.precio) db.historialPrecios.unshift({ fecha: Date.now(), producto: p.id, nombre: p.nombre, antes: p.precio, despues: d.precio, usuario: sesion().id, motivo: "Edición manual" });
      Object.assign(p, d);
    }
    guardar();
    cerrarModal();
    aviso(nuevo ? "Producto creado" : "Cambios guardados");
    alGuardar?.();
  });
}

function ajustarStock(p, alGuardar) {
  const m = abrirModal({
    titulo: "Ajustar stock",
    sub: `${escapar(p.nombre)} · hoy figuran ${p.stock} u.`,
    clase: "angosto",
    cuerpo: `<form id="f-stock"><div class="campo"><label>Unidades contadas en el local</label><input class="entrada num" name="stock" type="number" value="${p.stock}" autofocus style="font-size:20px;height:50px" /></div>
      <p class="ayuda">Usalo después de contar la mercadería. Si hay diferencia, queda registrada como merma o sobrante.</p></form>`,
    pie: `<button class="boton sec" data-cerrar>Cancelar</button><button class="boton primario" form="f-stock">Guardar</button>`,
  });
  m.querySelector("form").addEventListener("submit", (e) => {
    e.preventDefault();
    const nuevo = Number(e.target.stock.value);
    const dif = nuevo - p.stock;
    if (dif < 0) db.mermas.unshift({ id: nuevoId("m"), fecha: Date.now(), producto: p.id, nombre: p.nombre, cantidad: -dif, motivo: "Faltante en el conteo", costo: -dif * p.costo, usuario: sesion().id });
    p.stock = nuevo;
    guardar();
    cerrarModal();
    aviso(dif < 0 ? `Stock ajustado. Faltante de ${-dif} u. registrado como pérdida.` : "Stock ajustado");
    alGuardar();
  });
}

export function registrarMerma(p, alGuardar) {
  const m = abrirModal({
    titulo: "Registrar merma",
    sub: "Rotura, vencimiento o faltante. Se descuenta del stock y suma como pérdida en las métricas.",
    clase: "angosto",
    cuerpo: `<form id="f-merma" class="form-grilla">
      <div class="campo ancho"><label>Producto</label><select class="entrada" name="producto">${db.productos.filter((x) => x.activo).map((x) => `<option value="${x.id}" ${x === p ? "selected" : ""}>${escapar(x.nombre)}</option>`).join("")}</select></div>
      <div class="campo"><label>Cantidad</label><input class="entrada num" name="cantidad" type="number" min="1" value="1" autofocus /></div>
      <div class="campo"><label>Motivo</label><select class="entrada" name="motivo"><option>Rotura</option><option>Vencido</option><option>Cortado de frío</option><option>Paquete roto</option><option>Faltante en el conteo</option><option>Consumo interno</option></select></div>
    </form>`,
    pie: `<button class="boton sec" data-cerrar>Cancelar</button><button class="boton primario" form="f-merma">Registrar</button>`,
  });
  m.querySelector("form").addEventListener("submit", (e) => {
    e.preventDefault();
    const d = leerForm(e.target);
    const prod = producto(d.producto);
    prod.stock -= d.cantidad;
    db.mermas.unshift({ id: nuevoId("m"), fecha: Date.now(), producto: prod.id, nombre: prod.nombre, cantidad: d.cantidad, motivo: d.motivo, costo: d.cantidad * prod.costo, usuario: sesion().id });
    guardar();
    cerrarModal();
    aviso(`Merma registrada: pérdida de ${pesos(d.cantidad * prod.costo)}`);
    alGuardar();
  });
}

function aumentoMasivo(alGuardar) {
  const m = abrirModal({
    titulo: "Aumentar precios",
    sub: "Actualizá una categoría o la lista de un proveedor de una sola vez.",
    clase: "ancho",
    cuerpo: `<form id="f-aum" class="form-grilla" style="grid-template-columns:repeat(4,minmax(0,1fr))">
      <div class="campo"><label>Aplicar a</label><select class="entrada" name="tipo"><option value="categoria">Una categoría</option><option value="proveedor">Un proveedor</option><option value="todo">Todos los productos</option></select></div>
      <div class="campo"><label>Cuál</label><select class="entrada" name="cual"></select></div>
      <div class="campo"><label>Aumento</label><div class="entrada-ico">${icono("porcentaje")}<input class="entrada num" name="pct" type="number" step="0.5" value="8" /></div></div>
      <div class="campo"><label>Redondear a</label><select class="entrada" name="redondeo"><option value="10">$ 10</option><option value="50">$ 50</option><option value="100" selected>$ 100</option></select></div>
      <label class="ancho" style="display:flex;gap:8px;align-items:center;font-size:14px"><input type="checkbox" name="costo" checked /> El proveedor también me aumentó: actualizar el costo con el mismo %</label>
    </form>
    <div class="tarjeta mt" style="box-shadow:none"><div class="tabla-caja" id="vista-previa" style="max-height:300px;overflow:auto"></div></div>`,
    pie: `<span class="izq ayuda" id="resumen-aum" style="margin:0"></span><button class="boton sec" data-cerrar>Cancelar</button><button class="boton primario" id="aplicar">Aplicar aumento</button>`,
  });
  const f = m.querySelector("form");
  const opciones = () => {
    const t = f.tipo.value;
    f.cual.disabled = t === "todo";
    f.cual.innerHTML = t === "proveedor" ? db.proveedores.map((x) => `<option value="${x.id}">${escapar(x.nombre)}</option>`).join("") : t === "categoria" ? db.categorias.map((x) => `<option value="${x.id}">${escapar(x.nombre)}</option>`).join("") : "<option>—</option>";
  };
  const afectados = () => {
    const d = leerForm(f);
    return db.productos.filter((p) => p.activo && (d.tipo === "todo" || p[d.tipo] === d.cual));
  };
  const calcular = (p) => {
    const d = leerForm(f);
    const r = Number(d.redondeo);
    return { precio: Math.round((p.precio * (1 + d.pct / 100)) / r) * r, costo: d.costo ? Math.round(p.costo * (1 + d.pct / 100)) : p.costo };
  };
  const previa = () => {
    const lista = afectados();
    m.querySelector("#vista-previa").innerHTML = `<table class="tabla"><thead><tr><th>Producto</th><th class="der">Precio actual</th><th class="der">Precio nuevo</th><th class="der">Margen</th></tr></thead><tbody>
      ${lista
        .map((p) => {
          const n = calcular(p);
          return `<tr><td>${escapar(p.nombre)}</td><td class="der num" style="color:var(--texto-3)">${pesos(p.precio)}</td><td class="der num"><b>${pesos(n.precio)}</b></td><td class="der num">${porcentaje(((n.precio - n.costo) / n.precio) * 100, 0)}</td></tr>`;
        })
        .join("")}</tbody></table>`;
    m.querySelector("#resumen-aum").textContent = `${lista.length} productos`;
  };
  opciones();
  previa();
  f.tipo.addEventListener("change", () => {
    opciones();
    previa();
  });
  f.addEventListener("input", previa);
  f.addEventListener("change", previa);
  m.querySelector("#aplicar").addEventListener("click", () => {
    const lista = afectados();
    const d = leerForm(f);
    for (const p of lista) {
      const n = calcular(p);
      db.historialPrecios.unshift({ fecha: Date.now(), producto: p.id, nombre: p.nombre, antes: p.precio, despues: n.precio, usuario: sesion().id, motivo: `Aumento masivo ${d.pct} %` });
      p.precio = n.precio;
      p.costo = n.costo;
    }
    guardar();
    cerrarModal();
    aviso(`Precios actualizados en ${lista.length} productos`);
    alGuardar();
  });
}

function pintarMermas(cuerpo, repintar) {
  const total30 = db.mermas.filter((m) => m.fecha > Date.now() - 30 * 86_400_000).reduce((a, m) => a + m.costo, 0);
  cuerpo.innerHTML = `
    <div class="grilla g3" style="margin-bottom:16px">
      <div class="tarjeta kpi destacado"><div class="etiqueta">Pérdidas últimos 30 días</div><div class="valor">${pesos(total30)}</div><div class="pie">Valuado a costo</div></div>
      <div class="tarjeta kpi"><div class="etiqueta">${icono("merma")} Registros</div><div class="valor">${db.mermas.length}</div><div class="pie">Roturas, vencidos y faltantes</div></div>
      <div class="tarjeta kpi" style="display:grid;place-items:center"><button class="boton primario" id="nueva-merma">${icono("mas")} Registrar merma</button></div>
    </div>
    <div class="tarjeta"><div class="tabla-caja"><table class="tabla"><thead><tr><th>Fecha</th><th>Producto</th><th class="der">Cant.</th><th>Motivo</th><th class="ocultar-movil">Registró</th><th class="der">Pérdida</th></tr></thead><tbody>
      ${[...db.mermas]
        .sort((a, b) => b.fecha - a.fecha)
        .map((m) => `<tr><td class="num">${fecha(m.fecha)}</td><td>${escapar(m.nombre)}</td><td class="der num">${m.cantidad}</td><td><span class="chip">${escapar(m.motivo)}</span></td><td class="ocultar-movil">${escapar(usuario(m.usuario)?.nombre)}</td><td class="der num" style="color:var(--rojo)"><b>${pesos(m.costo)}</b></td></tr>`)
        .join("")}
    </tbody></table></div></div>`;
  cuerpo.querySelector("#nueva-merma").addEventListener("click", () => registrarMerma(null, repintar));
}

function pintarHistorial(cuerpo) {
  const h = db.historialPrecios;
  cuerpo.innerHTML = `<div class="tarjeta"><div class="tabla-caja">${
    h.length
      ? `<table class="tabla"><thead><tr><th>Fecha</th><th>Producto</th><th class="der">Antes</th><th class="der">Ahora</th><th class="der">Cambio</th><th class="ocultar-movil">Motivo</th></tr></thead><tbody>
        ${h
          .slice(0, 300)
          .map((x) => `<tr><td class="num">${fechaHora(x.fecha)}</td><td>${escapar(x.nombre)}</td><td class="der num">${pesos(x.antes)}</td><td class="der num"><b>${pesos(x.despues)}</b></td><td class="der"><span class="delta ${x.despues >= x.antes ? "sube" : "baja"}">${porcentaje(((x.despues - x.antes) / x.antes) * 100)}</span></td><td class="ocultar-movil">${escapar(x.motivo)} · ${escapar(usuario(x.usuario)?.nombre)}</td></tr>`)
          .join("")}</tbody></table>`
      : `<div class="vacio">Todavía no hubo cambios de precio. Cuando uses “Aumentar precios” o edites un precio, queda registrado acá.</div>`
  }</div></div>`;
}

function exportar() {
  exportarExcel("La Morocha - Stock.xlsx", {
    Stock: db.productos
      .filter((p) => p.activo)
      .map((p) => ({
        Código: p.codigo,
        Producto: p.nombre,
        Categoría: categoria(p.categoria)?.nombre,
        Proveedor: proveedor(p.proveedor)?.nombre,
        Costo: p.costo,
        Precio: p.precio,
        "Margen %": Math.round(((p.precio - p.costo) / p.precio) * 100),
        Stock: p.stock,
        Mínimo: p.minimo,
        "Valor a costo": Math.max(0, p.stock) * p.costo,
        Vence: p.vence || "",
      })),
  });
}
