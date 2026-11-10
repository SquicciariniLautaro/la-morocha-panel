// Promociones: combos, packs por cantidad y descuentos por medio de pago.
import { icono } from "../iconos.js";
import { db, guardar, pesos, escapar, producto, categoria, nuevoId, MEDIOS, DIA } from "../estado.js";
import { abrirModal, cerrarModal, aviso, confirmar, leerForm } from "../ui.js";

const TIPOS = { combo: "Combo", pack: "Pack por cantidad", medio: "Descuento por medio de pago" };

function precioNormal(p) {
  if (p.tipo === "combo") return p.productos.reduce((a, id) => a + (producto(id)?.precio || 0), 0);
  if (p.tipo === "pack") return (producto(p.producto)?.precio || 0) * p.cantidad;
  return 0;
}

export function render(el, ctx) {
  const repintar = () => render(el, ctx);
  ctx.acciones.innerHTML = `<button class="boton primario" id="nueva">${icono("mas")}<span class="txt">Nueva promo</span></button>`;
  ctx.acciones.querySelector("#nueva").addEventListener("click", () => editar(null, repintar));
  const desde = Date.now() - 30 * DIA;
  const usos = (id) => {
    let n = 0;
    let monto = 0;
    for (const v of db.ventas) if (v.fecha >= desde && v.estado === "ok") for (const p of v.promos || []) if (p.id === id) (n++, (monto += p.monto));
    return { n, monto };
  };

  el.innerHTML = `
    <div class="aviso-demo" style="margin-bottom:16px">${icono("promos")}<span>Las promos activas se aplican solas en la caja cuando el ticket cumple la condición. El empleado no tiene que acordarse de nada.</span></div>
    <div class="grilla g3">${db.promos
      .map((p) => {
        const normal = precioNormal(p);
        const u = usos(p.id);
        return `<div class="tarjeta" style="${p.activa ? "" : "opacity:.6"}">
          <div class="tarjeta-cab"><span class="chip ${p.tipo === "combo" ? "rosa" : p.tipo === "pack" ? "ambar" : "violeta"}">${TIPOS[p.tipo]}</span>
            <div class="der"><label style="display:flex;align-items:center;gap:6px;font-size:13px;font-weight:600"><input type="checkbox" data-activar="${p.id}" ${p.activa ? "checked" : ""}/> Activa</label></div></div>
          <div class="tarjeta-cuerpo">
            <h3 style="font-size:19px">${escapar(p.nombre)}</h3>
            <p style="margin:4px 0 14px;color:var(--texto-2);font-size:13.5px">${escapar(p.detalle)}</p>
            ${
              p.tipo === "medio"
                ? `<div style="font-family:var(--f-titulo);font-size:26px;font-weight:700">${p.porcentaje} % off</div><div class="ayuda">En ${escapar(categoria(p.categoria)?.nombre)} pagando con ${MEDIOS[p.medio].nombre.toLowerCase()}</div>`
                : `<div style="display:flex;align-items:baseline;gap:10px"><span style="font-family:var(--f-titulo);font-size:26px;font-weight:700" class="num">${pesos(p.precio)}</span><s style="color:var(--texto-3)" class="num">${pesos(normal)}</s></div><div class="ayuda">El cliente ahorra ${pesos(normal - p.precio)}</div>`
            }
            <div style="display:flex;align-items:center;gap:8px;margin-top:14px;padding-top:12px;border-top:1px dashed var(--borde)">
              <span class="ayuda" style="margin:0">Últimos 30 días: <b style="color:var(--texto)">${u.n} usos</b>${u.monto ? ` · ${pesos(u.monto)} en descuentos` : ""}</span>
              <div class="acciones-fila" style="margin-left:auto">
                <button class="boton fantasma icono chico" data-editar="${p.id}" title="Editar">${icono("editar", "chico")}</button>
                <button class="boton fantasma icono chico" data-borrar="${p.id}" title="Borrar">${icono("basura", "chico")}</button>
              </div>
            </div>
          </div></div>`;
      })
      .join("")}</div>`;

  el.querySelectorAll("[data-activar]").forEach((c) =>
    c.addEventListener("change", () => {
      const p = db.promos.find((x) => x.id === c.dataset.activar);
      p.activa = c.checked;
      guardar();
      aviso(p.activa ? `“${p.nombre}” activada` : `“${p.nombre}” pausada`);
      repintar();
    })
  );
  el.querySelectorAll("[data-editar]").forEach((b) => b.addEventListener("click", () => editar(db.promos.find((x) => x.id === b.dataset.editar), repintar)));
  el.querySelectorAll("[data-borrar]").forEach((b) =>
    b.addEventListener("click", async () => {
      const p = db.promos.find((x) => x.id === b.dataset.borrar);
      if (!(await confirmar("Borrar promo", `¿Borrar la promo “${escapar(p.nombre)}”?`, { boton: "Borrar", peligro: true }))) return;
      db.promos = db.promos.filter((x) => x !== p);
      guardar();
      repintar();
    })
  );
}

