// Caja: punto de venta con lector de código de barras, búsqueda por nombre y cobro.
import { icono } from "../iconos.js";
import {
  db, guardar, sesion, pesos, numero, escapar, buscarProductos, producto, cliente, saldoCliente,
  calcularPromos, registrarVenta, turnoAbierto, MEDIOS, nuevoId, fechaHora, usuario, estadoStock,
} from "../estado.js";
import { abrirModal, cerrarModal, aviso, leerForm } from "../ui.js";

let carrito = [];
let medio = "efectivo";
let clienteCuenta = "";
let categoriaVista = "frecuentes";
let recienAgregado = null;

export function render(el, ctx) {
  const u = ctx.usuario;
  const turno = turnoAbierto(ctx.admin ? null : u.id);
  if (!turno) return pintarCerrada(el, ctx);

  el.innerHTML = `<div class="pos" id="pos">
    <section>
      <div class="tarjeta">
        <form class="pos-lector" id="form-lector" autocomplete="off">
          <div class="entrada-ico">
            ${icono("codigo")}
            <input class="entrada" id="lector" placeholder="Escaneá el código o escribí el nombre del producto" aria-label="Código de barras o nombre del producto" />
          </div>
          <button type="button" class="boton sec" id="camara" title="Escanear con la cámara del celular">${icono("camara")}<span class="txt">Cámara</span></button>
          <button type="button" class="boton sec" id="probar-lector" title="Simula una lectura de la pistola">${icono("codigo")}<span class="txt">Probar lector</span></button>
        </form>
        <div class="lector-estado"><i></i><span id="estado-lector">Lector listo · la pistola escribe el código y agrega el producto solo</span></div>
        <div class="resultados-busqueda oculto" id="resultados"></div>
      </div>
      <div class="mt">
        <div class="cats" id="cats"></div>
        <div class="mosaico" id="mosaico"></div>
      </div>
    </section>
    <aside class="tarjeta ticket" id="ticket"></aside>
  </div>
  <button class="barra-venta-movil oculto" id="barra-movil"></button>`;

  const lector = el.querySelector("#lector");
  const resultados = el.querySelector("#resultados");
  let marcado = 0;
  let encontrados = [];

  const pintarResultados = () => {
    const t = lector.value.trim();
    encontrados = /^\d{6,}$/.test(t) ? [] : buscarProductos(t, 8);
    if (!t || !encontrados.length) {
      resultados.classList.add("oculto");
      if (t && !/^\d+$/.test(t)) {
        resultados.classList.remove("oculto");
        resultados.innerHTML = `<div class="vacio" style="padding:18px">No hay productos con “${escapar(t)}”.</div>`;
      }
      return;
    }
    marcado = Math.min(marcado, encontrados.length - 1);
    resultados.classList.remove("oculto");
    resultados.innerHTML = encontrados
      .map(
        (p, i) => `<button type="button" class="res-item ${i === marcado ? "marcado" : ""}" data-id="${p.id}">
          <div class="texto"><b>${escapar(p.nombre)}</b><span>${p.codigo} · Stock ${p.stock}</span></div>
          <span class="precio">${pesos(p.precio)}</span></button>`
      )
      .join("");
  };
  lector.addEventListener("input", () => {
    marcado = 0;
    pintarResultados();
  });
  lector.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!encontrados.length) return;
      marcado = (marcado + (e.key === "ArrowDown" ? 1 : -1) + encontrados.length) % encontrados.length;
      pintarResultados();
    } else if (e.key === "Escape") {
      lector.value = "";
      pintarResultados();
    }
  });
  resultados.addEventListener("click", (e) => {
    const b = e.target.closest("[data-id]");
    if (!b) return;
    agregar(producto(b.dataset.id));
    lector.value = "";
    pintarResultados();
    lector.focus();
  });
  el.querySelector("#form-lector").addEventListener("submit", (e) => {
    e.preventDefault();
    const t = lector.value.trim();
    if (!t) return;
    const porCodigo = db.productos.find((p) => p.codigo === t && p.activo);
    if (porCodigo) agregar(porCodigo, true);
    else if (encontrados[marcado]) agregar(encontrados[marcado]);
    else if (/^\d+$/.test(t)) noEncontrado(t, ctx);
    else return;
    lector.value = "";
    pintarResultados();
  });

  el.querySelector("#probar-lector").addEventListener("click", async () => {
    const p = db.productos.filter((x) => x.activo && x.stock > 0)[Math.floor(Math.random() * 60)];
    lector.value = "";
    lector.focus();
    for (const d of p.codigo) {
      lector.value += d;
      await new Promise((r) => setTimeout(r, 22));
    }
    el.querySelector("#form-lector").requestSubmit();
  });
  el.querySelector("#camara").addEventListener("click", () => abrirCamara((codigo) => {
    lector.value = codigo;
    el.querySelector("#form-lector").requestSubmit();
  }));

  pintarCategorias(el);
  pintarTicket(el, ctx);
  lector.focus();

  // Atajos de teclado del mostrador
  const teclas = (e) => {
    if (!document.getElementById("pos")) return window.removeEventListener("keydown", teclas);
    if (document.querySelector(".fondo-modal")) return;
    if (e.key === "F2") {
      e.preventDefault();
      lector.focus();
    } else if (e.key === "F4") {
      e.preventDefault();
      if (carrito.length) cobrar(el, ctx);
    } else if (e.key === "F8") {
      e.preventDefault();
      carrito = [];
      pintarTicket(el, ctx);
    }
  };
  window.addEventListener("keydown", teclas);
}

