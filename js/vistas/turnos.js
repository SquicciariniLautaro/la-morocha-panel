// Turnos de caja: apertura con cambio inicial, cierre con arqueo y diferencias.
import { icono } from "../iconos.js";
import { db, guardar, pesos, numero, escapar, fecha, hora, usuario, turnoAbierto, resumenTurno, MEDIOS, inicioDia, DIA } from "../estado.js";
import { abrirModal, cerrarModal, aviso, exportarExcel } from "../ui.js";
import { abrirTurno } from "./caja.js";

export function render(el, ctx) {
  const { admin, usuario: u } = ctx;
  const repintar = () => ctx.repintar();
  const t = turnoAbierto(admin ? null : u.id);
  const rt = t ? resumenTurno(t) : null;

  const tarjetaAbierta = t
    ? `<div class="tarjeta">
        <div class="tarjeta-cab"><h3>Turno en curso</h3><span class="chip verde">Abierto</span>
          <div class="der"><button class="boton oscuro chico" id="cerrar-caja">${icono("candado", "chico")} Cerrar caja</button></div></div>
        <div class="tarjeta-cuerpo">
          <div class="grilla g4">
            <div><div class="ayuda" style="margin:0">Empleado</div><b>${escapar(usuario(t.usuario).nombre)}</b></div>
            <div><div class="ayuda" style="margin:0">Abrió</div><b class="num">${hora(t.apertura)}</b></div>
            <div><div class="ayuda" style="margin:0">Cambio inicial</div><b class="num">${pesos(t.fondo)}</b></div>
            <div><div class="ayuda" style="margin:0">Ventas</div><b class="num">${numero(rt.cantidad)} · ${pesos(rt.total)}</b></div>
          </div>
          ${admin ? `<div class="resultado mt">
            ${Object.entries(rt.porMedio).map(([k, v]) => `<div class="linea"><span style="display:flex;gap:8px;align-items:center">${icono(MEDIOS[k].icono, "chico")} ${MEDIOS[k].nombre}</span><span>${pesos(v)}</span></div>`).join("")}
            <div class="linea sub"><span>Efectivo que tiene que haber en la caja</span><span>${pesos(rt.esperado)}</span></div>
          </div>` : ""}
          ${admin ? "" : `<p class="ayuda">Al cerrar vas a contar el efectivo. El sistema compara lo que contaste con lo que vendiste.</p>`}
        </div>
      </div>`
    : `<div class="tarjeta caja-cerrada" style="padding:36px 20px"><div><div class="circulo">${icono("candado")}</div><h2>No hay caja abierta</h2><p>Abrí la caja para empezar el turno.</p><button class="boton primario" id="abrir">${icono("abierto")} Abrir caja</button></div></div>`;

  let historial = "";
  if (admin) {
    const cerrados = db.turnos.filter((x) => x.estado === "cerrado").sort((a, b) => b.apertura - a.apertura);
    const ult30 = cerrados.filter((x) => x.apertura > inicioDia() - 29 * DIA);
    const faltante = ult30.filter((x) => x.diferencia < 0).reduce((a, x) => a + x.diferencia, 0);
    const sobrante = ult30.filter((x) => x.diferencia > 0).reduce((a, x) => a + x.diferencia, 0);
    ctx.acciones.innerHTML = `<button class="boton sec" id="excel">${icono("bajar")}<span class="txt">Excel</span></button>`;
    ctx.acciones.querySelector("#excel").addEventListener("click", () =>
      exportarExcel("La Morocha - Turnos de caja.xlsx", {
        Turnos: cerrados.map((x) => ({ Fecha: fecha(x.apertura), Empleado: usuario(x.usuario)?.nombre, Apertura: hora(x.apertura), Cierre: hora(x.cierre), "Cambio inicial": x.fondo, "Efectivo esperado": x.esperado, "Efectivo contado": x.contado, Diferencia: x.diferencia })),
      })
    );
    historial = `
      <div class="grilla g3 mt">
        <div class="tarjeta kpi"><div class="etiqueta">${icono("turnos")} Turnos cerrados (30 días)</div><div class="valor">${ult30.length}</div><div class="pie">${ult30.filter((x) => x.diferencia === 0).length} cerraron justos</div></div>
        <div class="tarjeta kpi"><div class="etiqueta">${icono("alerta")} Faltantes</div><div class="valor" style="color:var(--rojo)">${pesos(-faltante)}</div><div class="pie">${ult30.filter((x) => x.diferencia < 0).length} turnos con faltante</div></div>
        <div class="tarjeta kpi"><div class="etiqueta">${icono("efectivo")} Sobrantes</div><div class="valor">${pesos(sobrante)}</div><div class="pie">${ult30.filter((x) => x.diferencia > 0).length} turnos con sobrante</div></div>
      </div>
      <div class="tarjeta mt"><div class="tarjeta-cab" style="padding-bottom:12px"><h3>Historial de cierres</h3></div><div class="tabla-caja"><table class="tabla"><thead><tr><th>Fecha</th><th>Empleado</th><th class="ocultar-movil">Horario</th><th class="der ocultar-movil">Cambio</th><th class="der ocultar-movil">Esperado</th><th class="der">Contado</th><th class="der">Diferencia</th></tr></thead><tbody>
        ${cerrados
          .slice(0, 60)
          .map(
            (x) => `<tr><td class="num">${fecha(x.apertura)}</td><td>${escapar(usuario(x.usuario)?.nombre)}</td><td class="ocultar-movil num">${hora(x.apertura)} a ${hora(x.cierre)}</td>
            <td class="der num ocultar-movil">${pesos(x.fondo)}</td><td class="der num ocultar-movil">${pesos(x.esperado)}</td><td class="der num">${pesos(x.contado)}</td>
            <td class="der"><span class="chip ${x.diferencia < 0 ? "rojo" : x.diferencia > 0 ? "ambar" : "verde"}">${x.diferencia === 0 ? "Justa" : (x.diferencia > 0 ? "+ " : "− ") + pesos(Math.abs(x.diferencia))}</span></td></tr>`
          )
          .join("")}
      </tbody></table></div></div>`;
  } else {
    const mios = db.turnos.filter((x) => x.usuario === u.id && x.estado === "cerrado").sort((a, b) => b.apertura - a.apertura).slice(0, 5);
    historial = `<div class="tarjeta mt"><div class="tarjeta-cab" style="padding-bottom:12px"><h3>Mis últimos cierres</h3></div><div class="tabla-caja"><table class="tabla"><thead><tr><th>Fecha</th><th>Horario</th><th class="der">Resultado</th></tr></thead><tbody>
      ${mios.map((x) => `<tr><td class="num">${fecha(x.apertura)}</td><td class="num">${hora(x.apertura)} a ${hora(x.cierre)}</td><td class="der"><span class="chip ${x.diferencia < 0 ? "rojo" : x.diferencia > 0 ? "ambar" : "verde"}">${x.diferencia === 0 ? "Caja justa" : (x.diferencia > 0 ? "Sobró " : "Faltó ") + pesos(Math.abs(x.diferencia))}</span></td></tr>`).join("") || `<tr><td colspan="3" class="vacio">Todavía no cerraste turnos.</td></tr>`}
    </tbody></table></div></div>`;
  }

  el.innerHTML = `
    ${admin ? "" : `<div class="saludo"><span class="avatar emp" style="width:46px;height:46px;font-size:17px;position:relative;z-index:1">${escapar(u.nombre[0])}</span><div style="position:relative;z-index:1"><h2>Hola, ${escapar(u.nombre.split(" ")[0])}</h2><p>${escapar(u.turno || "")} · ${new Date().toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}</p></div>${t ? `<a class="boton primario" href="#/caja">${icono("caja")} Ir a la caja</a>` : ""}</div>`}
    ${tarjetaAbierta}
    ${historial}`;

  el.querySelector("#abrir")?.addEventListener("click", () => abrirTurno(u, ctx));
  el.querySelector("#cerrar-caja")?.addEventListener("click", () => cerrarTurno(t, admin, repintar));
}

