const mongoose = require("mongoose");

// Los "trabajos" de Catfé: fotos y descripciones de lo que hacemos
const galeriaSchema = new mongoose.Schema({
  titulo: { type: String, required: [true, "El título es obligatorio"], trim: true },
  descripcion: { type: String, trim: true },
  imagen: { type: String },
});

module.exports = mongoose.model("Galeria", galeriaSchema);
