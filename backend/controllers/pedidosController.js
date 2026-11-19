const mongoose = require("mongoose");
const Pedido = require("../models/Pedido");
const Producto = require("../models/Producto");
const { generarCodigo, generarToken } = require("../utils/codigos");

// Redondea a 2 decimales para evitar errores como 0.1 + 0.2
const redondear = (numero) => Math.round(numero * 100) / 100;

// Datos que ve el cliente en la página de seguimiento.
// No incluye correo ni referencia de transferencia.
function resumenPublico(pedido) {
  return {
    codigo: pedido.codigo,
    fecha: pedido.createdAt,
    items: pedido.items.map((i) => ({
      nombreProducto: i.nombreProducto,
      cantidad: i.cantidad,
      precioUnitario: i.precioUnitario,
      subtotal: i.subtotal,
    })),
    total: pedido.total,
    estadoPago: pedido.estadoPago,
    estadoRetiro: pedido.estadoRetiro,
    // El QR solo se muestra cuando el cajero ya confirmó el pago y falta retirar
    puedeRetirar: pedido.estadoPago === "Pagado" && pedido.estadoRetiro === "Listo para retiro",
  };
}

// POST /api/pedidos
// Recibe: nombreCliente, correo, referenciaTransferencia e items: [{ producto, cantidad }]
// El backend busca los precios en MongoDB; nunca usa los que mande el frontend.
async function crearPedido(req, res, next) {
  try {
    const { nombreCliente, correo, referenciaTransferencia, items } = req.body;

    // 1. Revisar el carrito y sumar los productos repetidos
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ mensaje: "El carrito está vacío" });
    }

    const cantidades = {}; // { idProducto: cantidad }
    for (const item of items) {
      if (!mongoose.isValidObjectId(item.producto)) {
        return res.status(400).json({ mensaje: "Hay un producto que no es válido" });
      }
      const cantidad = Number(item.cantidad);
      if (!Number.isInteger(cantidad) || cantidad < 1) {
        return res.status(400).json({ mensaje: "La cantidad de cada producto debe ser un número entero mayor que 0" });
      }
      const id = String(item.producto);
      cantidades[id] = (cantidades[id] || 0) + cantidad;
    }

    // 2. Buscar los productos y revisar que se puedan comprar
    const productos = await Producto.find({ _id: { $in: Object.keys(cantidades) } });
    const itemsPedido = [];

    for (const id of Object.keys(cantidades)) {
      const producto = productos.find((p) => String(p._id) === id);
      const cantidad = cantidades[id];

      if (!producto || producto.categoria === "libro") {
        return res.status(400).json({ mensaje: "Hay un producto que ya no está disponible" });
      }
      if (cantidad > 20) {
        return res.status(400).json({ mensaje: `Solo puedes pedir hasta 20 unidades de "${producto.nombre}"` });
      }
      if (producto.stock < 1) {
        return res.status(400).json({ mensaje: `"${producto.nombre}" está agotado` });
      }
      // Aviso suave: el stock real se descuenta cuando el cajero confirma el pago
      if (cantidad > producto.stock) {
        return res.status(400).json({ mensaje: `Solo quedan ${producto.stock} unidades de "${producto.nombre}"` });
      }

      itemsPedido.push({
        producto: producto._id,
        nombreProducto: producto.nombre,
        precioUnitario: producto.precio,
        cantidad,
        subtotal: redondear(producto.precio * cantidad),
      });
    }

    const total = redondear(itemsPedido.reduce((suma, item) => suma + item.subtotal, 0));

    // 3. La misma referencia no puede pagar dos pedidos.
    //    Esta consulta da un mensaje rápido; la garantía real es el índice único de referenciaActiva.
    const referencia = String(referenciaTransferencia || "").trim().toUpperCase();
    if (referencia) {
      const repetida = await Pedido.findOne({ referenciaActiva: referencia });
      if (repetida) {
        return res.status(400).json({ mensaje: "Esa referencia de transferencia ya fue usada en otro pedido" });
      }
    }

    // 4. Guardar el pedido. Si el código aleatorio ya existía (muy raro), se genera otro.
    let pedido = null;
    for (let intento = 0; intento < 5 && !pedido; intento++) {
      try {
        pedido = await Pedido.create({
          codigo: generarCodigo(),
          tokenSeguimiento: generarToken(),
          nombreCliente,
          correo,
          referenciaTransferencia: referencia,
          referenciaActiva: referencia || undefined,
          items: itemsPedido,
          total,
        });
      } catch (error) {
        if (error.code !== 11000) throw error;
        // Dos pedidos al mismo tiempo con la misma referencia: la base de datos rechaza al segundo
        if (error.keyPattern && error.keyPattern.referenciaActiva) {
          return res.status(400).json({ mensaje: "Esa referencia de transferencia ya fue usada en otro pedido" });
        }
        // Si no fue la referencia, el código o el token estaba repetido (muy raro): se intenta de nuevo
      }
    }
    if (!pedido) {
      return res.status(500).json({ mensaje: "No se pudo generar el código del pedido, intenta de nuevo" });
    }

    res.status(201).json({
      mensaje: "¡Tu pedido fue registrado! Estamos verificando tu transferencia.",
      codigo: pedido.codigo,
      tokenSeguimiento: pedido.tokenSeguimiento,
      total: pedido.total,
    });
  } catch (error) {
    next(error);
  }
}

// GET /api/pedidos/seguimiento/:token  (enlace privado del cliente)
async function obtenerPedidoPorToken(req, res, next) {
  try {
    const pedido = await Pedido.findOne({ tokenSeguimiento: req.params.token });
    if (!pedido) {
      return res.status(404).json({ mensaje: "No encontramos ese pedido" });
    }
    res.json(resumenPublico(pedido));
  } catch (error) {
    next(error);
  }
}

// POST /api/pedidos/consultar  (alternativa: código + correo)
async function consultarPedido(req, res, next) {
  try {
    const codigo = String(req.body.codigo || "").trim().toUpperCase();
    const correo = String(req.body.correo || "").trim().toLowerCase();

    const pedido = await Pedido.findOne({ codigo, correo });
    if (!pedido) {
      return res.status(404).json({ mensaje: "No encontramos un pedido con ese código y correo" });
    }
    res.json(resumenPublico(pedido));
  } catch (error) {
    next(error);
  }
}

module.exports = { crearPedido, obtenerPedidoPorToken, consultarPedido };
