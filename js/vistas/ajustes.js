// Ajustes: datos del negocio, lector de códigos, ticketera, celular y la demo.
import { icono } from "../iconos.js";
import { db, guardar, escapar, reiniciarDemo } from "../estado.js";
import { aviso, confirmar, leerForm } from "../ui.js";

export function render(el, ctx) {
  const n = db.negocio;
  el.innerHTML = `
    <div class="grilla g2 siempre-1">
      <div class="tarjeta"><div class="tarjeta-cab"><h3>Datos del negocio</h3><span class="nota">salen en el ticket</span></div>
        <form class="tarjeta-cuerpo form-grilla" id="f-negocio">
          <div class="campo ancho"><label>Nombre</label><input class="entrada" name="nombre" value="${escapar(n.nombre)}" /></div>
          <div class="campo"><label>Dirección</label><input class="entrada" name="direccion" value="${escapar(n.direccion)}" /></div>
          <div class="campo"><label>Instagram</label><input class="entrada" name="instagram" value="${escapar(n.instagram)}" /></div>
          <div class="campo"><label>Horario</label><input class="entrada" name="horario" value="${escapar(n.horario)}" /></div>
          <div class="campo"><label>CUIT</label><input class="entrada" name="cuit" value="${escapar(n.cuit)}" /></div>
          <div class="ancho"><button class="boton primario">Guardar datos</button></div>
        </form></div>

      <div class="tarjeta"><div class="tarjeta-cab"><h3>Lector de código de barras</h3></div><div class="tarjeta-cuerpo">
        <ul class="lista">
          <li><span class="icono-caja rosa">${icono("codigo", "chico")}</span><div class="texto"><b>Pistola USB o inalámbrica</b><span>Se enchufa y funciona: escribe el código en la caja y agrega el producto solo. No hace falta instalar nada.</span></div></li>
          <li><span class="icono-caja rosa">${icono("camara", "chico")}</span><div class="texto"><b>Cámara del celular</b><span>Desde el celular, el botón “Cámara” de la caja lee el código con la cámara trasera.</span></div></li>
          <li><span class="icono-caja rosa">${icono("buscar", "chico")}</span><div class="texto"><b>Si el código no se lee</b><span>Se escribe el nombre del producto y se elige de la lista. Si no existe, el dueño lo carga en el momento.</span></div></li>
        </ul>
        <div class="campo mt"><label>Probá tu pistola acá</label><input class="entrada num" id="prueba-lector" placeholder="Hacé clic y leé cualquier código" /><p class="ayuda" id="res-prueba">La pistola tiene que estar configurada para mandar “Enter” al final (viene así de fábrica).</p></div>
      </div></div>

      <div class="tarjeta"><div class="tarjeta-cab"><h3>Ticketera</h3></div><div class="tarjeta-cuerpo">
        <p style="margin:0 0 12px;color:var(--texto-2);font-size:14px">El ticket se imprime en cualquier ticketera térmica de 58 u 80 mm conectada a la PC. Es un comprobante interno, no una factura.</p>
        <div class="aviso-demo">${icono("imprimir")}<span>Para que imprima sin preguntar, el panel se abre desde un acceso directo especial de Chrome que dejamos instalado en la PC del local.</span></div>
      </div></div>

      <div class="tarjeta"><div class="tarjeta-cab"><h3>Usar desde el celular</h3></div><div class="tarjeta-cuerpo">
        <p style="margin:0 0 12px;color:var(--texto-2);font-size:14px">Abrí este mismo link en el celular y agregalo a la pantalla de inicio: queda como una app, con el logo de La Morocha.</p>
        <ul class="lista">
          <li><span class="icono-caja verde">${icono("ok", "chico")}</span><div class="texto"><b>Android (Chrome)</b><span>Menú ⋮ → “Agregar a la pantalla principal”.</span></div></li>
          <li><span class="icono-caja verde">${icono("ok", "chico")}</span><div class="texto"><b>iPhone (Safari)</b><span>Botón compartir → “Agregar a inicio”.</span></div></li>
        </ul>
      </div></div>

      <div class="tarjeta"><div class="tarjeta-cab"><h3>Datos de la demostración</h3></div><div class="tarjeta-cuerpo">
        <p style="margin:0 0 14px;color:var(--texto-2);font-size:14px">Este boceto funciona sin base de datos: lo que cargás queda guardado solo en este navegador. Los productos, ventas y números son de ejemplo.</p>
        <button class="boton sec" id="reiniciar">${icono("reiniciar")} Volver a los datos de ejemplo</button>
      </div></div>
    </div>`;

  el.querySelector("#f-negocio").addEventListener("submit", (e) => {
    e.preventDefault();
    Object.assign(db.negocio, leerForm(e.target));
    guardar();
    aviso("Datos guardados");
  });
  const prueba = el.querySelector("#prueba-lector");
  prueba.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    const p = db.productos.find((x) => x.codigo === prueba.value.trim());
    el.querySelector("#res-prueba").innerHTML = p ? `<b style="color:var(--verde)">Leído: ${escapar(p.nombre)}</b>` : `<b>Leído el código ${escapar(prueba.value)}</b>: la pistola funciona (ese producto no está cargado).`;
    prueba.value = "";
  });
  el.querySelector("#reiniciar").addEventListener("click", async () => {
    if (!(await confirmar("Volver a los datos de ejemplo", "Se borran los cambios que hiciste en esta demo y vuelven los datos originales.", { boton: "Reiniciar demo" }))) return;
    reiniciarDemo();
    aviso("Demo reiniciada");
    ctx.repintar();
  });
}
