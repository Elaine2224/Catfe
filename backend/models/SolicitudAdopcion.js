const mongoose = require("mongoose");

const solicitudAdopcionSchema = new mongoose.Schema(
  {
    gato: { type: mongoose.Schema.Types.ObjectId, ref: "Gato", required: [true, "Debes elegir un gato"] },
    nombreGato: { type: String },
    nombre: { type: String, required: [true, "El nombre es obligatorio"], trim: true },
    correo: {
      type: String,
      required: [true, "El correo es obligatorio"],
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "El correo no tiene un formato válido"],
    },
    telefono: { type: String, required: [true, "El teléfono es obligatorio"], trim: true },
    mensaje: { type: String, trim: true },
    estado: { type: String, enum: ["Pendiente", "Aprobada", "Rechazada"], default: "Pendiente" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SolicitudAdopcion", solicitudAdopcionSchema);
