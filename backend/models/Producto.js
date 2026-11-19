const mongoose = require("mongoose");

// Categorías: tres del menú y una para los libros
const categorias = ["bebidas-calientes", "bebidas-frias", "postres", "libro"];

const productoSchema = new mongoose.Schema({
  nombre: { type: String, required: [true, "El nombre del producto es obligatorio"], trim: true },
  descripcion: { type: String, trim: true },
  // Los libros no se venden, así que solo piden precio los productos del menú
  precio: {
    type: Number,
    required: [function () { return this.categoria !== "libro"; }, "El precio es obligatorio"],
    min: [0, "El precio no puede ser negativo"],
  },
  imagen: { type: String },
  categoria: { type: String, enum: { values: categorias, message: "La categoría no es válida" }, required: [true, "La categoría es obligatoria"] },
  etiqueta: { type: String, trim: true }, // Ejemplo: "Favorito", "Vegano"
  // Existencias: solo se usan en los productos del menú
  stock: {
    type: Number,
    default: 0,
    min: [0, "El stock no puede ser negativo"],
    validate: { validator: Number.isInteger, message: "El stock debe ser un número entero" },
  },
});

module.exports = mongoose.model("Producto", productoSchema);
