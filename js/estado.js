// Estado de la demo: vive en el navegador (localStorage). No hay base de datos.
import { generarBase } from "./datos.js";

const CLAVE = "la-morocha-demo";
const CLAVE_SESION = "la-morocha-sesion";
export const DIA = 86_400_000;

export let db = cargar();

function cargar() {
  try {
    const guardado = localStorage.getItem(CLAVE);
    if (guardado) {
      const datos = JSON.parse(guardado);
      if (datos.version === 3) return datos;
    }
  } catch {
    /* sin almacenamiento: arrancamos de cero */
  }
  return generarBase();
}

export function guardar() {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(db));
  } catch {
    /* modo privado o lleno: la demo sigue andando en memoria */
  }
}

export function reiniciarDemo() {
  db = generarBase();
  guardar();
}

// ---------- Sesión ----------
export function sesion() {
  try {
    const id = sessionStorage.getItem(CLAVE_SESION);
    return db.usuarios.find((u) => u.id === id) || null;
  } catch {
    return window.__sesion || null;
  }
}
export function iniciarSesion(usuario, clave) {
  const u = db.usuarios.find((x) => x.usuario.toLowerCase() === usuario.trim().toLowerCase() && x.clave === clave && x.activo);
  if (!u) return null;
  try {
    sessionStorage.setItem(CLAVE_SESION, u.id);
  } catch {
    window.__sesion = u;
  }
  return u;
}
export function cerrarSesion() {
  try {
    sessionStorage.removeItem(CLAVE_SESION);
  } catch {
    window.__sesion = null;
  }
}
export const esAdmin = () => sesion()?.rol === "admin";

