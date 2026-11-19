const Producto = require("../models/Producto");

// GET /api/productos          -> todos
// GET /api/productos?categoria=libro  -> solo libros (o "menu")
async function obtenerProductos(req, res, next) {
  try {
    const filtro = {};
    if (req.query.categoria) {
      filtro.categoria = req.query.categoria;
    }
    const productos = await Producto.find(filtro);
    res.json(productos);
  } catch (error) {
    next(error);
  }
}

module.exports = { obtenerProductos };