function cerrarTurno(t, admin, repintar) {
  const rt = resumenTurno(t);
  const m = abrirModal({
    titulo: "Cerrar caja",
    sub: `Turno de ${escapar(usuario(t.usuario).nombre)} · desde las ${hora(t.apertura)}`,
    clase: "angosto",
    cuerpo: `<form id="f-cierre">
      <div class="campo"><label>¿Cuánto efectivo hay en la caja?</label><input class="entrada num" name="contado" type="number" min="0" step="10" autofocus required style="font-size:22px;height:54px" placeholder="Contá billetes y monedas" /></div>
      ${admin ? `<p class="ayuda">Debería haber ${pesos(rt.esperado)} (cambio ${pesos(t.fondo)} + ventas en efectivo ${pesos(rt.porMedio.efectivo)}).</p>` : `<p class="ayuda">Por seguridad, el empleado no ve cuánto debería haber hasta que carga lo que contó.</p>`}
      <div id="dif"></div>
    </form>`,
    pie: `<button class="boton sec" data-cerrar>Cancelar</button><button class="boton oscuro" form="f-cierre">Cerrar caja</button>`,
  });
  const f = m.querySelector("form");
  if (admin)
    f.contado.addEventListener("input", () => {
      const d = Number(f.contado.value) - rt.esperado;
      m.querySelector("#dif").innerHTML = f.contado.value ? `<div class="vuelto ${d < 0 ? "falta" : ""}"><span>${d === 0 ? "Caja justa" : d > 0 ? "Sobran" : "Faltan"}</span><b>${pesos(Math.abs(d))}</b></div>` : "";
    });
  f.addEventListener("submit", (e) => {
    e.preventDefault();
    const contado = Number(f.contado.value);
    Object.assign(t, { cierre: Date.now(), esperado: rt.esperado, contado, diferencia: contado - rt.esperado, estado: "cerrado" });
    guardar();
    const d = t.diferencia;
    abrirModal({
      titulo: "Caja cerrada",
      sub: `${numero(rt.cantidad)} ventas · ${pesos(rt.total)}`,
      clase: "angosto",
      cuerpo: `<div class="resultado">
        ${Object.entries(rt.porMedio).map(([k, v]) => `<div class="linea"><span>${MEDIOS[k].nombre}</span><span>${pesos(v)}</span></div>`).join("")}
        <div class="linea sub"><span>Efectivo esperado</span><span>${pesos(rt.esperado)}</span></div>
        <div class="linea"><span>Efectivo contado</span><span>${pesos(contado)}</span></div></div>
        <div class="vuelto ${d < 0 ? "falta" : ""}"><span>${d === 0 ? "Caja justa" : d > 0 ? "Sobraron" : "Faltaron"}</span><b>${pesos(Math.abs(d))}</b></div>`,
      pie: `<button class="boton primario" data-cerrar id="listo">Listo</button>`,
    }).querySelector("#listo").addEventListener("click", repintar);
    aviso("Turno cerrado y registrado");
  });
}