// ---------- Formato ----------
const fmtPesos = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
const fmtNum = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });
export const pesos = (n) => fmtPesos.format(Math.round(n || 0)).replace(/ /g, " ");
export const numero = (n) => fmtNum.format(n || 0);
export const pesosCortos = (n) => {
  const a = Math.abs(n);
  if (a >= 1_000_000) return "$ " + (n / 1_000_000).toLocaleString("es-AR", { maximumFractionDigits: 1 }) + " M";
  if (a >= 1000) return "$ " + Math.round(n / 1000).toLocaleString("es-AR") + " mil";
  return pesos(n);
};
export const porcentaje = (n, dec = 1) => (n || 0).toLocaleString("es-AR", { maximumFractionDigits: dec, minimumFractionDigits: dec }) + " %";
export const fecha = (t) => new Date(t).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
export const fechaCorta = (t) => new Date(t).toLocaleDateString("es-AR", { day: "numeric", month: "short" }).replace(".", "");
export const hora = (t) => new Date(t).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
export const fechaHora = (t) => `${fecha(t)} ${hora(t)}`;
export const diaSemana = (t) => new Date(t).toLocaleDateString("es-AR", { weekday: "long" });
export const escapar = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
export const nuevoId = (prefijo) => prefijo + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
export function inicioDia(t = Date.now()) {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export const MEDIOS = {
  efectivo: { nombre: "Efectivo", icono: "efectivo", color: "#1c171b" },
  qr: { nombre: "QR / Posnet", icono: "qr", color: "#e3127a" },
  transferencia: { nombre: "Transferencia", icono: "transferencia", color: "#e89a0c" },
  cuenta: { nombre: "Cuenta corriente", icono: "cuenta", color: "#6c4bb5" },
};

// ---------- Búsquedas ----------
export const producto = (id) => db.productos.find((p) => p.id === id);
export const usuario = (id) => db.usuarios.find((u) => u.id === id);
export const cliente = (id) => db.clientes.find((c) => c.id === id);
export const proveedor = (id) => db.proveedores.find((p) => p.id === id);
export const categoria = (id) => db.categorias.find((c) => c.id === id);

export function saldoCliente(c) {
  return c.movimientos.reduce((a, m) => a + (m.tipo === "compra" ? m.monto : -m.monto), 0);
}
export function saldoProveedor(id) {
  const comprado = db.compras.filter((c) => c.proveedor === id).reduce((a, c) => a + c.total, 0);
  const pagado = db.pagosProveedores.filter((p) => p.proveedor === id).reduce((a, p) => a + p.monto, 0);
  return comprado - pagado;
}

const normalizar = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
export function buscarProductos(texto, limite = 30) {
  const t = normalizar(texto.trim());
  if (!t) return [];
  const palabras = t.split(/\s+/);
  return db.productos
    .filter((p) => p.activo && (p.codigo.includes(t) || palabras.every((w) => normalizar(p.nombre).includes(w))))
    .slice(0, limite);
}

export function estadoStock(p) {
  if (p.stock <= 0) return "sin";
  if (p.stock <= p.minimo) return "bajo";
  return "ok";
}
export function diasParaVencer(p) {
  if (!p.vence) return null;
  return Math.round((new Date(p.vence + "T00:00:00").getTime() - inicioDia()) / DIA);
}
export function alertas() {
  const stock = db.productos.filter((p) => p.activo && estadoStock(p) !== "ok").sort((a, b) => a.stock / a.minimo - b.stock / b.minimo);
  const vencen = db.productos
    .filter((p) => p.activo && diasParaVencer(p) !== null && diasParaVencer(p) <= 15)
    .sort((a, b) => diasParaVencer(a) - diasParaVencer(b));
  return { stock, vencen };
}

// ---------- Turnos de caja ----------
export function turnoAbierto(usuarioId) {
  return db.turnos.find((t) => t.estado === "abierto" && (!usuarioId || t.usuario === usuarioId)) || null;
}
export function resumenTurno(t) {
  const ventas = db.ventas.filter((v) => v.turno === t.id && v.estado === "ok");
  const porMedio = { efectivo: 0, qr: 0, transferencia: 0, cuenta: 0 };
  for (const v of ventas) porMedio[v.medio] += v.total;
  const gastosEfectivo = db.gastos.filter((g) => g.turno === t.id && g.medio === "efectivo").reduce((a, g) => a + g.monto, 0);
  return { ventas, cantidad: ventas.length, total: ventas.reduce((a, v) => a + v.total, 0), porMedio, gastosEfectivo, esperado: t.fondo + porMedio.efectivo - gastosEfectivo };
}

// ---------- Promociones ----------
export function calcularPromos(items, medio) {
  const aplicadas = [];
  const disponibles = new Map(items.map((i) => [i.p, i.c]));
  for (const pr of db.promos.filter((x) => x.activa)) {
    if (pr.tipo === "combo") {
      const veces = Math.min(...pr.productos.map((id) => disponibles.get(id) || 0));
      if (veces > 0) {
        const normal = pr.productos.reduce((a, id) => a + producto(id).precio, 0);
        const ahorro = (normal - pr.precio) * veces;
        if (ahorro > 0) {
          aplicadas.push({ id: pr.id, nombre: pr.nombre + (veces > 1 ? ` x${veces}` : ""), monto: ahorro });
          pr.productos.forEach((id) => disponibles.set(id, disponibles.get(id) - veces));
        }
      }
    } else if (pr.tipo === "pack") {
      const cant = disponibles.get(pr.producto) || 0;
      const veces = Math.floor(cant / pr.cantidad);
      if (veces > 0) {
        const ahorro = (producto(pr.producto).precio * pr.cantidad - pr.precio) * veces;
        if (ahorro > 0) {
          aplicadas.push({ id: pr.id, nombre: pr.nombre + (veces > 1 ? ` x${veces}` : ""), monto: ahorro });
          disponibles.set(pr.producto, cant - veces * pr.cantidad);
        }
      }
    } else if (pr.tipo === "medio" && medio === pr.medio) {
      const base = items.filter((i) => i.cat === pr.categoria).reduce((a, i) => a + i.c * i.pr, 0);
      if (base > 0) aplicadas.push({ id: pr.id, nombre: pr.nombre, monto: Math.round((base * pr.porcentaje) / 100) });
    }
  }
  return aplicadas;
}

// ---------- Ventas ----------
export function registrarVenta({ items, medio, clienteId, recibido }) {
  const u = sesion();
  const t = turnoAbierto(u.rol === "admin" ? null : u.id);
  const promos = calcularPromos(items, medio);
  const subtotal = items.reduce((a, i) => a + i.c * i.pr, 0);
  const descuento = promos.reduce((a, p) => a + p.monto, 0);
  const venta = {
    id: nuevoId("v"),
    numero: db.proximoNumero++,
    fecha: Date.now(),
    usuario: u.id,
    turno: t?.id || null,
    items: items.map((i) => ({ ...i })),
    promos,
    subtotal,
    descuento,
    total: subtotal - descuento,
    medio,
    cliente: medio === "cuenta" ? clienteId : null,
    recibido: medio === "efectivo" ? recibido || null : null,
    estado: "ok",
    ediciones: [],
  };
  db.ventas.push(venta);
  for (const i of items) {
    const p = producto(i.p);
    if (p) p.stock -= i.c;
  }
  if (venta.cliente) cliente(venta.cliente).movimientos.push({ fecha: venta.fecha, tipo: "compra", monto: venta.total, venta: venta.id, detalle: `Venta N° ${venta.numero}` });
  guardar();
  return venta;
}

export function anularVenta(v, motivo) {
  v.estado = "anulada";
  v.ediciones.push({ fecha: Date.now(), usuario: sesion().id, detalle: "Anuló la venta" + (motivo ? `: ${motivo}` : "") });
  for (const i of v.items) {
    const p = producto(i.p);
    if (p) p.stock += i.c;
  }
  if (v.cliente) {
    const c = cliente(v.cliente);
    c.movimientos = c.movimientos.filter((m) => m.venta !== v.id);
  }
  guardar();
}

// ---------- Métricas ----------
export function ventasEntre(desde, hasta) {
  return db.ventas.filter((v) => v.estado === "ok" && v.fecha >= desde && v.fecha < hasta);
}
export function costoVenta(v) {
  return v.items.reduce((a, i) => a + i.c * i.co, 0);
}
const GASTOS_FIJOS_MES = () => {
  // tomamos el último mes completo de gastos fijos como referencia mensual
  const vistos = new Map();
  for (const g of db.gastos.filter((x) => x.tipo === "fijo")) if (!vistos.has(g.descripcion)) vistos.set(g.descripcion, g.monto);
  return [...vistos.values()].reduce((a, b) => a + b, 0);
};
export function gastoFijoMensual() {
  return GASTOS_FIJOS_MES();
}

export function metricas(desde, hasta) {
  const ventas = ventasEntre(desde, hasta);
  const ingresos = ventas.reduce((a, v) => a + v.total, 0);
  const cmv = ventas.reduce((a, v) => a + costoVenta(v), 0);
  const descuentos = ventas.reduce((a, v) => a + (v.descuento || 0), 0);
  const dias = Math.max(1, Math.round((Math.min(hasta, Date.now() + DIA) - desde) / DIA));
  const fijos = (GASTOS_FIJOS_MES() / 30) * dias;
  const variables = db.gastos.filter((g) => g.tipo === "variable" && g.fecha >= desde && g.fecha < hasta).reduce((a, g) => a + g.monto, 0);
  const comisiones = ventas.filter((v) => v.medio === "qr").reduce((a, v) => a + v.total * 0.008, 0);
  const perdidas = db.mermas.filter((m) => m.fecha >= desde && m.fecha < hasta).reduce((a, m) => a + m.costo, 0);
  const bruta = ingresos - cmv;
  const neta = bruta - fijos - variables - comisiones - perdidas;
  const porMedio = { efectivo: 0, qr: 0, transferencia: 0, cuenta: 0 };
  for (const v of ventas) porMedio[v.medio] += v.total;
  return {
    ventas,
    cantidad: ventas.length,
    ingresos,
    cmv,
    descuentos,
    bruta,
    margenBruto: ingresos ? (bruta / ingresos) * 100 : 0,
    fijos,
    variables,
    comisiones,
    perdidas,
    neta,
    margenNeto: ingresos ? (neta / ingresos) * 100 : 0,
    ticketPromedio: ventas.length ? ingresos / ventas.length : 0,
    porMedio,
    dias,
  };
}

export function porCategoria(ventas) {
  const m = new Map();
  for (const v of ventas)
    for (const i of v.items) {
      const x = m.get(i.cat) || { ingresos: 0, costo: 0, unidades: 0 };
      x.ingresos += i.c * i.pr;
      x.costo += i.c * i.co;
      x.unidades += i.c;
      m.set(i.cat, x);
    }
  return [...m.entries()].map(([id, x]) => ({ id, ...x, cat: categoria(id) })).sort((a, b) => b.ingresos - a.ingresos);
}

export function topProductos(ventas, n = 10) {
  const m = new Map();
  for (const v of ventas)
    for (const i of v.items) {
      const x = m.get(i.p) || { id: i.p, nombre: i.n, cat: i.cat, unidades: 0, ingresos: 0, ganancia: 0 };
      x.unidades += i.c;
      x.ingresos += i.c * i.pr;
      x.ganancia += i.c * (i.pr - i.co);
      m.set(i.p, x);
    }
  return [...m.values()].sort((a, b) => b.ingresos - a.ingresos).slice(0, n);
}

export function porDia(desde, hasta) {
  const dias = [];
  for (let d = inicioDia(desde); d < hasta; d += DIA) {
    const vs = ventasEntre(d, d + DIA);
    const ingresos = vs.reduce((a, v) => a + v.total, 0);
    dias.push({ fecha: d, ingresos, ganancia: ingresos - vs.reduce((a, v) => a + costoVenta(v), 0), cantidad: vs.length });
  }
  return dias;
}

export function porHora(ventas) {
  const horas = Array.from({ length: 15 }, (_, i) => ({ hora: 9 + i, ingresos: 0, cantidad: 0 }));
  for (const v of ventas) {
    const h = new Date(v.fecha).getHours();
    const x = horas[h - 9];
    if (x) {
      x.ingresos += v.total;
      x.cantidad++;
    }
  }
  return horas;
}
