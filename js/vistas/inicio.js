// Inicio del dueño: cómo viene el día, alertas y lo último que pasó.
import { icono } from "../iconos.js";
import {
  db, pesos, numero, porcentaje, hora, escapar, inicioDia, DIA, metricas, porDia, porHora, alertas,
  diasParaVencer, turnoAbierto, resumenTurno, usuario, MEDIOS, fechaCorta,
} from "../estado.js";
import { graficoDias, graficoHoras, dona, mini } from "../graficos.js";

export function delta(actual, anterior) {
  if (!anterior) return "";
  const d = ((actual - anterior) / Math.abs(anterior)) * 100;
  return `<span class="delta ${d >= 0 ? "sube" : "baja"}">${d >= 0 ? "▲" : "▼"} ${Math.abs(d).toFixed(0)} %</span>`;
}

export function render(el) {
  const hoy = inicioDia();
  const ahora = Date.now();
  const mHoy = metricas(hoy, hoy + DIA);
  // promedio de los últimos 4 días iguales (mismo día de la semana), hasta la misma hora
  const previos = [1, 2, 3, 4].map((k) => metricas(hoy - 7 * k * DIA, ahora - 7 * k * DIA));
  const mAnt = {
    ingresos: previos.reduce((a, x) => a + x.ingresos, 0) / 4,
    ticketPromedio: previos.reduce((a, x) => a + x.ticketPromedio, 0) / 4,
  };
  const mMes = metricas(hoy - 29 * DIA, hoy + DIA);
  const dias = porDia(hoy - 30 * DIA, hoy); // días completos (hoy todavía está en curso)
  const ultimos7 = dias.slice(-7).map((d) => d.ingresos);
  const al = alertas();
  const t = turnoAbierto();
  const rt = t ? resumenTurno(t) : null;
  const ultimas = db.ventas.filter((v) => v.estado === "ok").slice(-6).reverse();

  el.innerHTML = `
  <div class="grilla g4">
    <div class="tarjeta kpi destacado">
      <div class="etiqueta">${icono("ventas")} Vendido hoy</div>
      <div class="valor">${pesos(mHoy.ingresos)}</div>
      <div class="pie">${delta(mHoy.ingresos, mAnt.ingresos)} vs. un ${new Date(hoy).toLocaleDateString("es-AR", { weekday: "long" })} normal a esta hora</div>
    </div>
    <div class="tarjeta kpi">
      <div class="etiqueta">${icono("metricas")} Ganancia bruta hoy</div>
      <div class="valor">${pesos(mHoy.bruta)}</div>
      <div class="pie">Margen ${porcentaje(mHoy.margenBruto)}</div>
    </div>
    <div class="tarjeta kpi">
      <div class="etiqueta">${icono("ventas")} Tickets hoy</div>
      <div class="valor">${numero(mHoy.cantidad)}</div>
      <div class="pie">Promedio ${pesos(mHoy.ticketPromedio)} ${delta(mHoy.ticketPromedio, mAnt.ticketPromedio)}</div>
    </div>
    <div class="tarjeta kpi">
      <div class="etiqueta">${icono("calendario")} Últimos 30 días</div>
      <div class="valor">${pesos(mMes.ingresos)}</div>
      <div class="pie" style="justify-content:space-between">Resultado ${pesos(mMes.neta)} ${mini(ultimos7)}</div>
    </div>
  </div>

  <div class="grilla g-2-1 mt">
    <div class="tarjeta">
      <div class="tarjeta-cab"><h3>Ventas de los últimos 30 días</h3>
        <div class="der leyenda"><span><span class="punto" style="background:#e3127a"></span>Ventas</span><span><span class="punto" style="background:#1c171b"></span>Ganancia bruta</span></div></div>
      <div class="tarjeta-cuerpo">${graficoDias(dias)}</div>
    </div>
    <div class="tarjeta">
      <div class="tarjeta-cab"><h3>Caja en este momento</h3><div class="der"><a class="boton sec chico" href="#/turnos">Ver turnos</a></div></div>
      <div class="tarjeta-cuerpo">
        ${
          t
            ? `<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
                <span class="avatar emp">${usuario(t.usuario).nombre.slice(0, 1)}</span>
                <div><b>${escapar(usuario(t.usuario).nombre)}</b><div class="ayuda" style="margin:0">Abrió a las ${hora(t.apertura)} con ${pesos(t.fondo)}</div></div>
                <span class="chip verde" style="margin-left:auto">Abierta</span></div>
              <div class="resultado">
                ${Object.entries(rt.porMedio).map(([k, v]) => `<div class="linea"><span style="display:flex;gap:8px;align-items:center">${icono(MEDIOS[k].icono, "chico")} ${MEDIOS[k].nombre}</span><span>${pesos(v)}</span></div>`).join("")}
                <div class="linea sub"><span>Efectivo que debería haber</span><span>${pesos(rt.esperado)}</span></div>
              </div>`
            : `<div class="vacio">${icono("candado")}<p>No hay ninguna caja abierta ahora.</p></div>`
        }
      </div>
    </div>
  </div>

  <div class="grilla g3 mt">
    <div class="tarjeta">
      <div class="tarjeta-cab"><h3>Reponer stock</h3><span class="chip ${al.stock.length ? "rojo" : "verde"}">${al.stock.length}</span>
        <div class="der"><a class="boton fantasma chico" href="#/productos?filtro=bajo">Ver todo ${icono("derecha", "chico")}</a></div></div>
      <div class="tarjeta-cuerpo" style="padding-top:6px"><ul class="lista">
        ${al.stock
          .slice(0, 5)
          .map(
            (p) => `<li><span class="icono-caja ${p.stock <= 0 ? "rojo" : "ambar"}">${icono("productos", "chico")}</span>
              <div class="texto"><b>${escapar(p.nombre)}</b><span>Quedan ${p.stock} · mínimo ${p.minimo}</span></div></li>`
          )
          .join("") || `<li><div class="texto"><span>Todo el stock está por encima del mínimo.</span></div></li>`}
      </ul></div>
    </div>
    <div class="tarjeta">
      <div class="tarjeta-cab"><h3>Próximos a vencer</h3><span class="chip ${al.vencen.length ? "ambar" : "verde"}">${al.vencen.length}</span>
        <div class="der"><a class="boton fantasma chico" href="#/productos?filtro=vence">Ver todo ${icono("derecha", "chico")}</a></div></div>
      <div class="tarjeta-cuerpo" style="padding-top:6px"><ul class="lista">
        ${al.vencen
          .slice(0, 5)
          .map((p) => {
            const d = diasParaVencer(p);
            return `<li><span class="icono-caja ${d <= 3 ? "rojo" : "ambar"}">${icono("calendario", "chico")}</span>
              <div class="texto"><b>${escapar(p.nombre)}</b><span>${d < 0 ? "Vencido" : d === 0 ? "Vence hoy" : `Vence en ${d} ${d === 1 ? "día" : "días"}`} · ${p.stock} u.</span></div></li>`;
          })
          .join("") || `<li><div class="texto"><span>Nada vence en los próximos 15 días.</span></div></li>`}
      </ul></div>
    </div>
    <div class="tarjeta">
      <div class="tarjeta-cab"><h3>Últimas ventas</h3><div class="der"><a class="boton fantasma chico" href="#/ventas">Ver todas ${icono("derecha", "chico")}</a></div></div>
      <div class="tarjeta-cuerpo" style="padding-top:6px"><ul class="lista">
        ${ultimas
          .map(
            (v) => `<li><span class="icono-caja rosa">${icono(MEDIOS[v.medio].icono, "chico")}</span>
              <div class="texto"><b>${escapar(v.items.map((i) => (i.c > 1 ? i.c + " " : "") + i.n).join(", "))}</b><span>${fechaCorta(v.fecha)} ${hora(v.fecha)} · ${escapar(usuario(v.usuario)?.nombre.split(" ")[0])}</span></div>
              <b class="num">${pesos(v.total)}</b></li>`
          )
          .join("")}
      </ul></div>
    </div>
  </div>

  <div class="grilla g2 mt siempre-1">
    <div class="tarjeta">
      <div class="tarjeta-cab"><h3>¿A qué hora se vende más?</h3><span class="nota">últimos 30 días</span></div>
      <div class="tarjeta-cuerpo">${graficoHoras(porHora(mMes.ventas))}</div>
    </div>
    <div class="tarjeta">
      <div class="tarjeta-cab"><h3>Cómo pagan los clientes</h3><span class="nota">últimos 30 días</span></div>
      <div class="tarjeta-cuerpo">${dona(
        Object.entries(mMes.porMedio).map(([k, v]) => ({ nombre: MEDIOS[k].nombre, valor: v, color: MEDIOS[k].color })),
        { centro: numero(mMes.cantidad), sub: "ventas" }
      )}</div>
    </div>
  </div>`;
}
