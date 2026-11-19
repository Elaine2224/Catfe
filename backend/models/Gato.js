const mongoose = require("mongoose");

const gatoSchema = new mongoose.Schema({
  nombre: { type: String, required: [true, "El nombre del gato es obligatorio"], trim: true },
  edad: { type: String, trim: true }, // Ejemplo: "2 años"
  descripcion: { type: String, trim: true },
  imagen: { type: String },
  estado: { type: String, enum: ["Disponible", "Reservado", "Adoptado"], default: "Disponible" },
});

module.exports = mongoose.model("Gato", gatoSchema);
