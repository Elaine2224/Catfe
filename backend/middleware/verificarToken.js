const jwt = require("jsonwebtoken");

// Se pone antes de las rutas del administrador.
// Si no hay un token válido, responde 401 y la ruta no se ejecuta.
function verificarToken(req, res, next) {
  const encabezado = req.headers.authorization; // Llega como: "Bearer eltoken..."

  if (!encabezado || !encabezado.startsWith("Bearer ")) {
    return res.status(401).json({ mensaje: "Necesitas iniciar sesión como administradora" });
  }

  const token = encabezado.split(" ")[1];

  try {
    const datos = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = datos;
    next(); // Todo bien: continúa con la ruta
  } catch (error) {
    return res.status(401).json({ mensaje: "La sesión no es válida o ya venció" });
  }
}

module.exports = verificarToken;
