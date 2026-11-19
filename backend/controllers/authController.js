const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");

// POST /api/auth/login  (sirve para el administrador y para el cajero)
async function iniciarSesion(req, res, next) {
  try {
    const { usuario, contrasena } = req.body || {};

    // Si llega algo que no es texto (por ejemplo un objeto), no se consulta la base de datos
    if (typeof usuario !== "string" || typeof contrasena !== "string") {
      return res.status(401).json({ mensaje: "Usuario o contraseña incorrectos" });
    }

    const admin = await Admin.findOne({ usuario });
    // Usamos el mismo mensaje si falla el usuario o la contraseña
    const contrasenaCorrecta = admin && (await bcrypt.compare(contrasena, admin.contrasena));

    if (!contrasenaCorrecta) {
      return res.status(401).json({ mensaje: "Usuario o contraseña incorrectos" });
    }

    // El token lleva el rol, que luego revisa el middleware verificarRol en el backend
    const token = jwt.sign({ id: admin._id, usuario: admin.usuario, rol: admin.rol }, process.env.JWT_SECRET, { expiresIn: "8h" });
    res.json({ token, usuario: admin.usuario, rol: admin.rol });
  } catch (error) {
    next(error);
  }
}

module.exports = { iniciarSesion };
