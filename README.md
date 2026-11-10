# La Morocha · Panel del negocio (boceto)

Boceto navegable del sistema de gestión para **Drugstore La Morocha** (Av. Bolivia 27).
Hecho por **Lambda Soluciones Digitales** para presentar la idea al dueño.

**Ver la demo:** https://squicciarinilautaro.github.io/la-morocha-panel/

> Es una demostración: no usa base de datos. Lo que se carga queda guardado solo en el
> navegador de quien la prueba, y los productos, ventas y números son de ejemplo.
> En Ajustes hay un botón para volver a los datos originales.

## Usuarios de prueba

| Rol | Usuario | Contraseña | Qué ve |
| --- | --- | --- | --- |
| Dueño | `admin` | `morocha` | Todo el sistema |
| Empleada | `sofia` | `1234` | Caja, sus ventas del día, precios y su turno |
| Empleado | `martin` | `1234` | Igual que Sofía |

## Qué incluye

| Sección | Qué hace |
| --- | --- |
| Caja | Lector de código de barras (pistola o cámara del celular), búsqueda por nombre, promos automáticas, cobro en efectivo con vuelto, QR / posnet, transferencia y cuenta corriente, ticket para imprimir. Atajos F2, F4, F8. |
| Turnos de caja | Apertura con cambio inicial y cierre con arqueo (ciego para el empleado). Historial de faltantes y sobrantes. |
| Ventas | Registro completo con filtros. El dueño puede editar o anular cualquier venta y queda el registro de quién y qué cambió. Exporta a Excel. |
| Productos y stock | Alta, edición y baja. Costo, precio y margen. Alertas de stock mínimo y vencimientos. Aumento masivo de precios por categoría o proveedor. Mermas y pérdidas. Historial de precios. |
| Compras y proveedores | Cargar facturas (suman stock y actualizan costos) y lo que se le debe a cada proveedor. |
| Promociones | Combos, packs por cantidad y descuento por medio de pago. Se aplican solas en la caja. |
| Métricas y finanzas | Ventas, ganancia bruta, resultado neto, estado de resultados, punto de equilibrio, medios de pago, categorías, horarios, días, top productos, mercadería quieta y rendimiento por empleado. Exporta a Excel para el contador. |
| Gastos | Fijos y variables, con gráfico de en qué se va la plata. |
| Cuentas corrientes | Clientes con fiado, límite, movimientos y pagos. |
| Usuarios y permisos | Dueño y empleados con usuario y contraseña. Tabla de qué ve cada uno. |

## Carpetas

| Carpeta | Qué hay |
| --- | --- |
| `index.html` | La página. |
| `css/estilos.css` | Todo el diseño (PC y celular). |
| `js/datos.js` | Datos de ejemplo (productos reales del local, ventas de los últimos meses). |
| `js/estado.js` | Guardado en el navegador, cálculos de promos, caja y métricas. |
| `js/vistas/` | Una pantalla por archivo. |

## Verlo en la PC

```bash
python -m http.server 5260
```

y abrir `http://localhost:5260`. Cualquier servidor de archivos estáticos sirve.
