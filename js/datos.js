// Datos de ejemplo de La Morocha. Todo se genera en el navegador a partir de una
// semilla fija, así la demo siempre muestra el mismo negocio con fechas al día.

const DIA = 86_400_000;

function azarConSemilla(semilla) {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Código de barras EAN-13 válido (prefijo argentino 779)
function ean(n) {
  const base = ("779" + String(n).padStart(9, "0")).slice(0, 12);
  let suma = 0;
  for (let i = 0; i < 12; i++) suma += Number(base[i]) * (i % 2 ? 3 : 1);
  return base + ((10 - (suma % 10)) % 10);
}

export const CATEGORIAS = [
  { id: "bebidas", nombre: "Bebidas", color: "#2457c5" },
  { id: "cervezas", nombre: "Cervezas", color: "#e89a0c" },
  { id: "vinos", nombre: "Vinos", color: "#8f0a4c" },
  { id: "destilados", nombre: "Aperitivos y destilados", color: "#e3127a" },
  { id: "golosinas", nombre: "Golosinas", color: "#6c4bb5" },
  { id: "snacks", nombre: "Snacks", color: "#c2410c" },
  { id: "tabaco", nombre: "Cigarrillos y tabaco", color: "#5f575c" },
  { id: "vapeo", nombre: "Vapeo", color: "#0e7490" },
  { id: "helados", nombre: "Helados", color: "#0ea5e9" },
  { id: "almacen", nombre: "Almacén", color: "#12804a" },
  { id: "varios", nombre: "Hielo y varios", color: "#94a3b8" },
];

const PROVEEDORES = [
  ["coca", "Coca-Cola FEMSA", "Bebidas sin alcohol", "11 4567-2210"],
  ["quilmes", "Cervecería y Maltería Quilmes", "Cervezas", "11 4349-1800"],
  ["centro", "Distribuidora Del Centro", "Bebidas, aperitivos y almacén", "11 3021-5577"],
  ["golosinas", "Golosinera Norte Mayorista", "Golosinas y snacks", "11 2654-9031"],
  ["massalin", "Massalin Particulares", "Cigarrillos", "0800-888-1020"],
  ["vinos", "Vinos del Oeste", "Vinos y espumantes", "261 455-7812"],
  ["vape", "Vape Center Mayorista", "Vapeo", "11 6123-4470"],
  ["grido", "Grido Helados", "Helados", "351 420-1100"],
  ["hielo", "Hielo Cristal", "Hielo", "11 5899-0012"],
];

// [nombre, categoría, proveedor, costo, precio, stock, mínimo, vence en días, popularidad]
const PRODUCTOS = [
  ["Coca-Cola 2,25 L", "bebidas", "coca", 3200, 4500, 46, 24, 140, 10],
  ["Coca-Cola 500 ml", "bebidas", "coca", 1300, 1900, 58, 24, 150, 8],
  ["Coca-Cola Zero 1,5 L", "bebidas", "coca", 2400, 3400, 18, 12, 130, 4],
  ["Sprite 2,25 L", "bebidas", "coca", 2900, 4100, 22, 12, 140, 5],
  ["Fanta Naranja 2,25 L", "bebidas", "coca", 2900, 4100, 9, 12, 140, 3],
  ["Agua Villavicencio 1,5 L", "bebidas", "centro", 1000, 1600, 40, 18, 300, 5],
  ["Agua con gas Villa del Sur 2 L", "bebidas", "centro", 1100, 1700, 16, 10, 300, 2],
  ["Speed Unlimited 473 ml", "bebidas", "centro", 1500, 2400, 34, 18, 200, 6],
  ["Monster Energy 473 ml", "bebidas", "coca", 2100, 3200, 20, 12, 220, 4],
  ["Powerade Manzana 500 ml", "bebidas", "coca", 1200, 1900, 14, 10, 200, 2],
  ["Cepita Naranja 1 L", "bebidas", "coca", 1500, 2300, 11, 8, 60, 2],
  ["Quilmes Clásica lata 473 ml", "cervezas", "quilmes", 1250, 1900, 96, 48, 160, 12],
  ["Quilmes Clásica 1 L retornable", "cervezas", "quilmes", 1900, 2800, 30, 24, 160, 6],
  ["Brahma lata 473 ml", "cervezas", "quilmes", 1150, 1800, 62, 36, 160, 7],
  ["Stella Artois lata 473 ml", "cervezas", "quilmes", 1650, 2500, 44, 24, 160, 6],
  ["Corona 710 ml", "cervezas", "quilmes", 2600, 3800, 7, 12, 180, 4],
  ["Andes Origen Rubia lata 473 ml", "cervezas", "quilmes", 1500, 2300, 28, 18, 160, 3],
  ["Heineken lata 473 ml", "cervezas", "centro", 1700, 2600, 36, 24, 170, 5],
  ["Alma Mora Malbec 750 ml", "vinos", "vinos", 3800, 5900, 18, 8, null, 3],
  ["Santa Julia Malbec 750 ml", "vinos", "vinos", 4200, 6500, 12, 6, null, 2],
  ["Toro Tinto 1 L", "vinos", "centro", 1600, 2600, 24, 12, null, 3],
  ["Benjamín Nieto Senetiner 187 ml", "vinos", "vinos", 1500, 2400, 20, 10, null, 2],
  ["Michel Torino Frutos Rojos 750 ml", "vinos", "vinos", 3600, 5500, 10, 6, null, 2],
  ["Dadá N° 1 750 ml", "vinos", "vinos", 3500, 5400, 14, 6, null, 2],
  ["Fresita 750 ml", "vinos", "vinos", 3200, 4900, 5, 6, null, 2],
  ["Fernet Branca 750 ml", "destilados", "centro", 9800, 13900, 22, 12, null, 8],
  ["Fernet Branca 1 L", "destilados", "centro", 12900, 17900, 9, 8, null, 4],
  ["Gancia Americano 950 ml", "destilados", "centro", 4200, 6300, 15, 8, null, 3],
  ["Smirnoff Vodka 700 ml", "destilados", "centro", 6200, 9500, 8, 6, null, 2],
  ["Smirnoff Ice lata 473 ml", "destilados", "centro", 1700, 2700, 30, 18, 200, 4],
  ["Gin Spirito Blu 700 ml", "destilados", "centro", 13500, 19900, 6, 4, null, 2],
  ["Gordon's London Dry Gin 700 ml", "destilados", "centro", 9800, 14900, 7, 4, null, 1],
  ["Campari 750 ml", "destilados", "centro", 7600, 11500, 6, 4, null, 1],
  ["Alfajor Guaymallén triple", "golosinas", "golosinas", 450, 800, 70, 30, 90, 5],
  ["Alfajor Havanna chocolate", "golosinas", "golosinas", 1500, 2400, 24, 12, 60, 3],
  ["Alfajor Jorgito chocolate", "golosinas", "golosinas", 650, 1100, 48, 24, 90, 5],
  ["Chocolate Milka 55 g", "golosinas", "golosinas", 1400, 2200, 18, 10, 200, 3],
  ["Beldent Menta", "golosinas", "golosinas", 600, 1000, 40, 20, 300, 4],
  ["Mogul Frutales 80 g", "golosinas", "golosinas", 700, 1200, 26, 12, 300, 2],
  ["Bon o Bon", "golosinas", "golosinas", 280, 500, 90, 40, 120, 4],
  ["Oreo 118 g", "golosinas", "golosinas", 1100, 1800, 22, 12, 150, 3],
  ["Pepitos 118 g", "golosinas", "golosinas", 1100, 1700, 4, 10, 150, 2],
  ["Tita", "golosinas", "golosinas", 400, 700, 50, 24, 120, 3],
  ["Rhodesia", "golosinas", "golosinas", 450, 800, 44, 24, 120, 3],
  ["Papas Lay's Clásicas 85 g", "snacks", "golosinas", 1600, 2500, 26, 12, 120, 5],
  ["Doritos 77 g", "snacks", "golosinas", 1700, 2600, 20, 12, 120, 4],
  ["Palitos salados Pehuamar 100 g", "snacks", "golosinas", 1100, 1800, 18, 10, 120, 3],
  ["Maní salado Pehuamar 120 g", "snacks", "golosinas", 900, 1500, 3, 10, 180, 3],
  ["Chizitos 50 g", "snacks", "golosinas", 1000, 1600, 15, 10, 120, 2],
  ["Marlboro Box 20", "tabaco", "massalin", 3600, 4400, 64, 40, null, 11],
  ["Philip Morris Box 20", "tabaco", "massalin", 3300, 4000, 58, 40, null, 9],
  ["Lucky Strike Box 20", "tabaco", "centro", 3300, 4000, 32, 30, null, 5],
  ["Camel Box 20", "tabaco", "centro", 3200, 3900, 20, 20, null, 3],
  ["Chesterfield Box 20", "tabaco", "massalin", 2700, 3300, 44, 30, null, 6],
  ["Tabaco para armar Flandria 30 g", "tabaco", "centro", 3200, 4500, 10, 6, null, 2],
  ["Papel de armar Smoking", "tabaco", "centro", 600, 1100, 36, 12, null, 3],
  ["Encendedor Bic", "tabaco", "centro", 900, 1600, 28, 12, null, 4],
  ["Vaper descartable 5000 puffs Sandía", "vapeo", "vape", 9000, 15000, 8, 6, null, 2],
  ["Vaper descartable 5000 puffs Menta", "vapeo", "vape", 9000, 15000, 3, 6, null, 2],
  ["Vaper descartable 10000 puffs Uva", "vapeo", "vape", 13500, 22000, 6, 4, null, 1],
  ["Líquido para vaper 30 ml Tabaco", "vapeo", "vape", 4800, 7900, 9, 4, null, 1],
  ["Grido Helado 1 kg", "helados", "grido", 6500, 9500, 14, 8, 90, 3],
  ["Grido Torta Escocés", "helados", "grido", 5200, 7900, 6, 4, 75, 1],
  ["Grido Palito Frutilla al agua", "helados", "grido", 500, 900, 40, 20, 120, 3],
  ["Grido Bombón Crocante x 8", "helados", "grido", 3900, 5900, 8, 4, 12, 1],
  ["Yerba Kurupí Menta y Boldo 500 g", "almacen", "centro", 1900, 2900, 20, 10, 365, 3],
  ["Yerba Kurupí Tereré Mega Menta 500 g", "almacen", "centro", 1900, 2900, 16, 10, 365, 2],
  ["Yerba Playadito 1 kg", "almacen", "centro", 3600, 5200, 12, 8, 365, 2],
  ["Galletitas Don Satur 200 g", "almacen", "golosinas", 650, 1100, 30, 12, 90, 3],
  ["Leche La Serenísima 1 L", "almacen", "centro", 1150, 1700, 12, 10, 4, 3],
  ["Pan lactal Bimbo 550 g", "almacen", "centro", 2400, 3500, 5, 4, 3, 1],
  ["Azúcar Ledesma 1 kg", "almacen", "centro", 1100, 1600, 14, 6, 700, 1],
  ["Hielo en bolsa 2 kg", "varios", "hielo", 700, 1500, 26, 15, null, 6],
  ["Hielo rolito 4 kg", "varios", "hielo", 1100, 2500, 12, 8, null, 3],
  ["Vasos descartables x 10", "varios", "centro", 500, 900, 22, 10, null, 2],
  ["Carbón vegetal 3 kg", "varios", "centro", 2200, 3500, 9, 5, null, 1],
  ["Pilas Duracell AA x 2", "varios", "centro", 1900, 3200, 12, 6, null, 1],
  ["Licor Baileys 750 ml", "destilados", "centro", 18500, 26900, 4, 2, null, 0],
  ["Chandon Extra Brut 750 ml", "vinos", "vinos", 11000, 16500, 6, 2, null, 0],
  ["Pilas Duracell AAA x 2", "varios", "centro", 1900, 3200, 10, 4, null, 0],
  ["Cigarros Toscano x 5", "tabaco", "centro", 6500, 9800, 5, 2, null, 0],
];

export const USUARIOS = [
  { id: "u1", nombre: "Dueño", usuario: "admin", clave: "morocha", rol: "admin", turno: "Todo el día", activo: true },
  { id: "u2", nombre: "Sofía Gómez", usuario: "sofia", clave: "1234", rol: "empleado", turno: "Mañana · 9 a 17 h", activo: true },
  { id: "u3", nombre: "Martín Ríos", usuario: "martin", clave: "1234", rol: "empleado", turno: "Noche · 17 a 00 h", activo: true },
];

const CLIENTES = [
  ["c1", "Ramiro Gutiérrez", "11 3344-1290", 60000, "Vecino, edificio de al lado"],
  ["c2", "Carla Benítez", "11 6021-8875", 40000, ""],
  ["c3", "Julio Pereyra", "11 5520-4413", 80000, "Paga los viernes"],
  ["c4", "Taller Mecánico El Turco", "11 4789-3302", 150000, "Cuenta de la empresa"],
  ["c5", "Lucía Fernández", "11 2233-9087", 30000, ""],
  ["c6", "Agustín Albornoz", "11 6655-1020", 50000, ""],
];

const GASTOS_FIJOS = [
  ["Alquiler del local", 550000, 1],
  ["Sueldos empleados", 1500000, 5],
  ["Luz (heladeras y cartel)", 185000, 10],
  ["Internet y teléfono", 32000, 8],
  ["Monotributo e Ingresos Brutos", 95000, 20],
  ["Honorarios del contador", 60000, 10],
  ["Alarma y monitoreo", 28000, 12],
  ["Seguro del local", 35000, 15],
];

export const PROMOS = [
  { id: "p1", nombre: "Fernet + Coca", detalle: "Fernet Branca 750 ml + Coca-Cola 2,25 L", tipo: "combo", productos: ["pr26", "pr1"], precio: 17500, activa: true },
  { id: "p2", nombre: "4 Quilmes latas", detalle: "Quilmes Clásica lata 473 ml x 4", tipo: "pack", producto: "pr12", cantidad: 4, precio: 6800, activa: true },
  { id: "p3", nombre: "Gancia + Sprite", detalle: "Gancia Americano + Sprite 2,25 L", tipo: "combo", productos: ["pr28", "pr4"], precio: 9500, activa: true },
  { id: "p4", nombre: "Vinos en efectivo", detalle: "10% de descuento en vinos pagando en efectivo", tipo: "medio", medio: "efectivo", categoria: "vinos", porcentaje: 10, activa: true },
  { id: "p5", nombre: "2 Speed", detalle: "Speed Unlimited 473 ml x 2", tipo: "pack", producto: "pr8", cantidad: 2, precio: 4300, activa: false },
];

// Mismas reglas que la caja (estado.js), para que el historial traiga promos aplicadas
function aplicarPromos(items, medio, productos) {
  const precio = (id) => productos.find((p) => p.id === id).precio;
  const cant = new Map(items.map((i) => [i.p, i.c]));
  const res = [];
  for (const pr of PROMOS.filter((x) => x.activa)) {
    if (pr.tipo === "combo") {
      const veces = Math.min(...pr.productos.map((id) => cant.get(id) || 0));
      if (veces > 0) {
        res.push({ id: pr.id, nombre: pr.nombre + (veces > 1 ? ` x${veces}` : ""), monto: (pr.productos.reduce((a, id) => a + precio(id), 0) - pr.precio) * veces });
        pr.productos.forEach((id) => cant.set(id, cant.get(id) - veces));
      }
    } else if (pr.tipo === "pack") {
      const veces = Math.floor((cant.get(pr.producto) || 0) / pr.cantidad);
      if (veces > 0) res.push({ id: pr.id, nombre: pr.nombre + (veces > 1 ? ` x${veces}` : ""), monto: (precio(pr.producto) * pr.cantidad - pr.precio) * veces });
    } else if (pr.tipo === "medio" && medio === pr.medio) {
      const base = items.filter((i) => i.cat === pr.categoria).reduce((a, i) => a + i.c * i.pr, 0);
      if (base > 0) res.push({ id: pr.id, nombre: pr.nombre, monto: Math.round((base * pr.porcentaje) / 100) });
    }
  }
  return res;
}

function inicioDelDia(t) {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function generarBase() {
  const azar = azarConSemilla(271);
  const entre = (a, b) => a + Math.floor(azar() * (b - a + 1));
  const ahora = Date.now();
  const hoy = inicioDelDia(ahora);
  const DIAS = 95;

  const productos = PRODUCTOS.map((p, i) => ({
    id: "pr" + (i + 1),
    codigo: ean(100230 + i * 7919),
    nombre: p[0],
    categoria: p[1],
    proveedor: p[2],
    costo: p[3],
    precio: p[4],
    stock: p[5],
    minimo: p[6],
    vence: p[7] ? new Date(hoy + p[7] * DIA).toISOString().slice(0, 10) : null,
    pop: p[8],
    activo: true,
  }));
  // Algunos vencimientos cercanos para que se vean las alertas
  productos.find((p) => p.id === "pr70").vence = new Date(hoy + 2 * DIA).toISOString().slice(0, 10);
  productos.find((p) => p.id === "pr71").vence = new Date(hoy + 3 * DIA).toISOString().slice(0, 10);
  productos.find((p) => p.id === "pr65").vence = new Date(hoy + 9 * DIA).toISOString().slice(0, 10);
  productos.find((p) => p.id === "pr11").vence = new Date(hoy + 12 * DIA).toISOString().slice(0, 10);

  const bolsa = [];
  for (const p of productos) for (let k = 0; k < p.pop; k++) bolsa.push(p);
  const elegir = () => bolsa[Math.floor(azar() * bolsa.length)];

  const clientes = CLIENTES.map(([id, nombre, telefono, limite, nota]) => ({ id, nombre, telefono, limite, nota, movimientos: [] }));

  // Peso de cada hora de 9 a 23 (más movimiento a la noche)
  const PESO_HORA = [3, 4, 5, 6, 6, 4, 4, 5, 7, 9, 11, 13, 12, 10, 6];
  const totalPeso = PESO_HORA.reduce((a, b) => a + b, 0);
  const horaAzar = () => {
    let r = azar() * totalPeso;
    for (let i = 0; i < PESO_HORA.length; i++) {
      r -= PESO_HORA[i];
      if (r <= 0) return 9 + i;
    }
    return 22;
  };

  const ventas = [];
  const turnos = [];
  let numero = 1;

  for (let d = DIAS; d >= 0; d--) {
    const dia = hoy - d * DIA;
    const semana = new Date(dia).getDay();
    const base = [58, 52, 55, 60, 66, 92, 98][semana];
    // tendencia: las últimas semanas venden un poco más
    const cantidad = Math.round(base * (0.88 + (DIAS - d) / DIAS / 5) * (0.9 + azar() * 0.2));
    const horas = [];
    for (let i = 0; i < cantidad; i++) horas.push(dia + horaAzar() * 3600_000 + entre(0, 3599) * 1000);
    horas.sort((a, b) => a - b);

    const tManiana = { id: "t" + (turnos.length + 1), usuario: "u2", apertura: dia + 9 * 3600_000 - 300_000, fondo: 20000 };
    const tNoche = { id: "t" + (turnos.length + 2), usuario: "u3", apertura: dia + 17 * 3600_000 - 240_000, fondo: 25000 };
    turnos.push(tManiana, tNoche);

    for (const fecha of horas) {
      if (fecha > ahora) continue;
      const turno = new Date(fecha).getHours() < 17 ? tManiana : tNoche;
      const items = [];
      const n = azar() < 0.45 ? 1 : azar() < 0.7 ? 2 : azar() < 0.85 ? 3 : entre(4, 6);
      for (let k = 0; k < n; k++) {
        const p = elegir();
        const ya = items.find((x) => x.p === p.id);
        const cant = p.categoria === "cervezas" && azar() < 0.35 ? entre(2, 6) : 1;
        if (ya) ya.c += cant;
        else items.push({ p: p.id, n: p.nombre, c: cant, pr: p.precio, co: p.costo, cat: p.categoria });
      }
      // combos que se llevan juntos
      const lleva = (id) => items.find((x) => x.p === id);
      const sumar = (id) => {
        const p = productos.find((x) => x.id === id);
        if (!lleva(id)) items.push({ p: p.id, n: p.nombre, c: 1, pr: p.precio, co: p.costo, cat: p.categoria });
      };
      if (lleva("pr26") && azar() < 0.45) sumar("pr1");
      if (lleva("pr28") && azar() < 0.35) sumar("pr4");
      if (lleva("pr12") && azar() < 0.3) lleva("pr12").c = 4;
      const r = azar();
      let medio = r < 0.37 ? "efectivo" : r < 0.68 ? "qr" : r < 0.93 ? "transferencia" : "cuenta";
      const subtotal = items.reduce((a, x) => a + x.c * x.pr, 0);
      let cliente = null;
      if (medio === "cuenta") {
        cliente = clientes[Math.floor(azar() * clientes.length)];
        if (subtotal > 25000) medio = "efectivo", (cliente = null);
      }
      const promos = aplicarPromos(items, medio, productos);
      const descuento = promos.reduce((a, p) => a + p.monto, 0);
      const venta = {
        id: "v" + numero,
        numero: numero++,
        fecha,
        usuario: turno.usuario,
        turno: turno.id,
        items,
        promos,
        subtotal,
        descuento,
        total: subtotal - descuento,
        medio,
        cliente: cliente?.id || null,
        estado: "ok",
        ediciones: [],
      };
      ventas.push(venta);
      if (cliente) cliente.movimientos.push({ fecha, tipo: "compra", monto: venta.total, venta: venta.id, detalle: `Venta N° ${venta.numero}` });
    }

    // Cierre de los turnos (salvo el turno que está en curso hoy)
    for (const t of [tManiana, tNoche]) {
      const cierre = t === tManiana ? dia + 17 * 3600_000 + 120_000 : dia + 24 * 3600_000 - 60_000;
      if (cierre > ahora) {
        if (t.apertura > ahora) turnos.splice(turnos.indexOf(t), 1);
        continue;
      }
      const efectivo = ventas.filter((v) => v.turno === t.id && v.medio === "efectivo").reduce((a, v) => a + v.total, 0);
      const esperado = t.fondo + efectivo;
      const dif = azar() < 0.72 ? 0 : [-1500, -800, -500, 200, 500, 1000, -2200][entre(0, 6)];
      Object.assign(t, { cierre, esperado, contado: esperado + dif, diferencia: dif, estado: "cerrado" });
    }
  }
  // El turno en curso queda abierto
  for (const t of turnos) if (!t.estado) t.estado = "abierto";
  // Si es antes de las 9, que no quede ninguno abierto: lo abre el empleado en la demo
  const abiertos = turnos.filter((t) => t.estado === "abierto");
  if (abiertos.length > 1) abiertos.slice(0, -1).forEach((t) => (t.estado = "cerrado"));

  // Pagos de cuentas corrientes (cada tanto pagan parte de lo que deben)
  for (const c of clientes) {
    c.movimientos.sort((a, b) => a.fecha - b.fecha);
    let saldo = 0;
    const pagos = [];
    for (const m of c.movimientos) {
      saldo += m.monto;
      if (saldo > c.limite * 0.6 && azar() < 0.5) {
        const monto = Math.round((saldo * (0.5 + azar() * 0.5)) / 1000) * 1000;
        pagos.push({ fecha: m.fecha + entre(1, 3) * DIA, tipo: "pago", monto, medio: azar() < 0.5 ? "efectivo" : "transferencia", detalle: "Pago a cuenta" });
        saldo -= monto;
      }
    }
    c.movimientos.push(...pagos.filter((p) => p.fecha < ahora));
    c.movimientos.sort((a, b) => a.fecha - b.fecha);
  }

  // Algunas ventas editadas y una anulada, para mostrar el registro de cambios
  const editar = (v, detalle, horas = 1) => v && v.ediciones.push({ fecha: v.fecha + horas * 3600_000, usuario: "u1", detalle });
  const ultimas = ventas.slice(-400);
  editar(ultimas[40], "Cambió el medio de pago de Efectivo a Transferencia");
  editar(ultimas[120], "Corrigió la cantidad de Quilmes Clásica lata 473 ml (3 a 2)");
  const anulada = ultimas[200];
  if (anulada) {
    anulada.estado = "anulada";
    editar(anulada, "Anuló la venta: el cliente devolvió el producto");
  }

  // Gastos fijos de los meses y variables
  const gastos = [];
  let g = 1;
  const mesActual = new Date(hoy);
  for (let m = 4; m >= 0; m--) {
    const ref = new Date(mesActual.getFullYear(), mesActual.getMonth() - m, 1);
    for (const [desc, monto, diaMes] of GASTOS_FIJOS) {
      const fecha = new Date(ref.getFullYear(), ref.getMonth(), diaMes, 11).getTime();
      if (fecha > ahora || fecha < hoy - DIAS * DIA) continue;
      gastos.push({ id: "g" + g++, fecha, tipo: "fijo", categoria: "Fijos", descripcion: desc, monto, medio: desc.startsWith("Sueldos") ? "efectivo" : "transferencia" });
    }
  }
  const VARIABLES = [
    ["Bolsas y descartables", "Insumos", 18000, 7],
    ["Artículos de limpieza", "Insumos", 14500, 10],
    ["Flete de mercadería", "Logística", 22000, 9],
    ["Reparación heladera de bebidas", "Mantenimiento", 85000, 40],
    ["Cartuchos de ticketera", "Insumos", 9500, 18],
    ["Publicidad en Instagram", "Marketing", 25000, 14],
  ];
  for (const [desc, cat, monto, cada] of VARIABLES) {
    for (let d = DIAS - entre(0, cada); d >= 0; d -= cada) {
      gastos.push({ id: "g" + g++, fecha: hoy - d * DIA + entre(10, 19) * 3600_000, tipo: "variable", categoria: cat, descripcion: desc, monto: Math.round((monto * (0.85 + azar() * 0.3)) / 100) * 100, medio: azar() < 0.5 ? "efectivo" : "transferencia" });
    }
  }
  gastos.sort((a, b) => b.fecha - a.fecha);

  // Compras a proveedores
  const proveedores = PROVEEDORES.map(([id, nombre, rubro, telefono]) => ({ id, nombre, rubro, telefono }));
  const compras = [];
  const pagosProveedores = [];
  let c = 1;
  for (const prov of proveedores) {
    const suyos = productos.filter((p) => p.proveedor === prov.id);
    const cada = { coca: 7, quilmes: 7, centro: 10, golosinas: 10, massalin: 7, vinos: 20, vape: 25, grido: 14, hielo: 4 }[prov.id];
    for (let d = DIAS - entre(0, cada); d >= 0; d -= cada) {
      const items = suyos
        .filter(() => azar() < 0.7)
        .map((p) => ({ p: p.id, n: p.nombre, c: Math.max(4, Math.round(p.minimo * (0.8 + azar()))), co: p.costo }));
      if (!items.length) continue;
      const total = items.reduce((a, x) => a + x.c * x.co, 0);
      const fecha = hoy - d * DIA + 10 * 3600_000;
      const pagado = d > 8 || azar() < 0.4 ? total : Math.round((total * 0.5) / 1000) * 1000;
      compras.push({ id: "cp" + c++, fecha, proveedor: prov.id, items, total, factura: "A-0003-" + String(entre(10000, 99999)).padStart(8, "0") });
      if (pagado) pagosProveedores.push({ id: "pp" + c, fecha: fecha + 3600_000, proveedor: prov.id, monto: pagado, medio: azar() < 0.4 ? "efectivo" : "transferencia" });
    }
  }
  compras.sort((a, b) => b.fecha - a.fecha);

  // Mermas (roturas, vencidos, faltantes)
  const MERMAS = [
    ["pr26", 1, "Rotura", 3],
    ["pr70", 2, "Vencido", 6],
    ["pr62", 1, "Cortado de frío", 11],
    ["pr12", 3, "Lata abollada / pinchada", 15],
    ["pr50", 2, "Faltante en el conteo", 19],
    ["pr19", 1, "Rotura", 24],
    ["pr71", 3, "Vencido", 30],
    ["pr45", 4, "Paquete roto", 37],
  ];
  const mermas = MERMAS.map(([p, cant, motivo, d], i) => {
    const prod = productos.find((x) => x.id === p);
    return { id: "m" + (i + 1), fecha: hoy - d * DIA + 15 * 3600_000, producto: p, nombre: prod.nombre, cantidad: cant, motivo, costo: prod.costo * cant, usuario: i % 2 ? "u2" : "u3" };
  });

  return {
    version: 3,
    negocio: { nombre: "Drugstore La Morocha", direccion: "Av. Bolivia 27", horario: "Todos los días de 9 a 00 h", instagram: "@drugstore_lamorocha", cuit: "20-00000000-0" },
    categorias: CATEGORIAS,
    proveedores,
    productos,
    clientes,
    usuarios: USUARIOS.map((u) => ({ ...u })),
    ventas,
    turnos,
    gastos,
    compras,
    pagosProveedores,
    mermas,
    promos: PROMOS.map((p) => ({ ...p })),
    historialPrecios: [],
    proximoNumero: numero,
  };
}
