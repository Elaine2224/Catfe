const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");
const ReservaMesa = require("../models/ReservaMesa");
const SolicitudAdopcion = require("../models/SolicitudAdopcion");
const Mensaje = require("../models/Mensaje");
const Gato = require("../models/Gato");

// POST /api/admin/login  (sirve para el administrador y para el cajero)
async function iniciarSesion(req, res, next) {
  try {
    const { usuario, contrasena } = req.body;

    const admin = await Admin.findOne({ usuario });
    // Usamos el mismo mensaje si falla el usuario o la contraseña
    const contrasenaCorrecta = admin && (await bcrypt.compare(contrasena || "", admin.contrasena));

    if (!contrasenaCorrecta) {
      return res.status(401).json({ mensaje: "Usuario o contraseña incorrectos" });
    }

    // El token lleva el rol, que luego revisa el middleware verificarRol
    const token = jwt.sign({ id: admin._id, usuario: admin.usuario, rol: admin.rol }, process.env.JWT_SECRET, { expiresIn: "8h" });
    res.json({ token, usuario: admin.usuario, rol: admin.rol });
  } catch (error) {
    next(error);
  }
}

// ----- Listados (los más recientes primero) -----
async function obtenerReservas(req, res, next) {
  try {
    res.json(await ReservaMesa.find().sort({ createdAt: -1 }));
  } catch (error) {
    next(error);
  }
}

async function obtenerSolicitudes(req, res, next) {
  try {
    res.json(await SolicitudAdopcion.find().sort({ createdAt: -1 }));
  } catch (error) {
    next(error);
  }
}

async function obtenerMensajes(req, res, next) {
  try {
    res.json(await Mensaje.find().sort({ createdAt: -1 }));
  } catch (error) {
    next(error);
  }
}

// ----- Cambios de estado (PUT, reciben { "estado": "..." }) -----
// runValidators hace que Mongoose verifique que el estado sea uno de los permitidos
async function cambiarEstadoReserva(req, res, next) {
  try {
    const reserva = await ReservaMesa.findByIdAndUpdate(req.params.id, { estado: req.body.estado }, { returnDocument: "after", runValidators: true });
    if (!reserva) return res.status(404).json({ mensaje: "Reserva no encontrada" });
    res.json(reserva);
  } catch (error) {
    next(error);
  }
}

// Reglas para el gato cuando cambia el estado de una solicitud de adopción:
//  - Aprobada  -> el gato pasa a "Adoptado".
//  - Rechazada -> si el gato estaba "Reservado" y no quedan otras solicitudes pendientes o
//                 aprobadas, vuelve a "Disponible". Si hay otra pendiente, sigue "Reservado".
//  - Un gato "Adoptado" nunca vuelve solo a "Disponible".
async function cambiarEstadoSolicitud(req, res, next) {
  try {
    const solicitud = await SolicitudAdopcion.findByIdAndUpdate(req.params.id, { estado: req.body.estado }, { returnDocument: "after", runValidators: true });
    if (!solicitud) return res.status(404).json({ mensaje: "Solicitud no encontrada" });

    const gato = await Gato.findById(solicitud.gato);

    if (gato && solicitud.estado === "Aprobada") {
      gato.estado = "Adoptado";
      await gato.save();
    }

    if (gato && solicitud.estado === "Rechazada" && gato.estado === "Reservado") {
      const otrasActivas = await SolicitudAdopcion.countDocuments({
        gato: gato._id,
        _id: { $ne: solicitud._id },
        estado: { $in: ["Pendiente", "Aprobada"] },
      });
      if (otrasActivas === 0) {
        gato.estado = "Disponible";
        await gato.save();
      }
    }

    res.json(solicitud);
  } catch (error) {
    next(error);
  }
}

async function cambiarEstadoMensaje(req, res, next) {
  try {
    const mensaje = await Mensaje.findByIdAndUpdate(req.params.id, { estado: req.body.estado }, { returnDocument: "after", runValidators: true });
    if (!mensaje) return res.status(404).json({ mensaje: "Mensaje no encontrado" });
    res.json(mensaje);
  } catch (error) {
    next(error);
  }
}

async function cambiarEstadoGato(req, res, next) {
  try {
    const gato = await Gato.findByIdAndUpdate(req.params.id, { estado: req.body.estado }, { returnDocument: "after", runValidators: true });
    if (!gato) return res.status(404).json({ mensaje: "Gato no encontrado" });
    res.json(gato);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  iniciarSesion,
  obtenerReservas,
  obtenerSolicitudes,
  obtenerMensajes,
  cambiarEstadoReserva,
  cambiarEstadoSolicitud,
  cambiarEstadoMensaje,
  cambiarEstadoGato,
};
