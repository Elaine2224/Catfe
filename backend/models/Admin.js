const mongoose = require("mongoose");

// Un mismo modelo para el administrador y el cajero: los diferencia el campo "rol"
const adminSchema = new mongoose.Schema({
  usuario: { type: String, required: true, unique: true, trim: true },
  contrasena: { type: String, required: true }, // Se guarda encriptada, nunca en texto normal
  rol: { type: String, enum: ["admin", "cajero"], default: "admin" },
});

module.exports = mongoose.model("Admin", adminSchema);
