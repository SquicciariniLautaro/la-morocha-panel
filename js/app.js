// Arranque: ingreso, estructura del panel y navegación por secciones (#/caja, #/ventas...).
import { icono } from "./iconos.js";
import { db, sesion, iniciarSesion, cerrarSesion, turnoAbierto, alertas, escapar } from "./estado.js";
import { firmaLambda } from "./ui.js";
import * as inicio from "./vistas/inicio.js";
import * as caja from "./vistas/caja.js";
import * as ventas from "./vistas/ventas.js";
import * as productos from "./vistas/productos.js";
import * as compras from "./vistas/compras.js";
import * as clientes from "./vistas/clientes.js";
import * as gastos from "./vistas/gastos.js";
import * as metricas from "./vistas/metricas.js";
import * as promos from "./vistas/promos.js";
import * as turnos from "./vistas/turnos.js";
import * as usuarios from "./vistas/usuarios.js";
import * as ajustes from "./vistas/ajustes.js";

const raiz = document.getElementById("raiz");

// ruta: [módulo, título, ícono, quién la ve]
const RUTAS = {
  inicio: [inicio, "Inicio", "inicio", "admin"],
  caja: [caja, "Caja", "caja", "todos"],
  ventas: [ventas, "Ventas", "ventas", "todos"],
  turnos: [turnos, "Turnos de caja", "turnos", "todos"],
  productos: [productos, "Productos y stock", "productos", "todos"],
  compras: [compras, "Compras y proveedores", "compras", "admin"],
  promos: [promos, "Promociones", "promos", "admin"],
  metricas: [metricas, "Métricas y finanzas", "metricas", "admin"],
  gastos: [gastos, "Gastos", "gastos", "admin"],
  clientes: [clientes, "Cuentas corrientes", "clientes", "admin"],
  usuarios: [usuarios, "Usuarios y permisos", "usuarios", "admin"],
  ajustes: [ajustes, "Ajustes", "ajustes", "admin"],
};

const MENU_ADMIN = [
  ["Operación", ["inicio", "caja", "ventas", "turnos"]],
  ["Mercadería", ["productos", "compras", "promos"]],
  ["Dinero", ["metricas", "gastos", "clientes"]],
  ["Sistema", ["usuarios", "ajustes"]],
];
const MENU_EMPLEADO = [["Mi turno", ["caja", "ventas", "turnos", "productos"]]];
const NOMBRE_EMPLEADO = { ventas: "Mis ventas", productos: "Consultar precios", turnos: "Mi caja" };

export function ir(ruta) {
  location.hash = "#/" + ruta;
}

function rutaActual() {
  return location.hash.replace(/^#\/?/, "").split("?")[0] || "";
}

function pintar() {
  const u = sesion();
  if (!u) return pintarIngreso();
  let ruta = rutaActual();
  const def = RUTAS[ruta];
  if (!def || (def[3] === "admin" && u.rol !== "admin")) {
    ruta = u.rol === "admin" ? "inicio" : "caja";
    history.replaceState(null, "", "#/" + ruta);
  }
  pintarPanel(u, ruta);
}

function iniciales(nombre) {
  return nombre
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function pintarIngreso() {
  document.title = "La Morocha · Ingresar";
  raiz.innerHTML = `<div class="ingreso">
    <section class="ingreso-marca">
      <div class="medio-marca">
        <img class="logo-grande" src="img/logo.jpg" alt="Logo de Drugstore La Morocha" />
        <div>
          <h1>Todo tu negocio, <em>en un solo lugar.</em></h1>
          <p>Caja, stock, ventas y números del día. Desde la PC del mostrador o desde tu celular.</p>
        </div>
      </div>
      <div class="ingreso-datos">
        <span>${icono("ubicacion", "chico")} Av. Bolivia 27</span>
        <span>${icono("reloj", "chico")} Todos los días de 9 a 00 h</span>
        <span>${icono("instagram", "chico")} @drugstore_lamorocha</span>
      </div>
    </section>
    <section class="ingreso-form-lado">
      <form class="ingreso-form" autocomplete="off">
        <h2>Ingresar</h2>
        <p class="sub">Cada persona entra con su usuario. El sistema registra quién hizo cada venta.</p>
        <div class="campo"><label for="usu">Usuario</label><input class="entrada" id="usu" name="usuario" autocapitalize="none" required /></div>
        <div class="campo"><label for="cla">Contraseña</label><input class="entrada" id="cla" name="clave" type="password" required /></div>
        <div class="error-form" role="alert"></div>
        <button class="boton primario">Entrar ${icono("derecha", "chico")}</button>
        <div class="ingreso-demo">
          <p>Boceto de demostración. Probalo con un usuario de ejemplo:</p>
          <div class="fila">
            <button type="button" class="acceso-rapido" data-u="admin" data-c="morocha"><b>Dueño</b><span>Ve y controla todo</span></button>
            <button type="button" class="acceso-rapido" data-u="sofia" data-c="1234"><b>Empleada</b><span>Solo caja y precios</span></button>
          </div>
        </div>
      </form>
    </section>
    ${firmaLambda()}
  </div>`;
  const form = raiz.querySelector("form");
  const entrar = (u, c) => {
    const ok = iniciarSesion(u, c);
    if (!ok) {
      form.querySelector(".error-form").textContent = "Usuario o contraseña incorrectos.";
      return;
    }
    location.hash = ok.rol === "admin" ? "#/inicio" : "#/caja";
    pintar();
  };
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    entrar(form.usuario.value, form.clave.value);
  });
  form.querySelectorAll("[data-u]").forEach((b) =>
    b.addEventListener("click", () => {
      form.usuario.value = b.dataset.u;
      form.clave.value = b.dataset.c;
      entrar(b.dataset.u, b.dataset.c);
    })
  );
}

