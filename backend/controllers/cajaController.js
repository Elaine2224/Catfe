const mongoose = require("mongoose");
const Pedido = require("../models/Pedido");
const Producto = require("../models/Producto");

// ¿Por qué transacciones?
// Confirmar un pago hace dos cosas: marcar el pedido como pagado Y descontar el stock.
// Una transacción las junta en una sola unidad: o se guardan las dos, o no se guarda ninguna.
// Si el servidor se cae a la mitad, o falta stock en el último producto, MongoDB deshace todo.
// Funcionan en MongoDB Atlas (y en cualquier conjunto de réplicas).

// Error "esperado" (no es un fallo del servidor): lleva el mensaje y el código HTTP para el cajero
class ErrorDeNegocio extends Error {
  constructor(mensaje, estado = 400) {
    super(mensaje);
    this.estado = estado;
  }
}

function responderError(error, res, next) {
  if (error instanceof ErrorDeNegocio) {
    return res.status(error.estado).json({ mensaje: error.message });
  }
  next(error);
}

// Cuando una actualización no encuentra el pedido, decimos si no existe o si ya estaba procesado
async function lanzarPedidoNoDisponible(id, mensajeProcesado, session) {
  const consulta = Pedido.exists({ _id: id });
  const existe = await (session ? consulta.session(session) : consulta);
  if (!existe) throw new ErrorDeNegocio("Pedido no encontrado", 404);
  throw new ErrorDeNegocio(mensajeProcesado, 400);
}

// El cajero no necesita (ni debe ver) el token privado de seguimiento del cliente
function sinToken(pedido) {
  const datos = pedido.toObject();
  delete datos.tokenSeguimiento;
  return datos;
}

// GET /api/caja/pedidos  -> todos los pedidos, los más recientes primero
async function listarPedidos(req, res, next) {
  try {
    res.json(await Pedido.find().select("-tokenSeguimiento").sort({ createdAt: -1 }));
  } catch (error) {
    next(error);
  }
}

// PUT /api/caja/pedidos/:id/confirmar-pago
// El cajero ya comprobó en el banco que el dinero llegó. Aquí se descuenta el stock.
async function confirmarPago(req, res, next) {
  try {
    const pedido = await mongoose.connection.transaction(async (session) => {
      // 1. Marcar el pedido como pagado, solo si sigue pendiente.
      //    Si dos cajeros confirman a la vez, solo uno encuentra el pedido pendiente.
      const actualizado = await Pedido.findOneAndUpdate(
        { _id: req.params.id, estadoPago: "Pendiente de verificación" },
        { estadoPago: "Pagado", estadoRetiro: "Listo para retiro", stockDescontado: true, fechaPago: new Date() },
        { returnDocument: "after", session }
      );
      if (!actualizado) {
        await lanzarPedidoNoDisponible(req.params.id, "Este pedido ya fue procesado", session);
      }

      // 2. Descontar el stock producto por producto.
      //    "stock: { $gte: cantidad }" hace que solo se descuente si alcanza (nunca queda negativo).
      for (const item of actualizado.items) {
        const resultado = await Producto.updateOne(
          { _id: item.producto, stock: { $gte: item.cantidad } },
          { $inc: { stock: -item.cantidad } },
          { session }
        );

        if (resultado.modifiedCount === 0) {
          const producto = await Producto.findById(item.producto).session(session);
          const quedan = producto ? producto.stock : 0;
          // Al lanzar este error, la transacción se deshace completa (también el paso 1)
          throw new ErrorDeNegocio(
            `No hay stock suficiente de "${item.nombreProducto}" (quedan ${quedan}). No se puede confirmar; si ya recibiste el dinero, rechaza el pago y devuélvelo al cliente.`
          );
        }
      }

      return actualizado;
    });

    res.json(sinToken(pedido));
  } catch (error) {
    responderError(error, res, next);
  }
}

// PUT /api/caja/pedidos/:id/rechazar-pago  (no llegó el dinero, o no se puede cumplir el pedido)
// Es una sola actualización, así que ya es atómica sin necesidad de transacción.
async function rechazarPago(req, res, next) {
  try {
    const actualizado = await Pedido.findOneAndUpdate(
      { _id: req.params.id, estadoPago: "Pendiente de verificación" },
      { estadoPago: "Rechazado", estadoRetiro: "Cancelado", $unset: { referenciaActiva: "" } }, // libera la referencia
      { returnDocument: "after" }
    );
    if (!actualizado) {
      await lanzarPedidoNoDisponible(req.params.id, "Solo se puede rechazar un pago que está pendiente de verificación");
    }
    res.json(sinToken(actualizado));
  } catch (error) {
    responderError(error, res, next);
  }
}

// PUT /api/caja/pedidos/:id/entregar
async function entregarPedido(req, res, next) {
  try {
    // Solo se entrega si está pagado y listo. Un pedido ya entregado no cumple la condición.
    const actualizado = await Pedido.findOneAndUpdate(
      { _id: req.params.id, estadoPago: "Pagado", estadoRetiro: "Listo para retiro" },
      { estadoRetiro: "Entregado", fechaEntrega: new Date() },
      { returnDocument: "after" }
    );
    if (!actualizado) {
      await lanzarPedidoNoDisponible(req.params.id, "Este pedido no está listo para retiro (ya fue entregado, cancelado o no está pagado)");
    }
    res.json(sinToken(actualizado));
  } catch (error) {
    responderError(error, res, next);
  }
}

// PUT /api/caja/pedidos/:id/cancelar  (pedido pagado que todavía no se entregó)
async function cancelarPedido(req, res, next) {
  try {
    const pedido = await mongoose.connection.transaction(async (session) => {
      // "before" devuelve el pedido como estaba antes, con sus productos, para poder devolver el stock.
      // La condición stockDescontado: true evita devolver el stock dos veces.
      const pedidoAnterior = await Pedido.findOneAndUpdate(
        { _id: req.params.id, estadoPago: "Pagado", estadoRetiro: "Listo para retiro", stockDescontado: true },
        { estadoRetiro: "Cancelado", stockDescontado: false, $unset: { referenciaActiva: "" } },
        { returnDocument: "before", session }
      );
      if (!pedidoAnterior) {
        await lanzarPedidoNoDisponible(req.params.id, "Solo se puede cancelar un pedido pagado que todavía no fue entregado", session);
      }

      // Cambiar el estado y devolver el stock ocurre en la misma transacción: o todo, o nada
      for (const item of pedidoAnterior.items) {
        await Producto.updateOne({ _id: item.producto }, { $inc: { stock: item.cantidad } }, { session });
      }

      return Pedido.findById(req.params.id).session(session);
    });

    res.json(sinToken(pedido));
  } catch (error) {
    responderError(error, res, next);
  }
}

module.exports = { listarPedidos, confirmarPago, rechazarPago, entregarPedido, cancelarPedido };
