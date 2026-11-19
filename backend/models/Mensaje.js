const mongoose = require("mongoose");

// Mensajes del formulario de contacto
const mensajeSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: [true, "El nombre es obligatorio"], trim: true },
    correo: {
      type: String,
      required: [true, "El correo es obligatorio"],
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "El correo no tiene un formato válido"],
    },
    mensaje: { type: String, required: [true, "El mensaje es obligatorio"], trim: true, maxlength: [1000, "El mensaje es demasiado largo"] },
    estado: { type: String, enum: ["Nuevo", "Leído"], default: "Nuevo" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Mensaje", mensajeSchema);