function pintarCerrada(el, ctx) {
  const u = ctx.usuario;
  el.innerHTML = `<div class="tarjeta caja-cerrada">
    <div>
      <div class="circulo">${icono("candado")}</div>
      <h2>La caja está cerrada</h2>
      <p>Para empezar a vender, abrí tu turno contando el efectivo con el que arranca la caja (el cambio).</p>
      <button class="boton primario" id="abrir" style="height:48px;padding:0 26px">${icono("abierto")} Abrir caja</button>
    </div>
  </div>`;
  el.querySelector("#abrir").addEventListener("click", () => abrirTurno(u, ctx));
}

export function abrirTurno(u, ctx) {
  const m = abrirModal({
    titulo: "Abrir caja",
    sub: `Turno de ${escapar(u.nombre)} · ${fechaHora(Date.now())}`,
    clase: "angosto",
    cuerpo: `<form id="f-abrir"><div class="campo"><label>Efectivo inicial (cambio)</label>
      <input class="entrada num" name="fondo" type="number" min="0" step="100" value="20000" autofocus style="font-size:20px;height:50px" /></div>
      <p class="ayuda">Este monto se usa al cerrar para saber si la caja da justa, sobra o falta plata.</p></form>`,
    pie: `<button class="boton sec" data-cerrar>Cancelar</button><button class="boton primario" form="f-abrir">Abrir caja</button>`,
  });
  m.querySelector("form").addEventListener("submit", (e) => {
    e.preventDefault();
    const { fondo } = leerForm(e.target);
    db.turnos.push({ id: nuevoId("t"), usuario: u.id, apertura: Date.now(), fondo: fondo || 0, estado: "abierto" });
    guardar();
    cerrarModal();
    aviso("Caja abierta. ¡Buenas ventas!");
    ctx.repintar();
  });
}

function pintarCategorias(el) {
  const cats = [{ id: "frecuentes", nombre: "Más vendidos" }, ...db.categorias];
  el.querySelector("#cats").innerHTML = cats
    .map((c) => `<button class="${c.id === categoriaVista ? "activo" : ""}" data-cat="${c.id}">${escapar(c.nombre)}</button>`)
    .join("");
  el.querySelector("#cats").onclick = (e) => {
    const b = e.target.closest("[data-cat]");
    if (!b) return;
    categoriaVista = b.dataset.cat;
    pintarCategorias(el);
  };
  const lista =
    categoriaVista === "frecuentes"
      ? [...db.productos].filter((p) => p.activo).sort((a, b) => b.pop - a.pop).slice(0, 16)
      : db.productos.filter((p) => p.activo && p.categoria === categoriaVista);
  const mosaico = el.querySelector("#mosaico");
  mosaico.innerHTML = lista
    .map((p) => {
      const est = estadoStock(p);
      return `<button class="prod-boton" data-id="${p.id}">
        <span class="nombre">${escapar(p.nombre)}</span>
        <span class="abajo"><span class="precio">${pesos(p.precio)}</span><span class="stock ${est !== "ok" ? "bajo" : ""}">${est === "sin" ? "Sin stock" : p.stock + " u."}</span></span>
      </button>`;
    })
    .join("");
  mosaico.onclick = (e) => {
    const b = e.target.closest("[data-id]");
    if (b) agregar(producto(b.dataset.id));
  };
}

