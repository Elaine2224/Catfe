const Producto = require("../models/Producto");
const Pedido = require("../models/Pedido");
const { nivelDeStock } = require("../utils/inventario");

// Solo estos campos se aceptan desde el panel (así nadie puede colar otros datos)
const CAMPOS_PERMITIDOS = ["nombre", "descripcion", "categoria", "precio", "imagen", "etiqueta", "stock"];

// Toma del body solo los campos permitidos y los deja listos para guardar.
// Devuelve { datos } o { error } con el mensaje para el administrador.
function prepararDatos(body, esNuevo) {
  const datos = {};
  for (const campo of CAMPOS_PERMITIDOS) {
    if (body && body[campo] !== undefined) datos[campo] = body[campo];
  }

  // Un texto vacío significa "sin valor"
  for (const campo of ["descripcion", "imagen", "etiqueta"]) {
    if (typeof datos[campo] === "string" && datos[campo].trim() === "") datos[campo] = undefined;
  }

  if (datos.imagen && !/^https?:\/\/\S+$/i.test(String(datos.imagen).trim())) {
    return { error: "La imagen debe ser un enlace que empiece con http:// o https://" };
  }

  // Los libros no tienen precio ni stock (se leen en el local)
  if (datos.categoria === "libro") {
    datos.precio = undefined;
    datos.stock = 0;
    return { datos };
  }

  if (datos.precio !== undefined) {
    const precio = Number(datos.precio);
    if (datos.precio === null || datos.precio === "" || !Number.isFinite(precio) || precio < 0) {
      return { error: "El precio debe ser un número de 0 o más" };
    }
    datos.precio = precio;
  } else if (esNuevo) {
    return { error: "El precio es obligatorio" };
  }

  if (datos.stock !== undefined) {
    const stock = Number(datos.stock);
    if (datos.stock === null || datos.stock === "" || !Number.isInteger(stock) || stock < 0) {
      return { error: "El stock debe ser un número entero de 0 o más" };
    }
    datos.stock = stock;
  }

  return { datos };
}

// GET /api/admin/productos  (menú y libros)
async function listarProductos(req, res, next) {
  try {
    res.json(await Producto.find().sort({ categoria: 1, nombre: 1 }));
  } catch (error) {
    next(error);
  }
}

// POST /api/admin/productos
async function crearProducto(req, res, next) {
  try {
    const { datos, error } = prepararDatos(req.body, true);
    if (error) return res.status(400).json({ mensaje: error });

    const producto = await Producto.create(datos);
    res.status(201).json(producto);
  } catch (error) {
    next(error);
  }
}

// PUT /api/admin/productos/:id
// Se carga el producto, se cambian los campos y se guarda con save(), para que Mongoose
// valide con los datos completos (por ejemplo: el precio solo es obligatorio si no es un libro).
// Cambiar el precio NO altera los pedidos anteriores: cada pedido guarda su precio del momento.
async function actualizarProducto(req, res, next) {
  try {
    const producto = await Producto.findById(req.params.id);
    if (!producto) return res.status(404).json({ mensaje: "Producto no encontrado" });

    const { datos, error } = prepararDatos(req.body, false);
    if (error) return res.status(400).json({ mensaje: error });

    producto.set(datos);
    await producto.save();
    res.json(producto);
  } catch (error) {
    next(error);
  }
}

// DELETE /api/admin/productos/:id
// No se puede eliminar si está en un pedido sin terminar (pendiente de verificación o listo para retirar).
// Los pedidos ya terminados no se afectan: guardan el nombre y el precio del producto.
async function eliminarProducto(req, res, next) {
  try {
    const producto = await Producto.findById(req.params.id);
    if (!producto) return res.status(404).json({ mensaje: "Producto no encontrado" });

    const enPedidosSinTerminar = await Pedido.exists({
      "items.producto": producto._id,
      estadoRetiro: { $in: ["Esperando pago", "Listo para retiro"] },
    });
    if (enPedidosSinTerminar) {
      return res.status(400).json({
        mensaje: "No se puede eliminar: el producto está en pedidos sin terminar (pendientes de verificación o listos para retirar)",
      });
    }

    await producto.deleteOne();
    res.json({ mensaje: "Producto eliminado" });
  } catch (error) {
    next(error);
  }
}

// GET /api/admin/inventario  (solo productos del menú, con su nivel de existencias)
async function obtenerInventario(req, res, next) {
  try {
    const productos = await Producto.find({ categoria: { $ne: "libro" } }).sort({ categoria: 1, nombre: 1 });
    res.json(
      productos.map((p) => ({
        _id: p._id,
        nombre: p.nombre,
        categoria: p.categoria,
        stock: p.stock,
        nivel: nivelDeStock(p.stock), // "agotado", "pocas" o "disponible"
      }))
    );
  } catch (error) {
    next(error);
  }
}

// PUT /api/admin/productos/:id/stock   { "stock": 12 }
// Fija la cantidad que hay físicamente (por ejemplo, cuando llega mercadería).
async function actualizarStock(req, res, next) {
  try {
    const crudo = req.body ? req.body.stock : undefined;
    const stock = Number(crudo);
    if (crudo === undefined || crudo === null || crudo === "" || !Number.isInteger(stock) || stock < 0) {
      return res.status(400).json({ mensaje: "El stock debe ser un número entero de 0 o más" });
    }

    const producto = await Producto.findOneAndUpdate(
      { _id: req.params.id, categoria: { $ne: "libro" } },
      { stock },
      { returnDocument: "after", runValidators: true }
    );
    if (!producto) {
      const existe = await Producto.exists({ _id: req.params.id });
      if (!existe) return res.status(404).json({ mensaje: "Producto no encontrado" });
      return res.status(400).json({ mensaje: "Los libros no tienen inventario" });
    }
    res.json({ _id: producto._id, nombre: producto.nombre, stock: producto.stock, nivel: nivelDeStock(producto.stock) });
  } catch (error) {
    next(error);
  }
}

module.exports = { listarProductos, crearProducto, actualizarProducto, eliminarProducto, obtenerInventario, actualizarStock };
