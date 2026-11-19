const SolicitudAdopcion = require("../models/SolicitudAdopcion");
const Gato = require("../models/Gato");

// POST /api/adopciones
// Guarda la solicitud y cambia el gato de "Disponible" a "Reservado"
async function crearSolicitudAdopcion(req, res, next) {
  try {
    const { gato, nombre, correo, telefono, mensaje } = req.body;

    // 1. Revisamos que los datos estén bien ANTES de tocar al gato
    const solicitud = new SolicitudAdopcion({ gato, nombre, correo, telefono, mensaje });
    await solicitud.validate();

    // 2. Cambiamos el gato a "Reservado" solo si todavía está "Disponible"
    const gatoReservado = await Gato.findOneAndUpdate(
      { _id: gato, estado: "Disponible" },
      { estado: "Reservado" },
      { returnDocument: "after" }
    );

    if (!gatoReservado) {
      return res.status(400).json({ mensaje: "Este gato ya no está disponible para adopción" });
    }

    // 3. Guardamos la solicitud
    solicitud.nombreGato = gatoReservado.nombre;
    await solicitud.save();

    res.status(201).json({ mensaje: "¡Tu solicitud de adopción fue enviada!", solicitud });
  } catch (error) {
    next(error);
  }
}

module.exports = { crearSolicitudAdopcion };