function agregar(p, porLector = false) {
  if (!p) return;
  const ya = carrito.find((i) => i.p === p.id);
  recienAgregado = p.id;
  if (ya) ya.c++;
  else carrito.push({ p: p.id, n: p.nombre, c: 1, pr: p.precio, co: p.costo, cat: p.categoria });
  const estado = document.getElementById("estado-lector");
  if (estado) estado.textContent = `${porLector ? "Leído" : "Agregado"}: ${p.nombre} · ${pesos(p.precio)}`;
  if (p.stock - (ya?.c || 1) < 0) aviso(`Ojo: ${p.nombre} figura sin stock`, "error");
  pitido();
  pintarTicket(document.getElementById("vista"));
}

function pitido() {
  try {
    const ac = (pitido.ac ??= new AudioContext());
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.frequency.value = 1760;
    g.gain.value = 0.05;
    o.connect(g).connect(ac.destination);
    o.start();
    o.stop(ac.currentTime + 0.07);
  } catch {
    /* sin sonido */
  }
}

function noEncontrado(codigo, ctx) {
  const admin = sesion()?.rol === "admin";
  const m = abrirModal({
    titulo: "Código no encontrado",
    clase: "angosto",
    cuerpo: `<p style="margin:0 0 6px">No hay ningún producto con el código <b class="num">${escapar(codigo)}</b>.</p>
      <p class="ayuda" style="font-size:13.5px">${admin ? "Podés cargarlo ahora mismo o buscarlo por nombre." : "Buscalo por nombre o avisale al encargado para que lo cargue."}</p>`,
    pie: `<button class="boton sec" data-cerrar>Buscar por nombre</button>${admin ? `<button class="boton primario" id="cargar">Cargar producto</button>` : ""}`,
  });
  m.querySelector("#cargar")?.addEventListener("click", async () => {
    const { editarProducto } = await import("./productos.js");
    editarProducto(null, () => ctx?.repintar?.(), { codigo });
  });
  m.querySelectorAll("[data-cerrar]").forEach((b) => b.addEventListener("click", () => setTimeout(() => document.getElementById("lector")?.focus(), 50)));
}

function totales() {
  const subtotal = carrito.reduce((a, i) => a + i.c * i.pr, 0);
  const promos = calcularPromos(carrito, medio);
  const descuento = promos.reduce((a, p) => a + p.monto, 0);
  return { subtotal, promos, descuento, total: subtotal - descuento, unidades: carrito.reduce((a, i) => a + i.c, 0) };
}