function pintarPanel(u, ruta) {
  const admin = u.rol === "admin";
  const [modulo, tituloBase] = RUTAS[ruta];
  const titulo = (!admin && NOMBRE_EMPLEADO[ruta]) || tituloBase;
  document.title = `${titulo} · La Morocha`;
  const al = alertas();
  const burbujas = { productos: al.stock.length + al.vencen.length };
  const menu = (admin ? MENU_ADMIN : MENU_EMPLEADO)
    .map(
      ([grupo, rutas]) =>
        `<div class="nav-grupo">${grupo}</div>` +
        rutas
          .map((r) => {
            const nombre = (!admin && NOMBRE_EMPLEADO[r]) || RUTAS[r][1];
            const b = admin && burbujas[r] ? `<span class="burbuja ambar">${burbujas[r]}</span>` : "";
            return `<a class="nav-item ${r === ruta ? "activo" : ""}" href="#/${r}">${icono(RUTAS[r][2])}<span>${nombre}</span>${b}</a>`;
          })
          .join("")
    )
    .join("");
  const movil = (admin ? ["inicio", "caja", "ventas", "productos"] : ["caja", "ventas", "productos", "turnos"])
    .map((r) => {
      const corto = { inicio: "Inicio", caja: "Caja", ventas: admin ? "Ventas" : "Mis ventas", productos: admin ? "Stock" : "Precios", turnos: "Mi caja" }[r];
      return `<a class="${r === ruta ? "activo" : ""}" href="#/${r}">${icono(RUTAS[r][2])}${corto}</a>`;
    })
    .join("");
  const t = turnoAbierto(admin ? null : u.id);
  const estadoCaja = t
    ? `<span class="estado-caja abierta" title="Caja abierta"><i></i><span class="txt">Caja abierta · ${escapar(db.usuarios.find((x) => x.id === t.usuario)?.nombre.split(" ")[0] || "")}</span></span>`
    : `<span class="estado-caja" title="Caja cerrada"><i></i><span class="txt">Caja cerrada</span></span>`;

  raiz.innerHTML = `<div class="panel">
    <aside class="lateral">
      <div class="lateral-marca"><img src="img/logo.jpg" alt="" /><div><b>La Morocha</b><span>${admin ? "Panel del dueño" : "Panel de caja"}</span></div></div>
      <nav aria-label="Secciones">${menu}</nav>
      <div class="lateral-usuario">
        <span class="avatar ${admin ? "" : "emp"}">${iniciales(u.nombre)}</span>
        <div><b>${escapar(u.nombre)}</b><span>${admin ? "Administrador" : "Empleado"}</span></div>
        <button data-salir title="Cerrar sesión" aria-label="Cerrar sesión">${icono("salir")}</button>
      </div>
    </aside>
    <div class="principal">
      <header class="barra-sup">
        <button class="boton fantasma icono marca-movil" data-menu aria-label="Abrir menú">${icono("menu")}</button>
        <div><div class="migas">${admin ? "Panel del dueño" : "Panel de caja"}</div><h1>${titulo}</h1></div>
        <div class="acciones">${estadoCaja}<span id="acciones-vista" style="display:contents"></span></div>
      </header>
      <main class="contenido" id="vista"></main>
      ${firmaLambda()}
    </div>
    <nav class="nav-movil" aria-label="Accesos rápidos">${movil}<button data-menu>${icono("menu")}Más</button></nav>
  </div>`;

  const panel = raiz.querySelector(".panel");
  raiz.querySelectorAll("[data-menu]").forEach((b) => b.addEventListener("click", () => panel.classList.toggle("menu-abierto")));
  panel.addEventListener("click", (e) => {
    if (panel.classList.contains("menu-abierto") && (e.target === panel || e.target.closest(".nav-item"))) panel.classList.remove("menu-abierto");
  });
  panel.addEventListener("pointerdown", (e) => {
    if (panel.classList.contains("menu-abierto") && !e.target.closest(".lateral") && !e.target.closest("[data-menu]")) panel.classList.remove("menu-abierto");
  });
  raiz.querySelector("[data-salir]").addEventListener("click", () => {
    cerrarSesion();
    location.hash = "";
    pintar();
  });

  const vista = document.getElementById("vista");
  modulo.render(vista, { usuario: u, admin, acciones: document.getElementById("acciones-vista"), repintar: pintar });
  window.scrollTo(0, 0);
}

window.addEventListener("hashchange", pintar);
pintar();
