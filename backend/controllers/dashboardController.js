const Pedido = require("../models/Pedido");
const Producto = require("../models/Producto");
const { LIMITE_POCAS_EXISTENCIAS, nivelDeStock } = require("../utils/inventario");

const redondear = (numero) => Math.round(numero * 100) / 100;

// GET /api/admin/dashboard
// Resumen general de ventas. NO devuelve pedidos individuales ni datos de clientes.
//
// Una venta es un pedido con el pago confirmado ("Pagado") que no fue cancelado.
// Se recorre cada pedido UNA sola vez, así que ninguna compra se cuenta dos veces.
// Los pedidos pendientes, rechazados y cancelados no suman.
async function obtenerDashboard(req, res, next) {
  try {
    const pedidosPagados = await Pedido.find(
      { estadoPago: "Pagado", estadoRetiro: { $ne: "Cancelado" } },
      { total: 1, items: 1 }
    );

    let totalVendido = 0;
    const porProducto = {}; // { idProducto: { nombre, unidades, total } }

    for (const pedido of pedidosPagados) {
      totalVendido += pedido.total;
      for (const item of pedido.items) {
        const clave = String(item.producto);
        if (!porProducto[clave]) {
          porProducto[clave] = { nombre: item.nombreProducto, unidades: 0, total: 0 };
        }
        porProducto[clave].unidades += item.cantidad;
        porProducto[clave].total += item.subtotal;
      }
    }

    // Gráfico: de mayor a menor dinero vendido
    const ventasPorProducto = Object.values(porProducto)
      .map((p) => ({ nombre: p.nombre, unidades: p.unidades, total: redondear(p.total) }))
      .sort((a, b) => b.total - a.total || a.nombre.localeCompare(b.nombre));

    // Producto más vendido: el que tiene más unidades
    const masVendido = [...ventasPorProducto].sort((a, b) => b.unidades - a.unidades || b.total - a.total)[0] || null;

    const pendientesVerificacion = await Pedido.countDocuments({ estadoPago: "Pendiente de verificación" });

    // Aviso de inventario (solo productos del menú)
    const productosMenu = await Producto.find({ categoria: { $ne: "libro" } }, { stock: 1 });
    const agotados = productosMenu.filter((p) => nivelDeStock(p.stock) === "agotado").length;
    const pocasExistencias = productosMenu.filter((p) => nivelDeStock(p.stock) === "pocas").length;

    res.json({
      totalVendido: redondear(totalVendido),
      pedidosPagados: pedidosPagados.length,
      pendientesVerificacion,
      productoMasVendido: masVendido ? { nombre: masVendido.nombre, unidades: masVendido.unidades } : null,
      ventasPorProducto,
      inventario: { agotados, pocasExistencias, limitePocasExistencias: LIMITE_POCAS_EXISTENCIAS },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { obtenerDashboard };
