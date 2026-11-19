const ReservaMesa = require("../models/ReservaMesa");

// POST /api/reservas
async function crearReserva(req, res, next) {
  try {
    const { nombre, correo, fecha, hora, personas, mensaje } = req.body;

    // No se puede reservar en una fecha que ya pasó
    if (fecha) {
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      if (new Date(fecha + "T00:00:00") < hoy) {
        return res.status(400).json({ mensaje: "La fecha de la reserva no puede ser anterior a hoy" });
      }
    }

    const reserva = new ReservaMesa({ nombre, correo, fecha, hora, personas, mensaje });
    await reserva.save();
    res.status(201).json({ mensaje: "¡Tu reserva fue registrada!", reserva });
  } catch (error) {
    next(error);
  }
}

module.exports = { crearReserva };