function pintarTicket(el, ctx) {
  const ticket = el?.querySelector("#ticket");
  if (!ticket) return;
  ctx ??= pintarTicket.ctx;
  pintarTicket.ctx = ctx;
  const t = totales();
  const items = carrito.length
    ? carrito
        .map(
          (i, k) => `<div class="t-item ${i.p === recienAgregado ? "nuevo" : ""}">
        <div><div class="nombre">${escapar(i.n)}</div><div class="unit">${pesos(i.pr)} c/u</div></div>
        <div class="importe">${pesos(i.c * i.pr)}</div>
        <div class="ctrl">
          <button class="boton sec icono chico" data-menos="${k}" aria-label="Uno menos">${icono("menos", "chico")}</button>
          <span class="cant">${i.c}</span>
          <button class="boton sec icono chico" data-mas="${k}" aria-label="Uno más">${icono("mas", "chico")}</button>
        </div>
        <button class="boton fantasma icono chico quitar" data-quitar="${k}" aria-label="Quitar">${icono("basura", "chico")}</button>
      </div>`
        )
        .join("")
    : `<div class="ticket-vacio"><div>${icono("codigo")}<div>Escaneá un producto para empezar la venta</div></div></div>`;
  const clientesOpc = db.clientes
    .map((c) => {
      const s = saldoCliente(c);
      return `<option value="${c.id}" ${c.id === clienteCuenta ? "selected" : ""}>${escapar(c.nombre)} · debe ${pesos(s)}</option>`;
    })
    .join("");
  ticket.innerHTML = `
    <div class="ticket-cab"><h3>Venta actual</h3><span class="chip" style="margin-left:8px">${t.unidades} ${t.unidades === 1 ? "unidad" : "unidades"}</span>
      <div class="der">${carrito.length ? `<button class="boton fantasma chico" id="vaciar">Vaciar</button>` : ""}</div></div>
    <div class="ticket-items">${items}</div>
    <div class="ticket-pie">
      <div class="linea"><span>Subtotal</span><span class="num">${pesos(t.subtotal)}</span></div>
      ${t.promos.map((p) => `<div class="linea promo"><span>${icono("promos", "chico")} ${escapar(p.nombre)}</span><span class="num">− ${pesos(p.monto)}</span></div>`).join("")}
      <div class="total"><span>Total</span><b>${pesos(t.total)}</b></div>
      <div class="medios" role="radiogroup" aria-label="Medio de pago">
        ${Object.entries(MEDIOS)
          .map(([k, m]) => `<button class="medio ${k === medio ? "activo" : ""}" data-medio="${k}" role="radio" aria-checked="${k === medio}">${icono(m.icono)}${k === "cuenta" ? "Cta. cte." : k === "qr" ? "QR / Posnet" : m.nombre}</button>`)
          .join("")}
      </div>
      ${medio === "cuenta" ? `<div class="campo" style="margin-bottom:12px"><select class="entrada" id="cliente-cuenta"><option value="">Elegí el cliente…</option>${clientesOpc}</select></div>` : ""}
      <button class="boton primario cobrar" id="cobrar" ${carrito.length ? "" : "disabled"}>Cobrar ${pesos(t.total)}</button>
      <div class="atajos"><span><kbd>F2</kbd> buscar</span><span><kbd>F4</kbd> cobrar</span><span><kbd>F8</kbd> cancelar</span></div>
    </div>`;

  recienAgregado = null;
  const barra = el.querySelector("#barra-movil");
  if (barra) {
    barra.classList.toggle("oculto", !carrito.length);
    barra.innerHTML = `<span>${t.unidades} ${t.unidades === 1 ? "unidad" : "unidades"}</span><b>${pesos(t.total)}</b><span class="ir">Ver venta ${icono("derecha", "chico")}</span>`;
    barra.onclick = () => ticket.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  ticket.onclick = (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.mas) carrito[b.dataset.mas].c++;
    else if (b.dataset.menos) {
      const i = carrito[b.dataset.menos];
      if (--i.c <= 0) carrito.splice(b.dataset.menos, 1);
    } else if (b.dataset.quitar) carrito.splice(b.dataset.quitar, 1);
    else if (b.dataset.medio) medio = b.dataset.medio;
    else if (b.id === "vaciar") carrito = [];
    else if (b.id === "cobrar") return cobrar(el, ctx);
    else return;
    pintarTicket(el, ctx);
  };
  ticket.querySelector("#cliente-cuenta")?.addEventListener("change", (e) => (clienteCuenta = e.target.value));
}

