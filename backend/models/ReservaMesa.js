const mongoose = require("mongoose");

const reservaMesaSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: [true, "El nombre es obligatorio"], trim: true },
    correo: {
      type: String,
      required: [true, "El correo es obligatorio"],
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "El correo no tiene un formato válido"],
    },
    fecha: { type: Date, required: [true, "La fecha es obligatoria"] },
    hora: { type: String, required: [true, "La hora es obligatoria"] },
    personas: { type: Number, required: [true, "El número de personas es obligatorio"], min: [1, "Mínimo 1 persona"], max: [20, "Máximo 20 personas"] },
    mensaje: { type: String, trim: true },
    estado: { type: String, enum: ["Pendiente", "Confirmada", "Cancelada"], default: "Pendiente" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ReservaMesa", reservaMesaSchema);