function editar(p, repintar) {
  const v = p || { tipo: "combo", nombre: "", productos: ["", ""], producto: "", cantidad: 2, precio: "", medio: "efectivo", categoria: "vinos", porcentaje: 10 };
  const opcProd = (sel) => `<option value="">Elegí…</option>` + db.productos.filter((x) => x.activo).map((x) => `<option value="${x.id}" ${x.id === sel ? "selected" : ""}>${escapar(x.nombre)} · ${pesos(x.precio)}</option>`).join("");
  const m = abrirModal({
    titulo: p ? "Editar promo" : "Nueva promo",
    cuerpo: `<form id="f-promo" class="form-grilla">
      <div class="campo"><label>Tipo</label><select class="entrada" name="tipo">${Object.entries(TIPOS).map(([k, n]) => `<option value="${k}" ${k === v.tipo ? "selected" : ""}>${n}</option>`).join("")}</select></div>
      <div class="campo"><label>Nombre</label><input class="entrada" name="nombre" value="${escapar(v.nombre)}" required placeholder="Ej: Fernet + Coca" /></div>
      <div class="ancho" data-t="combo" style="display:contents">
        <div class="campo"><label>Producto 1</label><select class="entrada" name="p1">${opcProd(v.productos?.[0])}</select></div>
        <div class="campo"><label>Producto 2</label><select class="entrada" name="p2">${opcProd(v.productos?.[1])}</select></div>
      </div>
      <div class="ancho" data-t="pack" style="display:contents">
        <div class="campo"><label>Producto</label><select class="entrada" name="producto">${opcProd(v.producto)}</select></div>
        <div class="campo"><label>Cantidad</label><input class="entrada num" name="cantidad" type="number" min="2" value="${v.cantidad || 2}" /></div>
      </div>
      <div class="ancho" data-t="medio" style="display:contents">
        <div class="campo"><label>Medio de pago</label><select class="entrada" name="medio">${Object.entries(MEDIOS).map(([k, x]) => `<option value="${k}" ${k === v.medio ? "selected" : ""}>${x.nombre}</option>`).join("")}</select></div>
        <div class="campo"><label>Categoría</label><select class="entrada" name="categoria">${db.categorias.map((c) => `<option value="${c.id}" ${c.id === v.categoria ? "selected" : ""}>${escapar(c.nombre)}</option>`).join("")}</select></div>
        <div class="campo"><label>Descuento %</label><input class="entrada num" name="porcentaje" type="number" min="1" max="90" value="${v.porcentaje || 10}" /></div>
      </div>
      <div class="campo" data-precio><label>Precio de la promo</label><input class="entrada num" name="precio" type="number" min="0" step="10" value="${v.precio || ""}" /><p class="ayuda" id="normal"></p></div>
    </form>`,
    pie: `<button class="boton sec" data-cerrar>Cancelar</button><button class="boton primario" form="f-promo">Guardar promo</button>`,
  });
  const f = m.querySelector("form");
  const mostrar = () => {
    f.querySelectorAll("[data-t]").forEach((g) => (g.style.display = g.dataset.t === f.tipo.value ? "contents" : "none"));
    f.querySelector("[data-precio]").style.display = f.tipo.value === "medio" ? "none" : "";
    const d = leerForm(f);
    const normal = d.tipo === "combo" ? (producto(d.p1)?.precio || 0) + (producto(d.p2)?.precio || 0) : (producto(d.producto)?.precio || 0) * (d.cantidad || 0);
    m.querySelector("#normal").textContent = normal ? `Precio normal: ${pesos(normal)}` : "";
  };
  mostrar();
  f.addEventListener("change", mostrar);
  f.addEventListener("submit", (e) => {
    e.preventDefault();
    const d = leerForm(f);
    const base = { nombre: d.nombre, tipo: d.tipo, activa: p ? p.activa : true };
    let promo;
    if (d.tipo === "combo") {
      if (!d.p1 || !d.p2) return aviso("Elegí los dos productos del combo", "error");
      promo = { ...base, productos: [d.p1, d.p2], precio: d.precio, detalle: `${producto(d.p1).nombre} + ${producto(d.p2).nombre}` };
    } else if (d.tipo === "pack") {
      if (!d.producto) return aviso("Elegí el producto", "error");
      promo = { ...base, producto: d.producto, cantidad: d.cantidad, precio: d.precio, detalle: `${producto(d.producto).nombre} x ${d.cantidad}` };
    } else {
      promo = { ...base, medio: d.medio, categoria: d.categoria, porcentaje: d.porcentaje, detalle: `${d.porcentaje}% de descuento en ${categoria(d.categoria).nombre.toLowerCase()} pagando con ${MEDIOS[d.medio].nombre.toLowerCase()}` };
    }
    if (p) {
      for (const k of ["productos", "producto", "cantidad", "precio", "medio", "categoria", "porcentaje"]) delete p[k];
      Object.assign(p, promo);
    } else db.promos.push({ id: nuevoId("p"), ...promo });
    guardar();
    cerrarModal();
    aviso("Promo guardada");
    repintar();
  });
}