function cobrar(el, ctx) {
  const t = totales();
  if (medio === "cuenta") {
    if (!clienteCuenta) return aviso("Elegí a qué cliente se le anota la venta", "error");
    const c = cliente(clienteCuenta);
    const nuevo = saldoCliente(c) + t.total;
    if (nuevo > c.limite) aviso(`${c.nombre} supera su límite de ${pesos(c.limite)}`, "error");
  }
  const m = MEDIOS[medio];
  let cuerpo = "";
  if (medio === "efectivo") {
    const sugeridos = [...new Set([t.total, Math.ceil(t.total / 1000) * 1000, Math.ceil(t.total / 5000) * 5000, Math.ceil(t.total / 10000) * 10000, Math.ceil(t.total / 20000) * 20000])].slice(0, 5);
    cuerpo = `<div class="campo"><label>¿Con cuánto paga?</label>
      <input class="entrada num" id="recibido" type="number" min="0" step="100" value="${sugeridos[1] || t.total}" autofocus style="font-size:22px;height:54px" /></div>
      <div class="billetes">${sugeridos.map((s) => `<button type="button" data-b="${s}">${pesos(s)}</button>`).join("")}</div>
      <div class="vuelto" id="vuelto"></div>`;
  } else if (medio === "qr") {
    cuerpo = `<div style="text-align:center">${qrFalso()}<p style="margin:0;font-weight:600">Cobrá ${pesos(t.total)} con el QR o el posnet</p>
      <p class="ayuda">Cuando el cliente confirme el pago en su celular o pase la tarjeta, tocá “Cobro aprobado”.</p></div>`;
  } else if (medio === "transferencia") {
    cuerpo = `<div class="lista"><li><div class="texto"><span>Alias</span><b>LAMOROCHA.DRUGSTORE</b></div></li>
      <li><div class="texto"><span>CVU</span><b class="num">0000003100012345678901</b></div></li>
      <li><div class="texto"><span>Titular</span><b>Drugstore La Morocha</b></div></li></div>
      <p class="ayuda" style="font-size:13px">Confirmá solo cuando veas la transferencia acreditada en la cuenta.</p>`;
  } else {
    const c = cliente(clienteCuenta);
    const antes = saldoCliente(c);
    cuerpo = `<div class="resultado">
      <div class="linea"><span>Cliente</span><span>${escapar(c.nombre)}</span></div>
      <div class="linea"><span>Debía</span><span>${pesos(antes)}</span></div>
      <div class="linea"><span>Esta compra</span><span>${pesos(t.total)}</span></div>
      <div class="linea sub"><span>Queda debiendo</span><span>${pesos(antes + t.total)}</span></div>
      <div class="linea"><span>Límite de la cuenta</span><span>${pesos(c.limite)}</span></div></div>`;
  }
  const modal = abrirModal({
    titulo: `Cobrar ${pesos(t.total)}`,
    sub: `${m.nombre} · ${t.unidades} ${t.unidades === 1 ? "unidad" : "unidades"}${t.descuento ? ` · ahorro en promos ${pesos(t.descuento)}` : ""}`,
    clase: "angosto",
    cuerpo,
    pie: `<button class="boton sec" data-cerrar>Volver</button><button class="boton primario" id="confirmar" ${medio !== "efectivo" ? "autofocus" : ""}>${medio === "qr" ? "Cobro aprobado" : medio === "transferencia" ? "Transferencia recibida" : medio === "cuenta" ? "Anotar en la cuenta" : "Confirmar venta"}</button>`,
  });
  const recibido = modal.querySelector("#recibido");
  const actualizarVuelto = () => {
    const v = Number(recibido.value) - t.total;
    const caja = modal.querySelector("#vuelto");
    caja.className = "vuelto" + (v < 0 ? " falta" : "");
    caja.innerHTML = v < 0 ? `<span>Faltan</span><b>${pesos(-v)}</b>` : `<span>Vuelto</span><b>${pesos(v)}</b>`;
  };
  if (recibido) {
    recibido.addEventListener("input", actualizarVuelto);
    recibido.addEventListener("keydown", (e) => e.key === "Enter" && modal.querySelector("#confirmar").click());
    modal.querySelectorAll("[data-b]").forEach((b) =>
      b.addEventListener("click", () => {
        recibido.value = b.dataset.b;
        actualizarVuelto();
      })
    );
    actualizarVuelto();
    setTimeout(() => recibido.select(), 40);
  }
  modal.querySelector("#confirmar").addEventListener("click", () => {
    if (recibido && Number(recibido.value) < t.total) return aviso("El monto recibido no alcanza", "error");
    const venta = registrarVenta({ items: carrito, medio, clienteId: clienteCuenta, recibido: recibido ? Number(recibido.value) : null });
    carrito = [];
    clienteCuenta = "";
    medio = "efectivo";
    ventaHecha(venta, el, ctx);
  });
}

function ventaHecha(venta, el, ctx) {
  const vuelto = venta.recibido ? venta.recibido - venta.total : 0;
  const m = abrirModal({
    titulo: "Venta registrada",
    sub: `N° ${numero(venta.numero)} · ${MEDIOS[venta.medio].nombre}${vuelto > 0 ? ` · vuelto ${pesos(vuelto)}` : ""}`,
    clase: "angosto",
    cuerpo: ticketHTML(venta),
    pie: `<button class="boton sec" id="imprimir">${icono("imprimir")} Imprimir ticket</button><button class="boton primario" data-cerrar autofocus>Nueva venta</button>`,
  });
  m.querySelector("#imprimir").addEventListener("click", () => window.print());
  m.querySelectorAll("[data-cerrar]").forEach((b) =>
    b.addEventListener("click", () => {
      pintarTicket(el, ctx);
      pintarCategorias(el);
      setTimeout(() => document.getElementById("lector")?.focus(), 50);
    })
  );
  pintarTicket(el, ctx);
}

