// Piezas de interfaz compartidas: ventanas, avisos y la firma de Lambda.
import { icono } from "./iconos.js";
import { escapar } from "./estado.js";

const capa = () => document.getElementById("capa-modal");

export function abrirModal({ titulo, sub = "", cuerpo = "", pie = "", clase = "" }) {
  capa().innerHTML = `<div class="fondo-modal">
    <div class="modal ${clase}" role="dialog" aria-modal="true" aria-label="${escapar(titulo)}">
      <div class="modal-cab">
        <div><h2>${titulo}</h2>${sub ? `<p>${sub}</p>` : ""}</div>
        <button class="boton fantasma icono" data-cerrar aria-label="Cerrar">${icono("cerrar")}</button>
      </div>
      <div class="modal-cuerpo">${cuerpo}</div>
      ${pie ? `<div class="modal-pie">${pie}</div>` : ""}
    </div>
  </div>`;
  const fondo = capa().firstElementChild;
  fondo.addEventListener("mousedown", (e) => {
    if (e.target === fondo) cerrarModal();
  });
  fondo.querySelectorAll("[data-cerrar]").forEach((b) => b.addEventListener("click", cerrarModal));
  setTimeout(() => fondo.querySelector("[autofocus]")?.focus(), 30);
  return fondo.querySelector(".modal");
}

export function cerrarModal() {
  capa().innerHTML = "";
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && capa().innerHTML) cerrarModal();
});

export function aviso(texto, tipo = "ok") {
  const el = document.createElement("div");
  el.className = "aviso " + (tipo === "error" ? "error" : "");
  el.innerHTML = `${icono(tipo === "error" ? "alerta" : "ok")}<span>${texto}</span>`;
  document.getElementById("avisos").append(el);
  setTimeout(() => el.remove(), 3200);
}

export function confirmar(titulo, texto, { boton = "Confirmar", peligro = false } = {}) {
  return new Promise((ok) => {
    const m = abrirModal({
      titulo,
      clase: "angosto",
      cuerpo: `<p style="margin:0;color:var(--texto-2)">${texto}</p>`,
      pie: `<button class="boton sec" data-cerrar>Cancelar</button><button class="boton ${peligro ? "peligro" : "primario"}" data-si autofocus>${boton}</button>`,
    });
    m.querySelector("[data-si]").addEventListener("click", () => {
      cerrarModal();
      ok(true);
    });
    m.querySelectorAll("[data-cerrar]").forEach((b) => b.addEventListener("click", () => ok(false)));
  });
}

// Lee un formulario y devuelve sus valores (los numéricos como número)
export function leerForm(form) {
  const datos = {};
  for (const el of form.elements) {
    if (!el.name) continue;
    if (el.type === "checkbox") datos[el.name] = el.checked;
    else if (el.type === "number" || el.dataset.numero !== undefined) datos[el.name] = el.value === "" ? null : Number(el.value);
    else datos[el.name] = el.value.trim();
  }
  return datos;
}

export function firmaLambda() {
  return `<a class="firma-lambda" href="https://www.instagram.com/lambdasoluciones" target="_blank" rel="noopener noreferrer" aria-label="Sistema realizado por Lambda Soluciones Digitales. Ver su Instagram">
    <div class="dentro">
      <div class="izq">
        <span class="lambda" aria-hidden="true">λ</span>
        <span><small>Diseño y desarrollo</small><strong>Lambda <em>Soluciones Digitales</em></strong></span>
      </div>
      <span class="insta">${icono("instagram", "chico")} @lambdasoluciones</span>
    </div>
  </a>`;
}

// Exporta hojas a Excel (.xlsx) con SheetJS
export function exportarExcel(nombre, hojas) {
  if (!window.XLSX) return aviso("No se pudo cargar el exportador. Revisá la conexión.", "error");
  const libro = XLSX.utils.book_new();
  for (const [titulo, filas] of Object.entries(hojas)) {
    const hoja = XLSX.utils.json_to_sheet(filas);
    const cols = Object.keys(filas[0] || {});
    hoja["!cols"] = cols.map((c) => ({ wch: Math.max(c.length, ...filas.slice(0, 200).map((f) => String(f[c] ?? "").length)) + 2 }));
    XLSX.utils.book_append_sheet(libro, hoja, titulo.slice(0, 31));
  }
  XLSX.writeFile(libro, nombre);
  aviso("Excel descargado");
}
