// Usuarios y permisos: quién entra al sistema y qué puede ver cada uno.
import { icono } from "../iconos.js";
import { db, guardar, escapar, nuevoId, sesion } from "../estado.js";
import { abrirModal, cerrarModal, aviso, leerForm } from "../ui.js";

const PERMISOS = [
  ["Vender en la caja (lector, búsqueda, cobro)", true, true],
  ["Abrir y cerrar su caja", true, true],
  ["Ver sus propias ventas del día y reimprimir tickets", true, true],
  ["Consultar precios y stock", true, true],
  ["Ver costos y márgenes de los productos", true, false],
  ["Cargar, editar y borrar productos", true, false],
  ["Editar o anular ventas", true, false],
  ["Ver ventas de todos y de días anteriores", true, false],
  ["Métricas, ganancias y estado de resultados", true, false],
  ["Gastos, proveedores y cuentas corrientes", true, false],
  ["Cuánto efectivo debería haber al cerrar (arqueo ciego)", true, false],
  ["Usuarios, promociones y ajustes", true, false],
];

export function render(el, ctx) {
  const repintar = () => render(el, ctx);
  ctx.acciones.innerHTML = `<button class="boton primario" id="nuevo">${icono("mas")}<span class="txt">Nuevo usuario</span></button>`;
  ctx.acciones.querySelector("#nuevo").addEventListener("click", () => editar(null, repintar));
  el.innerHTML = `
    <div class="grilla g-3-2">
      <div class="tarjeta"><div class="tarjeta-cab" style="padding-bottom:12px"><h3>Usuarios</h3></div><div class="tabla-caja"><table class="tabla"><thead><tr><th>Nombre</th><th>Usuario</th><th>Rol</th><th class="ocultar-movil">Turno</th><th class="cent">Estado</th><th></th></tr></thead><tbody>
        ${db.usuarios
          .map(
            (u) => `<tr><td><div style="display:flex;align-items:center;gap:10px"><span class="avatar ${u.rol === "admin" ? "" : "emp"}" style="width:30px;height:30px;font-size:12px">${escapar(u.nombre[0])}</span><b>${escapar(u.nombre)}</b></div></td>
            <td class="num">${escapar(u.usuario)}</td><td><span class="chip ${u.rol === "admin" ? "rosa" : "ambar"}">${u.rol === "admin" ? "Administrador" : "Empleado"}</span></td>
            <td class="ocultar-movil">${escapar(u.turno || "")}</td><td class="cent">${u.activo ? `<span class="chip verde">Activo</span>` : `<span class="chip">Sin acceso</span>`}</td>
            <td><div class="acciones-fila"><button class="boton fantasma icono chico" data-editar="${u.id}" title="Editar">${icono("editar", "chico")}</button></div></td></tr>`
          )
          .join("")}
      </tbody></table></div></div>
      <div class="tarjeta"><div class="tarjeta-cab"><h3>Qué ve cada uno</h3></div><div class="tarjeta-cuerpo" style="padding-top:8px">
        <table class="tabla permisos"><thead><tr><th>Permiso</th><th class="cent">Dueño</th><th class="cent">Empleado</th></tr></thead><tbody>
          ${PERMISOS.map(([n, a, e]) => `<tr><td style="font-size:13.5px">${n}</td><td>${a ? `<span class="si">${icono("ok", "chico")}</span>` : ""}</td><td>${e ? `<span class="si">${icono("ok", "chico")}</span>` : `<span class="no">${icono("cerrar", "chico")}</span>`}</td></tr>`).join("")}
        </tbody></table></div></div>
    </div>`;
  el.querySelectorAll("[data-editar]").forEach((b) => b.addEventListener("click", () => editar(db.usuarios.find((u) => u.id === b.dataset.editar), repintar)));
}

function editar(u, repintar) {
  const v = u || { nombre: "", usuario: "", clave: "", rol: "empleado", turno: "", activo: true };
  const yo = u && u.id === sesion().id;
  const m = abrirModal({
    titulo: u ? "Editar usuario" : "Nuevo usuario",
    clase: "angosto",
    cuerpo: `<form id="f-usu" class="form-grilla" style="grid-template-columns:1fr">
      <div class="campo"><label>Nombre y apellido</label><input class="entrada" name="nombre" value="${escapar(v.nombre)}" required autofocus /></div>
      <div class="campo"><label>Usuario para entrar</label><input class="entrada" name="usuario" value="${escapar(v.usuario)}" required autocapitalize="none" /></div>
      <div class="campo"><label>Contraseña</label><input class="entrada" name="clave" type="password" value="${escapar(v.clave)}" required /></div>
      <div class="campo"><label>Rol</label><select class="entrada" name="rol" ${yo ? "disabled" : ""}><option value="empleado" ${v.rol === "empleado" ? "selected" : ""}>Empleado (solo caja)</option><option value="admin" ${v.rol === "admin" ? "selected" : ""}>Administrador (ve todo)</option></select></div>
      <div class="campo"><label>Turno habitual</label><input class="entrada" name="turno" value="${escapar(v.turno || "")}" placeholder="Ej: Mañana · 9 a 17 h" /></div>
      ${yo ? "" : `<label style="display:flex;gap:8px;align-items:center;font-size:14px"><input type="checkbox" name="activo" ${v.activo ? "checked" : ""}/> Puede entrar al sistema</label>`}
    </form>`,
    pie: `<button class="boton sec" data-cerrar>Cancelar</button><button class="boton primario" form="f-usu">Guardar</button>`,
  });
  m.querySelector("form").addEventListener("submit", (e) => {
    e.preventDefault();
    const d = leerForm(e.target);
    if (yo) {
      d.rol = "admin";
      d.activo = true;
    }
    if (db.usuarios.some((x) => x !== u && x.usuario.toLowerCase() === d.usuario.toLowerCase())) return aviso("Ese usuario ya existe", "error");
    if (u) Object.assign(u, d);
    else db.usuarios.push({ id: nuevoId("u"), ...d });
    guardar();
    cerrarModal();
    aviso("Usuario guardado");
    repintar();
  });
}