export function ticketHTML(v) {
  const n = db.negocio;
  return `<div class="papel">
    <div class="c"><img src="img/logo.jpg" alt="" /><b>${escapar(n.nombre.toUpperCase())}</b><br>${escapar(n.direccion)}<br>${escapar(n.instagram)}</div>
    <hr><div class="f"><span>Ticket N° ${String(v.numero).padStart(6, "0")}</span></div><div>Fecha: ${fechaHora(v.fecha)}</div>
    <div>Atendió: ${escapar(usuario(v.usuario)?.nombre || "")}</div><hr>
    ${v.items.map((i) => `<div>${escapar(i.n)}</div><div class="f"><span>${i.c} x ${pesos(i.pr)}</span><span>${pesos(i.c * i.pr)}</span></div>`).join("")}
    <hr>
    ${(v.promos || []).map((p) => `<div class="f"><span>Promo ${escapar(p.nombre)}</span><span>-${pesos(p.monto)}</span></div>`).join("")}
    <div class="f g"><span>TOTAL</span><span>${pesos(v.total)}</span></div>
    <div class="f"><span>Pago</span><span>${MEDIOS[v.medio].nombre}</span></div>
    ${v.recibido ? `<div class="f"><span>Recibido</span><span>${pesos(v.recibido)}</span></div><div class="f"><span>Vuelto</span><span>${pesos(v.recibido - v.total)}</span></div>` : ""}
    ${v.cliente ? `<div>Cuenta: ${escapar(cliente(v.cliente)?.nombre || "")}</div>` : ""}
    <hr><div class="c">¡Gracias por tu compra!<br>Comprobante no válido como factura</div>
  </div>`;
}

function qrFalso() {
  const azar = (i) => ((i * 9301 + 49297) % 233280) / 233280;
  let celdas = "";
  const N = 25;
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const esquina = (a, b) => x >= a && x < a + 7 && y >= b && y < b + 7;
      const marco = (a, b) => esquina(a, b) && (x === a || x === a + 6 || y === b || y === b + 6 || (x > a + 1 && x < a + 5 && y > b + 1 && y < b + 5));
      const enEsquina = esquina(0, 0) || esquina(N - 7, 0) || esquina(0, N - 7);
      const lleno = enEsquina ? marco(0, 0) || marco(N - 7, 0) || marco(0, N - 7) : azar(x * 31 + y * 17 + x * y) > 0.52;
      if (lleno) celdas += `<rect x="${x}" y="${y}" width="1" height="1"/>`;
    }
  return `<svg class="qr-falso" viewBox="0 0 ${N} ${N}" shape-rendering="crispEdges" aria-label="Código QR de cobro">${celdas}</svg>`;
}

// Cámara del celular como lector (BarcodeDetector o ZXing si el navegador no lo trae)
async function abrirCamara(alLeer) {
  const m = abrirModal({
    titulo: "Escanear con la cámara",
    sub: "Apuntá al código de barras del producto",
    clase: "angosto",
    cuerpo: `<div class="camara"><video playsinline muted></video><div class="mira"></div></div><p class="ayuda" id="cam-estado">Pidiendo permiso para usar la cámara…</p>`,
    pie: `<button class="boton sec" data-cerrar>Cerrar</button>`,
  });
  const video = m.querySelector("video");
  const estado = m.querySelector("#cam-estado");
  let stream;
  const parar = () => stream?.getTracks().forEach((t) => t.stop());
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
  } catch {
    estado.textContent = "No se pudo usar la cámara. En la PC del local se usa la pistola lectora; en el celular, permití el acceso a la cámara.";
    return;
  }
  video.srcObject = stream;
  await video.play();
  estado.textContent = "Buscando código…";
  const listo = (codigo) => {
    parar();
    cerrarModal();
    alLeer(codigo);
  };
  if ("BarcodeDetector" in window) {
    const detector = new BarcodeDetector({ formats: ["ean_13", "ean_8", "upc_a", "code_128"] });
    const buscar = async () => {
      if (!video.isConnected) return parar();
      try {
        const [c] = await detector.detect(video);
        if (c) return listo(c.rawValue);
      } catch {
        /* cuadro sin código */
      }
      setTimeout(buscar, 180);
    };
    buscar();
  } else {
    try {
      const { BrowserMultiFormatReader } = await import("https://cdn.jsdelivr.net/npm/@zxing/browser@0.1.5/+esm");
      const lector = new BrowserMultiFormatReader();
      const ctrl = await lector.decodeFromVideoElement(video, (r) => {
        if (r) {
          ctrl.stop();
          listo(r.getText());
        }
      });
      const vigilar = setInterval(() => {
        if (!video.isConnected) {
          ctrl.stop();
          parar();
          clearInterval(vigilar);
        }
      }, 400);
    } catch {
      estado.textContent = "Este navegador no puede leer códigos con la cámara.";
    }
  }
}
