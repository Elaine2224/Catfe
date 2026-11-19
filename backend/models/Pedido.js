const mongoose = require("mongoose");

// Cada línea del pedido guarda el precio del momento de la compra,
// así los pedidos antiguos no cambian si luego se modifica el menú.
const itemSchema = new mongoose.Schema(
  {
    producto: { type: mongoose.Schema.Types.ObjectId, ref: "Producto", required: true },
    nombreProducto: { type: String, required: true },
    precioUnitario: { type: Number, required: true, min: 0 },
    cantidad: { type: Number, required: true, min: [1, "La cantidad mínima es 1"], max: [20, "La cantidad máxima por producto es 20"] },
    subtotal: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const pedidoSchema = new mongoose.Schema(
  {
    codigo: { type: String, required: true, unique: true },           // Ejemplo: CAT-7K3F9 (es el que va en el QR)
    tokenSeguimiento: { type: String, required: true, unique: true }, // Secreto: para el enlace privado del cliente
    nombreCliente: { type: String, required: [true, "El nombre es obligatorio"], trim: true, maxlength: [80, "El nombre es demasiado largo"] },
    correo: {
      type: String,
      required: [true, "El correo es obligatorio"],
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "El correo no tiene un formato válido"],
    },
    referenciaTransferencia: {
      type: String,
      required: [true, "La referencia de la transferencia es obligatoria"],
      trim: true,
      uppercase: true,
      match: [/^[A-Z0-9-]{4,40}$/, "La referencia debe tener entre 4 y 40 letras o números"],
    },
    // Copia de la referencia mientras el pedido siga activo. Tiene un índice ÚNICO:
    // la propia base de datos impide que dos pedidos usen la misma referencia,
    // aunque lleguen exactamente al mismo tiempo.
    // Se borra ($unset) cuando el pedido se rechaza o se cancela, y así la referencia queda libre.
    referenciaActiva: { type: String, unique: true, sparse: true },
    items: {
      type: [itemSchema],
      validate: { validator: (lista) => lista.length > 0, message: "El pedido debe tener al menos un producto" },
    },
    total: { type: Number, required: true, min: 0 },

    // Dos estados separados: uno para el dinero y otro para la entrega
    estadoPago: { type: String, enum: ["Pendiente de verificación", "Pagado", "Rechazado"], default: "Pendiente de verificación" },
    estadoRetiro: { type: String, enum: ["Esperando pago", "Listo para retiro", "Entregado", "Cancelado"], default: "Esperando pago" },

    stockDescontado: { type: Boolean, default: false }, // Evita descontar o devolver el stock dos veces
    fechaPago: { type: Date },
    fechaEntrega: { type: Date },
  },
  { timestamps: true } // createdAt = fecha del pedido
);

module.exports = mongoose.model("Pedido", pedidoSchema);
