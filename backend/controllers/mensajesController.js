const Mensaje = require("../models/Mensaje");

// POST /api/mensajes
async function crearMensaje(req, res, next) {
  try {
    const { nombre, correo, mensaje } = req.body;
    const nuevoMensaje = new Mensaje({ nombre, correo, mensaje });
    await nuevoMensaje.save();
    res.status(201).json({ mensaje: "¡Gracias! Tu mensaje fue enviado" });
  } catch (error) {
    next(error);
  }
}

module.exports = { crearMensaje };
